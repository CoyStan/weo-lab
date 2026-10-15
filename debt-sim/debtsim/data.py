"""Per-replication data: training panel, test years, high-debt test states."""
from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import Design
from .dgp import simulate_panel, draw_shocks, drivers, identity_next_debt

X_COLS = ["d", "li_lag", "ln_lag", "p_lag", "a_lag", "g"]
W_COLS = ["li", "ln", "p", "a"]
N_TEST_YEARS = 5
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
    n_redraws: int

    def quantile(self, q):
        return float(np.quantile(self.train["d"], q))


def _fx_rows(fx, cid):
    return {k: np.asarray(v)[cid] for k, v in fx.items()}


def make_replication(design: Design, T: int, seed: int, n_countries=25, n_high=500):
    """Train on years 1..T (year 0 has no lagged drivers), test on the next 5 years,
    plus a high-debt test set of states with d above the training 90th percentile."""
    df, fx, redraws = simulate_panel(design, n_countries, T + 1 + N_TEST_YEARS, 50,
                                     seed=seed)
    df = df[df["year"] >= 1].copy()
    df["year"] -= 1
    df["dd"] = df["d_next"] - df["d"]          # debt change: C1's debt target scale
    train = df[df["year"] < T].reset_index(drop=True)
    test = df[df["year"] >= T].reset_index(drop=True)
    high = make_high_debt_states(design, fx, train, n_high, seed)
    high["dd"] = high["d_next"] - high["d"]
    return Replication(design, T, seed, train, test, high, fx, redraws)


def make_high_debt_states(design, fx, train, n, seed):
    """Draw states with d above the training 90th percentile from the DGP.

    Starts countries at debt levels between the training 90th percentile and the
    training maximum + 0.1, simulates two years so lagged drivers are consistent,
    and keeps the second transition when its starting debt is above the threshold.
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
        keep = d1 > q90
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
