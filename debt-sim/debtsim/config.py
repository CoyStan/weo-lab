"""Design parameters for the simulated debt panel.

Drivers are generated on the transformed scale w = (log(1+i), log(1+n), p, a)
as functions of the debt ratio at the start of the year, d_t, and the global
factor at the end of the year, g_{t+1}:

    log(1+i) = i0_c + k1 d + k2 max(d-0.6,0)^2 + gi g' + (si0 + si1 d) e_i
    log(1+n) = n0_c - cn max(d-0.9,0)^2       + gn g' + sn e_n
    p        = p0_c + r1 d - r2 max(d-0.8,0)^2 + gp g' + sp e_p
    a        = sa e_a

g follows a stationary AR(1) with persistence rho and unconditional sd 1.
"""
from dataclasses import dataclass, asdict, replace

import numpy as np

DRIVERS = ("li", "ln", "p", "a")          # transformed driver names
I_KNOT, P_KNOT, N_KNOT = 0.6, 0.8, 0.9   # debt kinks in the responses

# Copula correlation over (e_i, e_n, e_p, e_a).
SHOCK_CORR = np.array([
    [1.0, -0.3, 0.0, 0.0],
    [-0.3, 1.0, 0.3, -0.4],
    [0.0, 0.3, 1.0, 0.0],
    [0.0, -0.4, 0.0, 1.0],
])


@dataclass(frozen=True)
class Design:
    name: str
    # effective interest, log(1+i)
    i0: float = 0.032
    k1: float = 0.018
    k2: float = 0.030
    si0: float = 0.0035
    si1: float = 0.0040
    # nominal growth, log(1+n)
    n0: float = 0.060
    cn: float = 0.0
    sn: float = 0.020
    # primary balance (r2 > 0: fiscal fatigue; r2 < 0: convex response)
    p0: float = -0.030
    r1: float = 0.045
    r2: float = 0.050
    sp: float = 0.010
    # other adjustments
    sa: float = 0.017
    # global factor
    rho: float = 0.7
    gi: float = 0.004
    gn: float = -0.010
    gp: float = 0.003
    # country effect dispersion (sd of normal draws, truncated at 2 sd)
    sd_i0: float = 0.003
    sd_n0: float = 0.003
    sd_p0: float = 0.004
    # market-access group (design D2H): a share of countries with lower interest
    # (by ma_di) and lower primary balances (by ma_dp) that sit stably at high debt
    ma_share: float = 0.0
    ma_di: float = 0.0
    ma_dp: float = 0.0
    ma_kscale: float = 1.0     # multiplies k1, k2 (risk-premium response) in the group
    # shock distribution
    copula: str = "t"          # "t" or "gauss"
    copula_df: float = 5.0
    a_df: float = 4.0          # None/inf -> normal margin for e_a

    def as_dict(self):
        return asdict(self)


D1 = Design(name="D1", k2=0.0, r2=0.0, k1=0.065, r1=0.085, p0=-0.037,
            sd_i0=0.002, sd_n0=0.003, sd_p0=0.0025,
            copula="gauss", a_df=float("inf"))
D2 = Design(name="D2")
D3 = Design(name="D3", cn=0.040, r2=-0.030)
D2H = Design(name="D2H", ma_share=0.2, ma_di=0.010, ma_dp=0.037, ma_kscale=0.3)

DESIGNS = {d.name: d for d in (D1, D2, D3, D2H)}


def get_design(name: str) -> Design:
    return DESIGNS[name]


def with_params(design: Design, **kw) -> Design:
    return replace(design, **kw)
