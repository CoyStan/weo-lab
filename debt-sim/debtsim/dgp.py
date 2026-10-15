"""Data generating process: shocks, drivers, panel simulation, true quantiles."""
import numpy as np
import pandas as pd
from scipy import stats

from .config import Design, SHOCK_CORR, I_KNOT, P_KNOT, N_KNOT

_CHOL = np.linalg.cholesky(SHOCK_CORR)


def _pos(x):
    return np.maximum(x, 0.0)


# ---------------------------------------------------------------- shocks
def a_margin_ppf(design: Design, u):
    """Quantile function of the standardized adjustment shock e_a."""
    if np.isfinite(design.a_df):
        nu = design.a_df
        return stats.t.ppf(u, nu) * np.sqrt((nu - 2.0) / nu)
    return stats.norm.ppf(u)


def a_margin_cdf(design: Design, x):
    if np.isfinite(design.a_df):
        nu = design.a_df
        return stats.t.cdf(x / np.sqrt((nu - 2.0) / nu), nu)
    return stats.norm.cdf(x)


def draw_copula_uniforms(design: Design, n, rng):
    """(n, 4) uniforms from the design's copula over (e_i, e_n, e_p, e_a)."""
    z = rng.standard_normal((n, 4)) @ _CHOL.T
    if design.copula == "t":
        w = rng.chisquare(design.copula_df, size=(n, 1)) / design.copula_df
        return stats.t.cdf(z / np.sqrt(w), design.copula_df)
    return stats.norm.cdf(z)


def uniforms_to_shocks(design: Design, u):
    """Map copula uniforms to standardized shocks via the marginal quantiles."""
    u = np.clip(u, 1e-12, 1 - 1e-12)
    e = np.empty_like(u)
    e[:, :3] = stats.norm.ppf(u[:, :3])
    e[:, 3] = a_margin_ppf(design, u[:, 3])
    return e


def draw_shocks(design: Design, n, rng):
    return uniforms_to_shocks(design, draw_copula_uniforms(design, n, rng))


# ---------------------------------------------------------------- drivers
def drivers(design: Design, d, g_next, e, fx, deriv=False):
    """Transformed drivers w = (log(1+i), log(1+n), p, a) given start-of-year debt.

    d, g_next: arrays broadcastable to e[..., 0]; e: (..., 4) standardized shocks;
    fx: dict of country effects {'i0','n0','p0'} (scalars or arrays).
    With deriv=True also returns first and second derivatives in d, shocks fixed.
    """
    D = design
    ks = fx.get("ks", 1.0)
    k1, k2 = ks * D.k1, ks * D.k2
    li = (fx["i0"] + k1 * d + k2 * _pos(d - I_KNOT) ** 2 + D.gi * g_next
          + (D.si0 + D.si1 * d) * e[..., 0])
    ln = fx["n0"] - D.cn * _pos(d - N_KNOT) ** 2 + D.gn * g_next + D.sn * e[..., 1]
    p = fx["p0"] + D.r1 * d - D.r2 * _pos(d - P_KNOT) ** 2 + D.gp * g_next + D.sp * e[..., 2]
    a = D.sa * e[..., 3] + 0.0 * d
    w = np.stack(np.broadcast_arrays(li, ln, p, a), axis=-1)
    if not deriv:
        return w
    li1 = k1 + 2 * k2 * _pos(d - I_KNOT) + D.si1 * e[..., 0]
    ln1 = -2 * D.cn * _pos(d - N_KNOT) + 0.0 * e[..., 1]
    p1 = D.r1 - 2 * D.r2 * _pos(d - P_KNOT) + 0.0 * e[..., 2]
    li2 = 2 * k2 * (d > I_KNOT) + 0.0 * e[..., 0]
    ln2 = -2 * D.cn * (d > N_KNOT) + 0.0 * e[..., 1]
    p2 = -2 * D.r2 * (d > P_KNOT) + 0.0 * e[..., 2]
    zero = 0.0 * e[..., 3]
    w1 = np.stack(np.broadcast_arrays(li1, ln1, p1, zero), axis=-1)
    w2 = np.stack(np.broadcast_arrays(li2, ln2, p2, zero), axis=-1)
    return w, w1, w2


def identity_next_debt(d, w):
    """Exact debt identity on the transformed scale."""
    return np.exp(w[..., 0] - w[..., 1]) * d - w[..., 2] + w[..., 3]


