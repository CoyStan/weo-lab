"""Configurations C0-C4 and B1: fitting, forecast draws, drift at the reference state."""
import time
from dataclasses import dataclass, field, replace

import numpy as np
import torch

from .copula import RankCopula
from .data import X_COLS, W_COLS, N_VAL_YEARS, oracle_draws
from .dgp import typical_effects
from .nets import pit
from .train import TrainCfg, fit, model_drift, tensors, debt_from_w, coef_d_derivs
from .truth import cached_truth

N_FOLDS = 3
C1_COLS = W_COLS + ["dd"]     # C1 models d_{t+1} on the change scale dd = d_{t+1} - d_t

# Neural grid: (name, lambda_d, penalty weight). (0, 0) is C2.
GRID = (("C2", 0.0, 0.0), ("C2_p1", 0.0, 1.0), ("C2_p10", 0.0, 10.0),
        ("C3", 2.0, 0.0), ("C4_p1", 2.0, 1.0), ("C4_p10", 2.0, 10.0))
CELLS = tuple(g[0] for g in GRID)
NEURAL = CELLS + ("SEL",)     # SEL: the cell chosen by validation-only high-debt CRPS


@dataclass
class Fitted:
    rep: object
    nets: dict = field(default_factory=dict)
    copula: RankCopula = None
    copula_val: RankCopula = None
    copula_ext: RankCopula = None
    c1_weights: np.ndarray = None
    b1: dict = None
    b1h: dict = None
    g_ar: tuple = None
    selected: str = None
    timings: dict = field(default_factory=dict)


def _fold_pits(train, target_cols, cfg, n_c, seed, epochs):
    """Forward cross-fitted PITs: year block k uses a model fit on blocks < k
    (block 0 uses a model fit on the later blocks)."""
    years = train["year"].values
    edges = np.quantile(np.unique(years), np.linspace(0, 1, N_FOLDS + 1))
    block = np.clip(np.searchsorted(edges, years, side="right") - 1, 0, N_FOLDS - 1)
    u = np.zeros((len(train), len(target_cols)))
    fcfg = replace(cfg, refit=False, max_epochs=epochs, patience=10 ** 9)
    for k in range(N_FOLDS):
        fit_mask = (block < k) if k > 0 else (block > 0)
        net = _fit_fixed(train[fit_mask], target_cols, fcfg, n_c, seed + 31 * k, epochs)
        rows = train[block == k]
        u[block == k] = pit(net, tensors(rows, X_COLS), torch.as_tensor(rows["country"].values),
                            tensors(rows, target_cols)).numpy()
    return u


