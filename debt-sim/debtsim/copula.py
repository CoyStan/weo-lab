"""Empirical rank copula: rank vectors stored by year, sampled as whole years."""
import numpy as np


class RankCopula:
    def __init__(self, u, years, countries, n_countries, rng_seed=0):
        """u: (n, K) PITs; years, countries: (n,) ids."""
        u = np.asarray(u, float)
        n, K = u.shape
        ranks = (np.argsort(np.argsort(u, axis=0), axis=0) + 0.5) / n
        self.n, self.K = n, K
        self.years = np.unique(years)
        yi = np.searchsorted(self.years, years)
        pool = np.full((len(self.years), n_countries, K), np.nan)
        pool[yi, countries] = ranks
        rng = np.random.default_rng(rng_seed)
        for y in range(len(self.years)):        # fill missing countries within a year
            have = np.where(~np.isnan(pool[y, :, 0]))[0]
            for c in np.where(np.isnan(pool[y, :, 0]))[0]:
                pool[y, c] = pool[y, rng.choice(have)]
        self.pool = pool

    def sample(self, countries, S, rng, years=None):
        """(n, S, K) uniforms. Draw s uses one historical year for all rows (whole-year
        sampling keeps cross-country dependence); country c gets its own rank vector
        from that year, plus uniform jitter of one rank cell."""
        countries = np.asarray(countries)
        yi = rng.integers(0, len(self.years), S) if years is None else years
        u = self.pool[yi[None, :], countries[:, None]]          # (n, S, K)
        u = u + rng.uniform(-0.5, 0.5, u.shape) / self.n
        return np.clip(u, 1e-6, 1 - 1e-6)

    def sample_common(self, S, rng):
        """(S, K) draws not tied to a country: random year, random country."""
        yi = rng.integers(0, len(self.years), S)
        ci = rng.integers(0, self.pool.shape[1], S)
        u = self.pool[yi, ci] + rng.uniform(-0.5, 0.5, (S, self.K)) / self.n
        return np.clip(u, 1e-6, 1 - 1e-6)
