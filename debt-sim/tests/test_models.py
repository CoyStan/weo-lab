import numpy as np
import torch

from debtsim.config import DESIGNS
from debtsim.copula import RankCopula
from debtsim.data import make_replication, W_COLS, X_COLS
from debtsim.models import project_identity
from debtsim.nets import pit
from debtsim.train import new_net, model_drift, coef_d_derivs, tensors

torch.set_default_dtype(torch.float64)


def _random_net(seed=0):
    rep = make_replication(DESIGNS["D2"], 15, seed=seed, n_high=50)
    net = new_net(rep.train, W_COLS, 25, seed)
    with torch.no_grad():                       # move away from the near-linear init
        for p in net.parameters():
            p.add_(0.3 * torch.randn_like(p))
    return rep, net


def test_drift_derivatives_autodiff_vs_finite_differences():
    rep, net = _random_net()
    tr = rep.train
    u = torch.as_tensor(np.random.default_rng(0).uniform(0.01, 0.99, (128, 4)))
    x = tensors(tr.iloc[:20], X_COLS)
    cid = torch.as_tensor(tr["country"].values[:20])
    v, d1, d2 = model_drift(net, x, cid, u, create_graph=False)
    h = 1e-4

    def at(shift):
        xs = x.clone()
        xs[:, 0] += shift
        return model_drift(net, xs, cid, u, create_graph=False)

    vp, d1p, _ = at(h)
    vm, d1m, _ = at(-h)
    assert torch.allclose(d1, (vp - vm) / (2 * h), rtol=1e-5, atol=1e-8)
    assert torch.allclose(d2, (d1p - d1m) / (2 * h), rtol=1e-4, atol=1e-6)
    assert torch.allclose(d2, (vp - 2 * v + vm) / h ** 2, rtol=1e-3, atol=1e-4)


def test_coefficient_derivatives_vs_finite_differences():
    rep, net = _random_net(1)
    x = tensors(rep.train.iloc[:30], X_COLS)
    cid = torch.as_tensor(rep.train["country"].values[:30])
    g1, g2 = coef_d_derivs(net, x, cid, head=2, second=True)
    h = 1e-4

    def coefs(shift):
        xs = x.clone()
        xs[:, 0] += shift
        return net.coefs(xs, cid)[:, 2].detach()

    fd1 = (coefs(h) - coefs(-h)) / (2 * h)
    fd2 = (coefs(h) - 2 * coefs(0) + coefs(-h)) / h ** 2
    assert torch.allclose(g1, fd1, rtol=1e-5, atol=1e-6)
    assert torch.allclose(g2, fd2, rtol=1e-3, atol=1e-4)


def test_pit_inverts_quantiles():
    rep, net = _random_net(2)
    df = rep.train.iloc[:50]
    x, cid = tensors(df, X_COLS), torch.as_tensor(df["country"].values)
    u = torch.as_tensor(np.random.default_rng(1).uniform(0.02, 0.98, (50, 4)))
    with torch.no_grad():
        y = net.to_raw(net.quantile_std(net.coefs(x, cid), u))
    assert torch.allclose(pit(net, x, cid, y), u, atol=1e-8)


def test_projection_satisfies_identity_and_is_minimal():
    rng = np.random.default_rng(0)
    x = np.column_stack([rng.normal(0.04, 0.01, 500), rng.normal(0.06, 0.02, 500),
                         rng.normal(0, 0.01, 500), rng.normal(0, 0.02, 500),
                         rng.normal(0.6, 0.05, 500)])
    d = rng.uniform(0.3, 1.0, 500)
    W = 1 / np.array([1e-4, 4e-4, 1e-4, 4e-4, 2.5e-3])
    z = project_identity(x, d, W)
    f = np.exp(z[:, 0] - z[:, 1]) * d - z[:, 2] + z[:, 3] - z[:, 4]
    assert np.max(np.abs(f)) < 1e-12
    # any other point on the constraint surface nearby has a larger weighted distance
    zz = z.copy()
    zz[:, 3] += 1e-3
    zz[:, 4] += 1e-3
    assert np.all(((zz - x) ** 2 * W).sum(1) > ((z - x) ** 2 * W).sum(1))


def test_rank_copula_whole_year_sampling():
    rng = np.random.default_rng(0)
    years = np.repeat(np.arange(10), 5)
    countries = np.tile(np.arange(5), 10)
    u = rng.uniform(size=(50, 2))
    cop = RankCopula(u, years, countries, 5)
    s = cop.sample(np.arange(5), 200, rng)
    assert s.shape == (5, 200, 2) and np.all((s > 0) & (s < 1))
    # same draw index -> same historical year for all countries: ranks come from one year
    pool_years = cop.pool[:, :, 0]
    for k in range(5):
        y = np.argmin(np.abs(pool_years[:, 0] - s[0, k, 0]))
        assert np.allclose(pool_years[y], s[:, k, 0], atol=0.5 / 50 + 1e-12)
