"""Phase 1: DGP description, ground truth, and diagnostic plots."""
import time
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import Parallel, delayed

from .config import DESIGNS
from .dgp import simulate_panel, true_driver_quantiles, typical_effects
from .truth import TruthMC
from .threshold import bounds

D_UPPER = 2.0                       # upper end D of the threshold interval [b, D]
M_GRID = (0.0, 0.08, 0.24, 0.40)
B_RULE_PCTS = (75, 85, 90, 95)      # candidate reference percentiles (design D2H)
N_TRUTH_DRAWS = 400_000


def _pooled_debt(design, n_rep, T, seed0=10_000):
    out = Parallel(n_jobs=-1)(delayed(simulate_panel)(design, 25, T, 50, seed0 + s)
                              for s in range(n_rep))
    d = np.concatenate([o[0]["d"].values for o in out])
    redraws = sum(o[2] for o in out)
    return d, redraws


def ground_truth(design, b_pcts, pooled_d, grid):
    tm = TruthMC(design, n_draws=N_TRUTH_DRAWS)
    curve = np.array([tm.drift_derivs(x) for x in grid])
    r = tm.crossing()
    rows = []
    for q in b_pcts:
        b = float(np.quantile(pooled_d, q / 100))
        v, s, c = tm.drift_derivs(b)
        sub = grid[(grid >= b) & (grid <= D_UPPER)]
        cc = np.array([tm.drift_derivs(x)[2] for x in sub])
        row = dict(design=design.name, b_pct=q, b=b, v=v, s=s, curv_b=c,
                   curv_min=cc.min(), curv_max=cc.max(), r=r,
                   certificate=bool(v < 0 and s > 0))
        for M in M_GRID + (cc.max(),):
            L, U, valid = bounds(b, v, s, M, D_UPPER)
            key = "trueM" if M == cc.max() and M not in M_GRID else f"M{M:g}"
            row[f"L_{key}"], row[f"U_{key}"], row[f"valid_{key}"] = float(L), float(U), bool(valid)
            row[f"covers_{key}"] = bool(valid and L - 1e-9 <= r <= U + 1e-9)
        rows.append(row)
    curve_df = pd.DataFrame({"design": design.name, "d": grid, "drift": curve[:, 0],
                             "drift_d1": curve[:, 1], "drift_d2": curve[:, 2]})
    return rows, curve_df, r


def run_phase1(out: Path, n_rep=40, T=40):
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    params = pd.DataFrame([d.as_dict() for d in DESIGNS.values()]).set_index("name").T
    params.to_csv(out / "dgp_parameters.csv")

    grid = np.round(np.arange(0.2, D_UPPER + 1e-9, 0.01), 4)
    truth_rows, curves, data_rows, pooled = [], [], [], {}
    for name, design in DESIGNS.items():
        d, redraws = _pooled_debt(design, n_rep, T)
        pooled[name] = d
        qs = np.quantile(d, [0.01, 0.05, 0.25, 0.5, 0.75, 0.85, 0.9, 0.95, 0.99])
        b_pcts = B_RULE_PCTS if name == "D2H" else (85, 95)
        rows, curve_df, r = ground_truth(design, b_pcts, d, grid)
        truth_rows += rows
        curves.append(curve_df)
        data_rows.append(dict(design=name, n_obs=len(d), redraw_rate=redraws / n_rep,
                              share_in_20_110=float(np.mean((d > 0.2) & (d < 1.1))),
                              **{f"q{int(round(p * 100)):02d}": q for p, q in
                                 zip([0.01, 0.05, 0.25, 0.5, 0.75, 0.85, 0.9, 0.95, 0.99], qs)},
                              true_r=r))
    if "D2H" in DESIGNS:   # drift of the market-access group itself, for the plots
        dz = DESIGNS["D2H"]
        tm = TruthMC(dz, fx=typical_effects(dz, market_access=True), n_draws=N_TRUTH_DRAWS)
        cv = np.array([tm.drift_derivs(x) for x in grid])
        curves.append(pd.DataFrame({"design": "D2H-group", "d": grid, "drift": cv[:, 0],
                                    "drift_d1": cv[:, 1], "drift_d2": cv[:, 2]}))
    pd.DataFrame(data_rows).to_csv(out / "data_moments.csv", index=False)
    pd.DataFrame(truth_rows).to_csv(out / "truth_threshold.csv", index=False)
    pd.concat(curves).to_csv(out / "truth_drift_curves.csv", index=False)

    # true conditional driver quantiles at the reference state (typical country, g = 0)
    qrows = []
    u = np.array([0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95])
    for name, design in DESIGNS.items():
        fx = typical_effects(design)
        tm = TruthMC(design, n_draws=N_TRUTH_DRAWS)
        for dv in (0.4, 0.6, 0.8, 1.0, 1.2):
            q = true_driver_quantiles(design, u, dv, 0.0, fx)
            dq = np.quantile(tm.next_debt_draws(dv), u)
            for j, uu in enumerate(u):
                qrows.append(dict(design=name, d=dv, u=uu, log1p_i=q[j, 0], log1p_n=q[j, 1],
                                  p=q[j, 2], a=q[j, 3], d_next=dq[j]))
    pd.DataFrame(qrows).to_csv(out / "truth_quantiles.csv", index=False)

    from .plots import plot_phase1
    plot_phase1(out, pooled)
    return time.time() - t0
