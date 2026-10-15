"""Training of the quantile networks (configurations C1-C4)."""
from dataclasses import dataclass, field

import numpy as np
import torch
from torch.func import jvp

from .data import X_COLS, W_COLS, N_VAL_YEARS
from .nets import QuantileNet, pinball_loss, crps_samples, bernstein_basis

torch.set_default_dtype(torch.float64)


@dataclass
class TrainCfg:
    lr: float = 1e-3
    weight_decay: float = 1e-4
    emb_l2: float = 1.0
    max_epochs: int = 3000
    patience: int = 300
    min_epochs: int = 200          # guard against stopping on the noisy 3-year validation
    eval_every: int = 10
    refit: bool = True             # refit on all training years for the selected epochs
    lam_d: float = 0.0             # debt CRPS weight (C3, C4)
    S_crps: int = 64
    pen: float = 0.0               # derivative-penalty weight (C4): (a), (b), (c) share it
    pen_weights: tuple = (1.0, 1.0, 1.0)
    S_pen: int = 128
    n_grid_pen: int = 5
    max_colloc: int = 256


def tensors(df, cols):
    return torch.as_tensor(df[cols].values, dtype=torch.float64)


@dataclass
class Batch:
    x: torch.Tensor
    cid: torch.Tensor
    y: torch.Tensor           # raw targets (n, K)
    d_next: torch.Tensor      # (n,)
    year: np.ndarray
    country: np.ndarray


def make_batch(df, target_cols):
    return Batch(tensors(df, X_COLS), torch.as_tensor(df["country"].values),
                 tensors(df, target_cols), torch.as_tensor(df["d_next"].values),
                 df["year"].values, df["country"].values)


def subset(b: Batch, mask):
    m = torch.as_tensor(mask)
    return Batch(b.x[m], b.cid[m], b.y[m], b.d_next[m], b.year[mask], b.country[mask])


def debt_from_w(w, d):
    """Identity on the transformed scale; w (..., 4) raw, d broadcast to w[..., 0]."""
    return torch.exp(w[..., 0] - w[..., 1]) * d - w[..., 2] + w[..., 3]


class Objective:
    """Loss for a QuantileNet; which terms are active depends on the configuration."""

    def __init__(self, cfg: TrainCfg, scales, copula=None, colloc=None, seed=0):
        self.cfg, self.scales, self.copula, self.colloc = cfg, scales, copula, colloc
        self.rng = np.random.default_rng((seed, 99))

    def __call__(self, net, b: Batch, penalties=True, rng=None):
        cfg, sc = self.cfg, self.scales
        rng = self.rng if rng is None else rng
        beta = net.coefs(b.x, b.cid)
        y_std = (b.y - net.y_mean) / net.y_sd
        loss = pinball_loss(beta, y_std)
        parts = {"pinball": loss.item()}
        if cfg.lam_d > 0:
            u = torch.as_tensor(self.copula.sample(b.country, cfg.S_crps, rng))
            w = net.to_raw(net.quantile_std(beta, u))          # (n, S, 4)
            dn = debt_from_w(w, b.x[:, :1])
            crps = crps_samples(dn, b.d_next).mean() / sc["sd_dd"]
            loss = loss + cfg.lam_d * crps
            parts["crps"] = crps.item()
        if penalties and cfg.pen > 0:
            pa, pb, pc = derivative_penalties(net, b, self, sc)
            wa, wb, wc = cfg.pen_weights
            loss = loss + cfg.pen * (wa * pa + wb * pb + wc * pc)
            parts.update(pen_a=pa.item(), pen_b=pb.item(), pen_c=pc.item())
        return loss + cfg.emb_l2 * net.emb_penalty(), parts


def _with_d(x, d):
    return torch.cat([d.unsqueeze(1), x[:, 1:]], dim=1)


