"""Ground truth by Monte Carlo with common random numbers: drift, derivatives, crossing."""
import numpy as np
from scipy.optimize import brentq

from .config import Design
from .dgp import draw_shocks, drivers, typical_effects


class TruthMC:
    """Fixed Monte Carlo draws (shocks + global-factor innovation) for a reference state.

    All functions of d reuse the same draws, so the drift is a smooth function of d
    and its derivatives are the exact derivatives of the MC average.
    """

    def __init__(self, design: Design, g=0.0, fx=None, n_draws=400_000, seed=12345):
        rng = np.random.default_rng(seed)
        self.design = design
        self.fx = fx if fx is not None else typical_effects(design)
        self.e = draw_shocks(design, n_draws, rng)
        self.g_next = design.rho * g + np.sqrt(1 - design.rho ** 2) * rng.standard_normal(n_draws)

    def _parts(self, d):
        w, w1, w2 = drivers(self.design, d, self.g_next, self.e, self.fx, deriv=True)
        x = w[:, 0] - w[:, 1]
        x1 = w1[:, 0] - w1[:, 1]
        x2 = w2[:, 0] - w2[:, 1]
        R = np.exp(x)
        R_d = R * x1
        R_dd = R * (x1 ** 2 + x2)
        B, B_d, B_dd = -w[:, 2] + w[:, 3], -w1[:, 2], -w2[:, 2]
        return R, R_d, R_dd, B, B_d, B_dd

    def drift(self, d):
        R, _, _, B, _, _ = self._parts(d)
        return float(np.mean(R * d + B) - d)

    def drift_derivs(self, d):
        """Returns (Delta, Delta', Delta'') at d."""
        R, R_d, R_dd, B, B_d, B_dd = self._parts(d)
        v = np.mean(R * d + B) - d
        s = np.mean(R) - 1 + d * np.mean(R_d) + np.mean(B_d)
        c = 2 * np.mean(R_d) + d * np.mean(R_dd) + np.mean(B_dd)
        return float(v), float(s), float(c)

    def next_debt_draws(self, d):
        w = drivers(self.design, d, self.g_next, self.e, self.fx)
        return np.exp(w[:, 0] - w[:, 1]) * d - w[:, 2] + w[:, 3]

    def crossing(self, lo=0.6, hi=3.0, n_grid=121):
        """Smallest root of the drift above `lo` where the drift turns positive."""
        grid = np.linspace(lo, hi, n_grid)
        vals = np.array([self.drift(x) for x in grid])
        idx = np.where((vals[:-1] < 0) & (vals[1:] >= 0))[0]
        if len(idx) == 0:
            return np.nan
        k = idx[0]
        return brentq(self.drift, grid[k], grid[k + 1], xtol=1e-8)
