"""Bernstein quantile networks."""
import math

import numpy as np
import torch
from torch import nn
import torch.nn.functional as F

J = 5                                   # Bernstein degree: J + 1 = 6 coefficients
TAUS = torch.arange(1, 20, dtype=torch.float64) * 0.05   # 0.05, ..., 0.95
EMB_DIM = 3


_BINOM = [math.comb(J, k) for k in range(J + 1)]


def bernstein_basis(u):
    """u: tensor (...) in [0,1] -> (..., J+1). Powers by repeated multiplication."""
    v = 1 - u
    pu, pv = [torch.ones_like(u)], [torch.ones_like(u)]
    for _ in range(J):
        pu.append(pu[-1] * u)
        pv.append(pv[-1] * v)
    return torch.stack([_BINOM[j] * pu[j] * pv[J - j] for j in range(J + 1)], -1)


class QuantileNet(nn.Module):
    """Shared trunk (2 x 16 SiLU), one head per target, Bernstein coefficients.

    Input: continuous features x (n, p) in raw units (standardized inside) and
    country ids (n,). Output of `coefs`: (n, K, J+1) monotone coefficients in
    standardized target units; `quantile` maps back to raw target units.
    """

    def __init__(self, x_mean, x_sd, y_mean, y_sd, n_countries, n_heads, hidden=16):
        super().__init__()
        t = lambda a: torch.as_tensor(np.asarray(a), dtype=torch.float64)
        self.register_buffer("x_mean", t(x_mean))
        self.register_buffer("x_sd", t(x_sd))
        self.register_buffer("y_mean", t(y_mean))
        self.register_buffer("y_sd", t(y_sd))
        self.emb = nn.Embedding(n_countries, EMB_DIM)
        nn.init.normal_(self.emb.weight, std=0.01)
        p = len(x_mean) + EMB_DIM
        self.trunk = nn.Sequential(nn.Linear(p, hidden), nn.SiLU(),
                                   nn.Linear(hidden, hidden), nn.SiLU())
        self.head = nn.Linear(hidden, n_heads * (J + 1))
        self.n_heads = n_heads
        # start every head near a centred, unit-scale quantile function:
        # coefficients (-2.4, -1.44, ..., 2.4), i.e. beta_0 = -2.4 and increments 0.96
        with torch.no_grad():
            self.head.weight.mul_(0.1)
            b = torch.full((n_heads, J + 1), math.log(math.expm1(0.96)))
            b[:, 0] = -2.4
            self.head.bias.copy_(b.view(-1))
        self.double()

    def coefs(self, x, cid, emb=None):
        e = self.emb(cid) if emb is None else emb
        h = self.trunk(torch.cat([(x - self.x_mean) / self.x_sd, e], dim=-1))
        raw = self.head(h).view(*h.shape[:-1], self.n_heads, J + 1)
        inc = F.softplus(raw[..., 1:]) + 1e-4
        return torch.cat([raw[..., :1], raw[..., :1] + torch.cumsum(inc, -1)], dim=-1)

    def to_raw(self, q_std):
        return self.y_mean + self.y_sd * q_std

    def quantile_std(self, beta, u):
        """beta (n, K, J+1); u broadcastable to (n, [S,] K). Returns standardized quantiles."""
        B = bernstein_basis(u)
        if u.dim() == beta.dim():          # (n, S, K): add sample dimension to beta
            return torch.einsum("nskj,nkj->nsk", B, beta)
        return (B * beta).sum(-1)

    def emb_penalty(self):
        return (self.emb.weight ** 2).mean()


def pinball_loss(beta, y_std, taus=TAUS):
    """Mean pinball loss over levels and heads. beta (n,K,J+1), y_std (n,K)."""
    B = bernstein_basis(taus)                         # (L, J+1)
    q = torch.einsum("nkj,lj->nkl", beta, B)
    diff = y_std.unsqueeze(-1) - q
    return torch.mean(torch.maximum(taus * diff, (taus - 1) * diff))


@torch.no_grad()
def pit(net, x, cid, y_raw, iters=40):
    """Probability integral transform: solve Q_k(u|z) = y_k by bisection."""
    beta = net.coefs(x, cid)
    y_std = (y_raw - net.y_mean) / net.y_sd
    lo = torch.zeros_like(y_std)
    hi = torch.ones_like(y_std)
    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        below = net.quantile_std(beta, mid) < y_std
        lo = torch.where(below, mid, lo)
        hi = torch.where(below, hi, mid)
    return 0.5 * (lo + hi)


def crps_samples(x, y):
    """Sample CRPS: mean|X - y| - 0.5 mean|X - X'|. x (n, S), y (n,). Differentiable.

    Uses the sorted form of the second term: mean|X-X'| = 2/S^2 sum_i (2i - S - 1) x_(i).
    """
    S = x.shape[-1]
    t1 = (x - y.unsqueeze(-1)).abs().mean(-1)
    xs, _ = torch.sort(x, dim=-1)
    w = (2 * torch.arange(1, S + 1, dtype=x.dtype) - S - 1)
    t2 = 2.0 * (xs * w).sum(-1) / S ** 2
    return t1 - 0.5 * t2
