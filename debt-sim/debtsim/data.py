"""Per-replication data: training panel, continuation test panels, high-debt test states."""
from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import Design
from .dgp import (simulate_panel, simulate_path, censor, draw_shocks, drivers,
                  identity_next_debt, MAX_DEBT)

X_COLS = ["d", "li_lag", "ln_lag", "p_lag", "a_lag", "g"]
W_COLS = ["li", "ln", "p", "a"]
N_TEST_PANELS = 10        # independent continuation panels from the end of training
N_TEST_YEARS = 5          # years per continuation panel
H_REC = 3                 # recursive forecast horizon
N_VAL_YEARS = 3


@dataclass
class Replication:
    design: Design
    T: int
    seed: int
    train: pd.DataFrame
    test: pd.DataFrame
    high: pd.DataFrame
    fx: dict
    info: dict

    def quantile(self, q):
        return float(np.quantile(self.train["d"], q))


def _fx_rows(fx, cid):
    return {k: np.asarray(v)[cid] for k, v in fx.items()}


def add_horizon_target(df, h=H_REC, key=("panel",)):
    """d_{t+h} for each row, from the (uncensored) path of the same country."""
    keys = list(key) + ["country"]
    nxt = df[keys + ["year", "d_next"]].copy()
    nxt["year"] = nxt["year"] - (h - 1)
    nxt = nxt.rename(columns={"d_next": f"d_h{h}"})
    return df.merge(nxt, on=keys + ["year"], how="left")


def make_replication(design: Design, T: int, seed: int, n_countries=25, n_high=500,
                     n_panels=N_TEST_PANELS):
    """Train on years 1..T (year 0 has no lagged drivers). Test on n_panels independent
    5-year continuation panels started from the end-of-training state, and on a
    high-debt set of states above the training 90th percentile. Censoring is on the
    current state throughout (origins with d > MAX_DEBT, or of censored countries, are
    dropped); outcomes are never used for selection."""
    df, fx, info = simulate_panel(design, n_countries, T + 1, 50, seed=seed)
    df = df[df["year"] >= 1].copy()
    df["year"] -= 1
    df["dd"] = df["d_next"] - df["d"]
    df["panel"] = 0
    train = add_horizon_target(df.reset_index(drop=True))
    tests = []
    for k in range(n_panels):
        rng = np.random.default_rng((seed, 4242, k))
        path, _ = simulate_path(design, fx, *info["state"], N_TEST_YEARS, rng, year0=T)
        path["panel"] = k
        path = add_horizon_target(path)
        kept, _ = censor(path.drop(columns="panel"), info["censored"])
        kept = kept.merge(path[["country", "year", "d_h3"]], on=["country", "year"],
                          suffixes=("_x", ""))
        kept = kept.drop(columns=[c for c in kept.columns if c.endswith("_x")])
        kept["panel"] = k
        tests.append(kept)
    test = pd.concat(tests, ignore_index=True)
    test["dd"] = test["d_next"] - test["d"]
    high = make_high_debt_states(design, fx, train, n_high, seed)
    high["dd"] = high["d_next"] - high["d"]
    return Replication(design, T, seed, train, test, high, fx, info)


def make_high_debt_states(design, fx, train, n, seed):
    """Draw states with d above the training 90th percentile from the DGP.

    Starts countries at debt levels between the training 90th percentile and the
    training maximum + 0.1, simulates two years so lagged drivers are consistent,
    and keeps the second transition when its starting debt is above the threshold
    (and not above the censoring point).
    """
    rng = np.random.default_rng((seed, 777))
    q90 = np.quantile(train["d"], 0.9)
    hi = train["d"].max() + 0.1
    n_c = len(fx["i0"])
    rows, total = [], 0
    while total < n:
        m = 2 * n
        cid = rng.integers(0, n_c, m)
        f = _fx_rows(fx, cid)
        sg = np.sqrt(1 - design.rho ** 2)
        g0 = rng.standard_normal(m)
        g1 = design.rho * g0 + sg * rng.standard_normal(m)
        g2 = design.rho * g1 + sg * rng.standard_normal(m)
        d0 = rng.uniform(q90, hi, m)
        w1 = drivers(design, d0, g1, draw_shocks(design, m, rng), f)
        d1 = identity_next_debt(d0, w1)
        w2 = drivers(design, d1, g2, draw_shocks(design, m, rng), f)
        d2 = identity_next_debt(d1, w2)
        keep = (d1 > q90) & (d1 <= MAX_DEBT)
        out = pd.DataFrame({"country": cid, "d": d1, "g": g1, "g_next": g2,
                            "li_lag": w1[:, 0], "ln_lag": w1[:, 1], "p_lag": w1[:, 2],
                            "a_lag": w1[:, 3], "li": w2[:, 0], "ln": w2[:, 1],
                            "p": w2[:, 2], "a": w2[:, 3], "d_next": d2})[keep]
        rows.append(out)
        total += len(out)
    high = pd.concat(rows, ignore_index=True).iloc[:n].copy()
    high["year"] = -1
    return high


def oracle_draws(design, fx, df, S, rng):
    """True conditional draws of (w, d_next) for each row of df. Returns (n,S,4), (n,S)."""
    n = len(df)
    f = _fx_rows(fx, df["country"].values)
    f = {k: v[:, None] for k, v in f.items()}
    g_next = design.rho * df["g"].values[:, None] + np.sqrt(1 - design.rho ** 2) * \
        rng.standard_normal((n, S))
    e = draw_shocks(design, n * S, rng).reshape(n, S, 4)
    d = df["d"].values[:, None]
    w = drivers(design, d, g_next, e, f)
    return w, identity_next_debt(d, w)


def oracle_paths(design, fx, df, S, H, rng):
    """True draws of d_{t+H} by simulating H years from each row's state."""
    n = len(df)
    f = {k: v[:, None] for k, v in _fx_rows(fx, df["country"].values).items()}
    d = np.repeat(df["d"].values[:, None], S, 1)
    g = np.repeat(df["g"].values[:, None], S, 1)
    sg = np.sqrt(1 - design.rho ** 2)
    for _ in range(H):
        g = design.rho * g + sg * rng.standard_normal((n, S))
        e = draw_shocks(design, n * S, rng).reshape(n, S, 4)
        d = identity_next_debt(d, drivers(design, d, g, e, f))
    return d
