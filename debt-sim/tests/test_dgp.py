import numpy as np
import pytest

from debtsim.config import DESIGNS
from debtsim.dgp import (simulate_panel, identity_next_debt, true_driver_quantiles,
                         typical_effects, draw_shocks, drivers)
from debtsim.truth import TruthMC


@pytest.mark.parametrize("name", list(DESIGNS))
def test_identity_holds_exactly(name):
    df, _, _ = simulate_panel(DESIGNS[name], 25, 30, 50, seed=3)
    d_next = (1 + df["i"]) / (1 + df["n"]) * df["d"] - df["p"] + df["a"]
    assert np.max(np.abs(d_next - df["d_next"])) < 1e-12
    # next row's starting debt is this row's d_next
    nxt = df.sort_values(["country", "year"]).groupby("country")
    for _, g in nxt:
        assert np.allclose(g["d"].values[1:], g["d_next"].values[:-1], atol=0, rtol=0)


@pytest.mark.parametrize("name", list(DESIGNS))
def test_adjustments_recomputed_as_residuals(name):
    df, _, _ = simulate_panel(DESIGNS[name], 25, 30, 50, seed=4)
    a_res = df["d_next"] - (1 + df["i"]) / (1 + df["n"]) * df["d"] + df["p"]
    assert np.max(np.abs(a_res - df["a"])) < 1e-12


@pytest.mark.parametrize("name", list(DESIGNS))
def test_true_quantiles_match_simulation(name):
    D = DESIGNS[name]
    rng = np.random.default_rng(0)
    n, d, g = 400_000, 0.9, 0.5
    fx = typical_effects(D)
    g_next = D.rho * g + np.sqrt(1 - D.rho ** 2) * rng.standard_normal(n)
    w = drivers(D, d, g_next, draw_shocks(D, n, rng), fx)
    u = np.array([0.05, 0.25, 0.5, 0.75, 0.95])
    q_true = true_driver_quantiles(D, u, d, g, fx)
    q_emp = np.quantile(w, u, axis=0)
    scale = w.std(axis=0)
    assert np.max(np.abs(q_true - q_emp) / scale) < 0.02


@pytest.mark.parametrize("name", list(DESIGNS))
def test_drift_derivatives_against_finite_differences(name):
    tm = TruthMC(DESIGNS[name], n_draws=50_000)
    h = 1e-5
    for d in (0.45, 0.7, 1.05, 1.4):      # away from the kinks
        v, s, c = tm.drift_derivs(d)
        s_fd = (tm.drift(d + h) - tm.drift(d - h)) / (2 * h)
        c_fd = (tm.drift_derivs(d + h)[1] - tm.drift_derivs(d - h)[1]) / (2 * h)
        assert abs(s - s_fd) < 1e-6
        assert abs(c - c_fd) < 1e-4 * max(1, abs(c))


def test_identity_function():
    rng = np.random.default_rng(1)
    w = rng.normal(0, 0.03, (100, 4))
    d = rng.uniform(0.2, 1.2, 100)
    ref = (np.exp(w[:, 0]) / np.exp(w[:, 1])) * d - w[:, 2] + w[:, 3]
    assert np.allclose(identity_next_debt(d, w), ref)


def test_censoring_is_on_current_state():
    import pandas as pd
    from debtsim.dgp import censor, MAX_DEBT
    df = pd.DataFrame({"country": [0] * 5 + [1] * 3, "year": list(range(5)) + list(range(3)),
                       "d": [1.0, 1.5, 1.7, 1.2, 1.9, 0.5, 0.6, 0.7],
                       "d_next": [1.5, 1.7, 1.2, 1.9, 2.5, 0.6, 0.7, 0.8]})
    kept, cens = censor(df)
    # the transition that crosses MAX_DEBT (1.5 -> 1.7) is kept, everything after is dropped,
    # even when debt later falls back below the threshold
    assert kept[kept.country == 0]["year"].tolist() == [0, 1]
    assert kept[kept.country == 1]["year"].tolist() == [0, 1, 2]
    assert cens == {0}
    kept2, _ = censor(df, censored={1})
    assert 1 not in set(kept2["country"])
    assert (kept["d"] <= MAX_DEBT).all()