# ---------------------------------------------------------------- panel
def draw_country_effects(design: Design, n_countries, rng):
    n_ma = int(round(design.ma_share * n_countries))
    ma = np.zeros(n_countries)
    ma[n_countries - n_ma:] = 1.0      # the last n_ma countries have market access
    scale = 1.0 - 0.5 * ma             # market-access countries are less dispersed

    def tn(sd):
        return scale * sd * stats.truncnorm.rvs(-2, 2, size=n_countries, random_state=rng)
    return {"i0": design.i0 + tn(design.sd_i0) - design.ma_di * ma,
            "n0": design.n0 + tn(design.sd_n0),
            "p0": design.p0 + tn(design.sd_p0) - design.ma_dp * ma,
            "ks": 1.0 + (design.ma_kscale - 1.0) * ma,
            "ma": ma}


def typical_effects(design: Design, market_access=False):
    """Centre of the country-effect distribution (of the market-access group if asked)."""
    m = 1.0 if market_access else 0.0
    return {"i0": design.i0 - m * design.ma_di, "n0": design.n0,
            "p0": design.p0 - m * design.ma_dp,
            "ks": 1.0 + (design.ma_kscale - 1.0) * m}


MAX_DEBT = 1.6   # a path above this (incl. burn-in) is an explosive draw and is redrawn


def simulate_panel(design: Design, n_countries=25, n_years=45, burn_in=50, seed=0,
                   max_tries=50):
    """Simulate an annual panel, redrawing (with a new sub-seed) any panel in which a
    country's debt explodes above MAX_DEBT. Returns (df, effects, n_redraws)."""
    for k in range(max_tries):
        df, fx, peak = _simulate_once(design, n_countries, n_years, burn_in, (seed, k))
        if peak <= MAX_DEBT:
            return df, fx, k
    raise RuntimeError("no non-explosive panel found")


def _simulate_once(design, n_countries, n_years, burn_in, seed, effects=None, d0=None):
    rng = np.random.default_rng(seed)
    fx = effects if effects is not None else draw_country_effects(design, n_countries, rng)
    total = burn_in + n_years
    d = np.where(fx.get("ma", 0) > 0, 0.9, 0.5) * np.ones(n_countries) if d0 is None else np.asarray(d0, float).copy()
    g = rng.standard_normal()
    w_prev = np.full((n_countries, 4), np.nan)
    sg = np.sqrt(1 - design.rho ** 2)
    rows = []
    peak = -np.inf
    for t in range(total):
        g_next = design.rho * g + sg * rng.standard_normal()
        e = draw_shocks(design, n_countries, rng)
        w = drivers(design, d, g_next, e, fx)
        d_next = identity_next_debt(d, w)
        peak = max(peak, float(np.max(np.where(np.isfinite(d_next), d_next, np.inf))))
        if peak > MAX_DEBT:
            return None, fx, peak
        if t >= burn_in:
            rows.append(pd.DataFrame({
                "country": np.arange(n_countries), "year": t - burn_in,
                "d": d, "g": g, "g_next": g_next,
                "li_lag": w_prev[:, 0], "ln_lag": w_prev[:, 1],
                "p_lag": w_prev[:, 2], "a_lag": w_prev[:, 3],
                "li": w[:, 0], "ln": w[:, 1], "p": w[:, 2], "a": w[:, 3],
                "d_next": d_next,
            }))
        d, g, w_prev = d_next, g_next, w
    df = pd.concat(rows, ignore_index=True)
    df["i"] = np.expm1(df["li"])
    df["n"] = np.expm1(df["ln"])
    df["ma"] = fx["ma"][df["country"].values]
    return df, fx, peak


# ---------------------------------------------------------------- true quantiles
def true_driver_quantiles(design: Design, u, d, g, fx):
    """True conditional quantiles of w_{t+1} given (d_t, g_t, country effects).

    Integrates over the global-factor innovation, which enters each driver
    additively; li, ln and p are therefore exactly normal, a is a scaled t.
    Returns array (..., 4) for u broadcast against d.
    """
    D = design
    u = np.asarray(u, float)
    sg = np.sqrt(1 - D.rho ** 2)
    zq = stats.norm.ppf(u)
    ks = fx.get("ks", 1.0)
    mi = fx["i0"] + ks * D.k1 * d + ks * D.k2 * _pos(d - I_KNOT) ** 2 + D.gi * D.rho * g
    vi = (D.si0 + D.si1 * d) ** 2 + (D.gi * sg) ** 2
    mn = fx["n0"] - D.cn * _pos(d - N_KNOT) ** 2 + D.gn * D.rho * g
    vn = D.sn ** 2 + (D.gn * sg) ** 2
    mp = fx["p0"] + D.r1 * d - D.r2 * _pos(d - P_KNOT) ** 2 + D.gp * D.rho * g
    vp = D.sp ** 2 + (D.gp * sg) ** 2
    qa = D.sa * a_margin_ppf(D, u)
    out = np.broadcast_arrays(mi + np.sqrt(vi) * zq, mn + np.sqrt(vn) * zq,
                              mp + np.sqrt(vp) * zq, qa + 0.0 * d)
    return np.stack(out, axis=-1)
