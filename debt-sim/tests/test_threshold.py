import numpy as np

from debtsim.threshold import bounds, random_admissible_drift, first_crossing


def test_bounds_against_random_admissible_drifts():
    """1,000 random admissible drifts (piecewise-constant curvature in [0, M], U <= D)."""
    rng = np.random.default_rng(2024)
    n_valid = n_drawn = 0
    while n_valid < 1000:
        b, D, M = 0.8, rng.uniform(1.2, 3.0), rng.uniform(0.01, 0.5)
        x, val, v, s = random_admissible_drift(b, D, M, rng)
        L, U, valid = bounds(b, v, s, M, D)
        n_drawn += 1
        if not valid:      # theorem needs U <= D; redraw
            continue
        n_valid += 1
        r = first_crossing(x, val)
        assert np.isfinite(r)
        # tolerance covers the grid's linear interpolation of r
        assert L - 1e-6 <= r <= U + 1e-6, (L, r, U)
        assert np.all(val[x > r + 1e-6] > 0)  # crossing is unique
    assert n_drawn < 20_000


def test_bounds_tight_for_extremes():
    b, v, s, M = 1.0, -0.02, 0.05, 0.2
    L, U, _ = bounds(b, v, s, M)
    # linear drift reaches zero at U; quadratic with curvature M at L
    assert np.isclose(v + s * (U - b), 0)
    assert np.isclose(v + s * (L - b) + 0.5 * M * (L - b) ** 2, 0)
    L0, U0, _ = bounds(b, v, s, 0.0)
    assert np.isclose(L0, U0)
