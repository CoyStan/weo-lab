"""Forecast evaluation metrics, computed from joint draws."""
import numpy as np

from .nets import TAUS

TAU = TAUS.numpy()


def crps(draws, y):
    """Sample CRPS per row, draws (n,S), y (n,)."""
    S = draws.shape[1]
    xs = np.sort(draws, axis=1)
    t1 = np.abs(draws - y[:, None]).mean(1)
    w = 2 * np.arange(1, S + 1) - S - 1
    return t1 - (xs * w).sum(1) / S ** 2


def qloss(draws, y, tau):
    q = np.quantile(draws, tau, axis=1)
    e = y - q
    return np.maximum(tau * e, (tau - 1) * e)


def interval(draws, y, level):
    lo, hi = np.quantile(draws, [(1 - level) / 2, (1 + level) / 2], axis=1)
    return ((y >= lo) & (y <= hi)).astype(float), hi - lo


def driver_pinball(w, y, sd):
    """Mean pinball over the 19 levels, per driver, in training-sd units. w (n,S,4)."""
    q = np.quantile(w, TAU, axis=1)                          # (L, n, 4)
    e = (y[None] - q) / sd
    tau = TAU[:, None, None]
    return np.maximum(tau * e, (tau - 1) * e).mean(0)        # (n, 4)


def energy_score(X, y, sd):
    """Energy score over standardized dims. X (n,S,K), y (n,K)."""
    Xs, ys = X / sd, y / sd
    S = Xs.shape[1]
    t1 = np.linalg.norm(Xs - ys[:, None], axis=-1).mean(1)
    h = S // 2
    t2 = np.linalg.norm(Xs[:, :h] - Xs[:, h:2 * h], axis=-1).mean(1)
    return t1 - 0.5 * t2


def evaluate(w, dn, df, sd_w, sd_all):
    """All per-row forecast metrics for one configuration on one test set."""
    y = df["d_next"].values
    out = {"crps": crps(dn, y), "ql90": qloss(dn, y, 0.9), "ql95": qloss(dn, y, 0.95)}
    for lev in (0.8, 0.9):
        c, wd = interval(dn, y, lev)
        out[f"cov{int(lev * 100)}"], out[f"width{int(lev * 100)}"] = c, wd
    if w is not None:
        yw = df[["li", "ln", "p", "a"]].values
        pb = driver_pinball(w, yw, sd_w)
        for k, name in enumerate(["li", "ln", "p", "a"]):
            out[f"pinball_{name}"] = pb[:, k]
        out["pinball_drivers"] = pb.mean(1)
        X = np.concatenate([w, dn[..., None]], -1)
        out["energy"] = energy_score(X, np.column_stack([yw, y]), sd_all)
    return {k: float(np.mean(v)) for k, v in out.items()}