def coef_d_derivs(net, x, cid, head, second=False, emb=None):
    """Per-row d-derivatives (raw debt units) of a head's Bernstein coefficients,
    by forward-mode differentiation (rows are independent)."""
    d0, ones = x[:, 0], torch.ones_like(x[:, 0])
    f = lambda d: net.coefs(_with_d(x, d), cid, emb=emb)[:, head, :]
    if not second:
        return jvp(f, (d0,), (ones,))[1], None
    g = lambda d: jvp(f, (d,), (ones,))[1]
    (g1, g2) = jvp(g, (d0,), (ones,))
    return g1, g2


def model_drift(net, x, cid, u, emb=None, create_graph=True):
    """Drift and its first two d-derivatives at states x, with common draws u (S, 4).

    Delta(d) = mean_s[ R_s d + B_s ] - d with copula ranks held fixed.
    Returns (Delta, Delta', Delta'') per state, raw units.
    """
    B = bernstein_basis(u)                      # (S, 4, J+1), common across states
    Bbar = B.mean(0)                            # p and a enter linearly: use mean basis

    def delta(d):
        beta = net.coefs(_with_d(x, d), cid, emb=emb)
        qi = torch.einsum("sj,nj->ns", B[:, 0], beta[:, 0])
        qn = torch.einsum("sj,nj->ns", B[:, 1], beta[:, 1])
        m, sd = net.y_mean, net.y_sd
        R = torch.exp(m[0] - m[1] + sd[0] * qi - sd[1] * qn).mean(1)
        Ep = m[2] + sd[2] * (beta[:, 2] * Bbar[2]).sum(-1)
        Ea = m[3] + sd[3] * (beta[:, 3] * Bbar[3]).sum(-1)
        return R * d - Ep + Ea - d

    d = x[:, 0].clone().requires_grad_(True)
    v = delta(d)
    d1, = torch.autograd.grad(v.sum(), d, create_graph=True)
    d2, = torch.autograd.grad(d1.sum(), d, create_graph=create_graph)
    if not create_graph:
        v, d1, d2 = v.detach(), d1.detach(), d2.detach()
    return v, d1, d2


def derivative_penalties(net, b: Batch, obj: Objective, sc):
    """(a) interest coefficients nondecreasing in d; (b) primary-balance coefficients
    concave in d above the training 75th percentile; (c) drift curvature >= 0 at
    collocation states. Derivatives in standardized debt units (d / sd_d)."""
    sd_d = sc["sd_d"]
    col = obj.colloc
    pick = obj.rng.choice(len(col.x), min(len(col.x), obj.cfg.max_colloc), replace=False)
    xc, cc = col.x[pick], col.cid[pick]
    x_all = torch.cat([b.x, xc])
    c_all = torch.cat([b.cid, cc])
    g_i, _ = coef_d_derivs(net, x_all, c_all, head=0)
    pen_a = torch.relu(-g_i * sd_d).pow(2).mean()
    hi = b.x[:, 0] > sc["q75"]
    x_hi = torch.cat([b.x[hi], xc])
    c_hi = torch.cat([b.cid[hi], cc])
    _, h_p = coef_d_derivs(net, x_hi, c_hi, head=2, second=True)
    pen_b = torch.relu(h_p * sd_d ** 2).pow(2).mean()
    u = torch.as_tensor(obj.copula.sample_common(obj.cfg.S_pen, obj.rng))
    _, _, d2 = model_drift(net, xc, cc, u)
    pen_c = torch.relu(-d2 * sd_d ** 2 / sc["sd_dd"]).pow(2).mean()
    return pen_a, pen_b, pen_c


@dataclass
class Colloc:
    x: torch.Tensor
    cid: torch.Tensor


def make_colloc(train_df, n_grid):
    """Observed high-debt states (d above the training 75th percentile) with d replaced
    by a grid between the training 75th and 95th percentiles."""
    q75, q95 = np.quantile(train_df["d"], [0.75, 0.95])
    hi = train_df[train_df["d"] > q75]
    grid = np.linspace(q75, q95, n_grid)
    x = np.repeat(hi[X_COLS].values, n_grid, axis=0)
    x[:, 0] = np.tile(grid, len(hi))
    cid = np.repeat(hi["country"].values, n_grid)
    return Colloc(torch.as_tensor(x), torch.as_tensor(cid))