def _fit_fixed(df, target_cols, cfg, n_c, seed, epochs):
    """Fit for a fixed number of epochs without validation."""
    from .train import new_net, Objective, make_batch, scales_for
    net = new_net(df, target_cols, n_c, seed)
    obj = Objective(cfg, scales_for(df), None, None, seed)
    b = make_batch(df, target_cols)
    opt = torch.optim.AdamW(net.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    for _ in range(epochs):
        opt.zero_grad()
        loss, _ = obj(net, b)
        loss.backward()
        opt.step()
    return net


def fit_b1(train, target="d_next"):
    """Linear location-scale quantile regression of the target on (d, g, lagged drivers):
    OLS location, OLS on absolute residuals for scale, empirical standardized residuals."""
    train = train[train[target].notna()]
    X = np.column_stack([np.ones(len(train)), train[X_COLS].values])
    y = train[target].values
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    res = y - X @ beta
    gamma = np.linalg.lstsq(X, np.abs(res), rcond=None)[0]
    scale = np.maximum(X @ gamma, 1e-3)
    return {"beta": beta, "gamma": gamma, "e": res / scale}


def fit_g_ar(train):
    """AR(1) for the global factor from the training years (used for recursive paths)."""
    g = train.groupby("year")[["g", "g_next"]].first()
    rho = float(np.polyfit(g["g"], g["g_next"], 1)[0])
    sd = float(np.std(g["g_next"] - rho * g["g"]))
    return rho, sd


def fit_all(rep, configs=("C1", "B1") + CELLS, base_cfg: TrainCfg = None):
    base = base_cfg or TrainCfg()
    tr, n_c, seed = rep.train, len(rep.fx["i0"]), rep.seed
    F = Fitted(rep)
    F.g_ar = fit_g_ar(tr)
    tic = time.time()
    ep = fit(tr, W_COLS, base, n_c, seed + 2).info["best_epoch"]
    u_drv = _fold_pits(tr, W_COLS, base, n_c, seed + 5, ep)
    F.copula = RankCopula(u_drv, tr["year"].values, tr["country"].values, n_c, seed)
    proper = tr["year"].values < tr["year"].max() + 1 - N_VAL_YEARS
    F.copula_val = RankCopula(u_drv[proper], tr["year"].values[proper],
                              tr["country"].values[proper], n_c, seed)
    F.timings["copula"] = time.time() - tic
    for k, (name, lam, pen) in enumerate(GRID):
        if name not in configs:
            continue
        tic = time.time()
        F.nets[name] = fit(tr, W_COLS, replace(base, lam_d=lam, pen=pen), n_c, seed + 2,
                           copula=F.copula, copula_val=F.copula_val)
        F.timings[name] = time.time() - tic
    fitted = [c for c in CELLS if c in F.nets]
    if fitted:
        scores = {c: F.nets[c].info.get("val_hd_crps", np.nan) for c in fitted}
        F.selected = min(fitted, key=lambda c: (np.nan_to_num(scores[c], nan=np.inf),
                                                CELLS.index(c)))
        F.nets["SEL"] = F.nets[F.selected]
    if "C1" in configs:
        tic = time.time()
        for k, col in enumerate(C1_COLS):
            F.nets[f"C1_{col}"] = fit(tr, [col], base, n_c, seed + 11 + k)
        ep_d = F.nets["C1_dd"].info["best_epoch"]
        u_d = _fold_pits(tr, ["dd"], base, n_c, seed + 7, ep_d)
        F.copula_ext = RankCopula(np.column_stack([u_drv, u_d]), tr["year"].values,
                                  tr["country"].values, n_c, seed)
        F.c1_weights = _c1_weights(F, tr)
        F.timings["C1"] = time.time() - tic
    if "B1" in configs:
        F.b1 = fit_b1(tr)
        F.b1h = fit_b1(tr, "d_h3")
    return F


def _median(net, df):
    with torch.no_grad():
        beta = net.coefs(tensors(df, X_COLS), torch.as_tensor(df["country"].values))
        return net.to_raw(net.quantile_std(beta, torch.full(beta.shape[:-1], 0.5))).numpy()


def _c1_weights(F, tr):
    """Inverse training error variances of the five C1 models (median residuals)."""
    v = []
    for col in C1_COLS:
        res = tr[col].values - _median(F.nets[f"C1_{col}"], tr)[:, 0]
        v.append(np.var(res))
    return 1.0 / np.array(v)


def project_identity(x, d, W, iters=6):
    """Project draws x (..., 5) = (li, ln, p, a, d') onto the identity
    d' = exp(li - ln) d - p + a, minimizing sum_k W_k (x_k - xhat_k)^2.
    Gauss-Newton / Lagrange iterations, vectorized over draws."""
    xh = x.copy()
    z = x.copy()
    Winv = 1.0 / W
    for _ in range(iters):
        R = np.exp(z[..., 0] - z[..., 1])
        f = R * d - z[..., 2] + z[..., 3] - z[..., 4]
        Jm = np.stack([R * d, -R * d, -np.ones_like(R), np.ones_like(R), -np.ones_like(R)], -1)
        # linearize at z: f(z) + J (x - z) = 0 with x = xh - Winv J^T lam
        rhs = f + (Jm * (xh - z)).sum(-1)
        lam = rhs / (Jm ** 2 * Winv).sum(-1)
        z = xh - Winv * Jm * lam[..., None]
    return z


def forecast_draws(F: Fitted, cfgname, df, S, rng):
    """Joint forecast draws for rows of df: returns (w (n,S,4) or None, d_next (n,S))."""
    rep = F.rep
    n = len(df)
    d = df["d"].values[:, None]
    if cfgname == "C0":
        return oracle_draws(rep.design, rep.fx, df, S, rng)
    if cfgname == "B1":
        return None, _b1_draws(F.b1, df, S, rng)
    x = tensors(df, X_COLS)
    cid = torch.as_tensor(df["country"].values)
    if cfgname in NEURAL:
        net = F.nets[cfgname]
        u = torch.as_tensor(F.copula.sample(df["country"].values, S, rng))
        with torch.no_grad():
            w = net.to_raw(net.quantile_std(net.coefs(x, cid), u)).numpy()
        return w, debt_from_w(torch.as_tensor(w), torch.as_tensor(d)).numpy()
    if cfgname == "C1":
        u = F.copula_ext.sample(df["country"].values, S, rng)
        cols = []
        with torch.no_grad():
            for k, col in enumerate(C1_COLS):
                net = F.nets[f"C1_{col}"]
                uk = torch.as_tensor(u[..., k:k + 1])
                cols.append(net.to_raw(net.quantile_std(net.coefs(x, cid), uk)).numpy()[..., 0])
        cols[4] = cols[4] + d                                   # dd -> d_{t+1}
        z = project_identity(np.stack(cols, -1), d, F.c1_weights)
        return z[..., :4], z[..., 4]
    raise ValueError(cfgname)


def _b1_draws(m, df, S, rng):
    X = np.column_stack([np.ones(len(df)), df[X_COLS].values])
    loc, scale = X @ m["beta"], np.maximum(X @ m["gamma"], 1e-3)
    return loc[:, None] + scale[:, None] * rng.choice(m["e"], (len(df), S))


def _step_inputs(d, lags, g):
    return torch.as_tensor(np.concatenate([d[..., None], lags, g[..., None]], -1)
                           .reshape(-1, len(X_COLS)))


def recursive_draws(F: Fitted, cfgname, df, S, H, rng):
    """Draws of d_{t+H} by iterating the one-step model H times along simulated paths
    (global factor from the training AR(1)). B1 uses a direct H-step regression."""
    rep = F.rep
    n = len(df)
    if cfgname == "C0":
        from .data import oracle_paths
        return oracle_paths(rep.design, rep.fx, df, S, H, rng)
    if cfgname == "B1":
        return _b1_draws(F.b1h, df, S, rng)
    rho, sg = F.g_ar
    d = np.repeat(df["d"].values[:, None], S, 1)
    g = np.repeat(df["g"].values[:, None], S, 1)
    lags = np.repeat(df[["li_lag", "ln_lag", "p_lag", "a_lag"]].values[:, None], S, 1)
    countries = df["country"].values
    cid = torch.as_tensor(np.repeat(countries, S))
    for _ in range(H):
        x = _step_inputs(d, lags, g)
        with torch.no_grad():
            if cfgname in NEURAL:
                net = F.nets[cfgname]
                u = torch.as_tensor(F.copula.sample(countries, S, rng).reshape(-1, 4))
                w = net.to_raw(net.quantile_std(net.coefs(x, cid), u)).numpy().reshape(n, S, 4)
                d_new = np.exp(w[..., 0] - w[..., 1]) * d - w[..., 2] + w[..., 3]
            elif cfgname == "C1":
                u = F.copula_ext.sample(countries, S, rng).reshape(-1, 5)
                cols = []
                for k, col in enumerate(C1_COLS):
                    net = F.nets[f"C1_{col}"]
                    q = net.to_raw(net.quantile_std(net.coefs(x, cid),
                                                    torch.as_tensor(u[:, k:k + 1])))
                    cols.append(q.numpy()[:, 0].reshape(n, S))
                cols[4] = cols[4] + d
                z = project_identity(np.stack(cols, -1), d, F.c1_weights)
                w, d_new = z[..., :4], z[..., 4]
            else:
                raise ValueError(cfgname)
        g = rho * g + sg * rng.standard_normal((n, S))
        d, lags = np.clip(d_new, -1.0, 10.0), w
    return d


def reference_state(train, b, frac=0.1):
    """Model input at the reference state: d = b, g = 0, lagged drivers averaged over
    the training rows nearest to b (the true DGP does not depend on them)."""
    k = max(5, int(frac * len(train)))
    near = train.iloc[np.argsort(np.abs(train["d"].values - b))[:k]]
    x = near[X_COLS].mean().values.copy()
    x[0], x[-1] = b, 0.0
    return x


def drift_at(F: Fitted, cfgname, b, S=4000, seed=0):
    """(Delta, Delta', Delta'') at d = b for the typical country (zero embedding), g = 0."""
    rep = F.rep
    if cfgname == "C0":
        return cached_truth(rep.design.name).drift_derivs(b)
    if cfgname == "B1":
        bd = F.b1["beta"][1]
        x = reference_state(rep.train, b)
        loc = F.b1["beta"][0] + x @ F.b1["beta"][1:]
        return loc - b, bd - 1.0, 0.0
    x = torch.as_tensor(reference_state(rep.train, b))[None]
    cid = torch.zeros(1, dtype=torch.long)
    emb = torch.zeros(1, 3)
    if cfgname in NEURAL:
        u = torch.as_tensor(F.copula.sample_common(S, np.random.default_rng(seed)))
        v, s, c = model_drift(F.nets[cfgname], x, cid, u, emb=emb, create_graph=False)
        return v.item(), s.item(), c.item()
    if cfgname == "C1":
        net = F.nets["C1_dd"]
        # drift = E[dd] = integral of Q = y_mean + y_sd * mean of the Bernstein coefficients
        b0 = net.coefs(x, cid, emb=emb)[:, 0].mean(-1)
        b1, b2 = (t.mean(-1) for t in coef_d_derivs(net, x, cid, 0, True, emb))
        ys = net.y_sd[0]
        return (net.y_mean[0] + ys * b0).item(), (ys * b1).item(), (ys * b2).item()
    raise ValueError(cfgname)