def scales_for(train_df):
    return {"sd_d": float(train_df["d"].std()),
            "sd_dd": float((train_df["d_next"] - train_df["d"]).std()),
            "q75": float(np.quantile(train_df["d"], 0.75))}


def new_net(train_df, target_cols, n_countries, seed):
    torch.manual_seed(seed)
    xm, xs = train_df[X_COLS].mean().values, train_df[X_COLS].std().values
    ym, ys = train_df[target_cols].mean().values, train_df[target_cols].std().values
    return QuantileNet(xm, xs, ym, ys, n_countries, len(target_cols))


def fit(train_df, target_cols, cfg: TrainCfg, n_countries, seed, copula=None,
        copula_val=None):
    """Full-batch Adam with early stopping on the last N_VAL_YEARS training years,
    then (cfg.refit) a refit on all training years for the selected number of epochs.

    The early-stopping stage uses `copula_val` (rank vectors from the training-proper
    years only) so validation years never enter its training loss; the refit uses
    `copula`. When copula_val is given for a driver model, info["val_hd_crps"] holds
    the stage-1 model's debt CRPS on validation states with d above the training 75th
    percentile (used by the validation-only selection rule)."""
    sc = scales_for(train_df)
    colloc = make_colloc(train_df, cfg.n_grid_pen) if cfg.pen > 0 else None
    full = make_batch(train_df, target_cols)
    T = full.year.max() + 1
    is_val = full.year >= T - N_VAL_YEARS
    tr, va = subset(full, ~is_val), subset(full, is_val)

    def run(batch, n_epochs, val=None, cop=None):
        net = new_net(train_df, target_cols, n_countries, seed)
        obj = Objective(cfg, sc, cop, colloc, seed)
        opt = torch.optim.AdamW(net.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
        best, best_ep, best_state, history = np.inf, 0, None, []
        for ep in range(1, n_epochs + 1):
            opt.zero_grad()
            loss, _ = obj(net, batch)
            loss.backward()
            opt.step()
            if val is not None and ep % cfg.eval_every == 0:
                with torch.no_grad():
                    vl, _ = obj(net, val, penalties=False,
                                rng=np.random.default_rng((seed, 5)))
                history.append((ep, vl.item()))
                if ep >= cfg.min_epochs and vl.item() < best - 1e-6:
                    best, best_ep = vl.item(), ep
                    best_state = {k: v.clone() for k, v in net.state_dict().items()}
                elif ep >= cfg.min_epochs and ep - best_ep >= cfg.patience:
                    break
        if val is not None:
            net.load_state_dict(best_state)
        return net, best_ep, history

    net, best_ep, history = run(tr, cfg.max_epochs, va, copula_val or copula)
    info = {"best_epoch": max(best_ep, cfg.eval_every), "history": history}
    if copula_val is not None and list(target_cols) == W_COLS:
        hv = subset(va, va.x[:, 0].numpy() > sc["q75"])
        info["val_hd_n"] = len(hv.d_next)
        info["val_hd_crps"] = val_debt_crps(net, hv, copula_val, seed) if len(hv.d_next) else np.nan
    if cfg.refit:
        net, _, _ = run(full, info["best_epoch"], cop=copula)
    net.info = info
    return net


@torch.no_grad()
def val_debt_crps(net, b: Batch, copula, seed, S=256):
    u = torch.as_tensor(copula.sample(b.country, S, np.random.default_rng((seed, 6))))
    w = net.to_raw(net.quantile_std(net.coefs(b.x, b.cid), u))
    return crps_samples(debt_from_w(w, b.x[:, :1]), b.d_next).mean().item()
