"""Pilot: tune lambda_d (C3) and the penalty weight (C4) once, on separate replications."""
import json
import time
from dataclasses import replace
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from joblib import Parallel, delayed

from .config import DESIGNS
from .data import make_replication, W_COLS
from .evaluate import forecast_metrics, threshold_rows, truth_for
from .models import Fitted, _fold_pits, NEURAL
from .copula import RankCopula
from .train import TrainCfg, fit

LAM_GRID = (0.0, 0.5, 2.0)
PEN_GRID = (0.0, 1.0, 10.0)
PILOT_SEED0 = 90_000           # disjoint from the main-study seeds
PILOT_DESIGN = "D2"
PILOT_T = (15, 25, 40)


def _base(rep):
    tr, n_c, seed = rep.train, len(rep.fx["i0"]), rep.seed
    F = Fitted(rep)
    F.nets["C2"] = fit(tr, W_COLS, TrainCfg(), n_c, seed + 2)
    u = _fold_pits(tr, W_COLS, TrainCfg(), n_c, seed + 5, F.nets["C2"].info["best_epoch"])
    F.copula = RankCopula(u, tr["year"].values, tr["country"].values, n_c, seed)
    return F


def _score(F, key, label, name):
    fm = forecast_metrics(F, [key])
    out = {f"{r['set']}_{m}": r[m] for r in fm for m in ("crps", "energy", "pinball_drivers")}
    th = threshold_rows(F, key, F.rep.quantile(0.85), "p85", name, truth_for(name)[1])
    return dict(variant=label, **out, err_v=th["err_v"], err_s=th["err_s"])


def pilot_lambda(T, s):
    torch.set_num_threads(1)
    rep = make_replication(DESIGNS[PILOT_DESIGN], T, PILOT_SEED0 + 100 * T + s)
    F = _base(rep)
    rows = [_score(F, "C2", "lam=0", PILOT_DESIGN)]
    for lam in LAM_GRID[1:]:
        F.nets["C3"] = fit(rep.train, W_COLS, TrainCfg(lam_d=lam), 25, rep.seed + 3,
                           copula=F.copula)
        rows.append(_score(F, "C3", f"lam={lam:g}", PILOT_DESIGN))
    return [dict(T=T, rep=s, stage="lambda", **r) for r in rows]


def pilot_pen(T, s, lam):
    torch.set_num_threads(1)
    rep = make_replication(DESIGNS[PILOT_DESIGN], T, PILOT_SEED0 + 100 * T + s)
    F = _base(rep)
    rows = []
    for pen in PEN_GRID:
        F.nets["C4"] = fit(rep.train, W_COLS, TrainCfg(lam_d=lam, pen=pen), 25,
                           rep.seed + 4, copula=F.copula)
        rows.append(_score(F, "C4", f"pen={pen:g}", PILOT_DESIGN))
    return [dict(T=T, rep=s, stage="pen", **r) for r in rows]


def _criterion(df):
    """Debt CRPS relative to the first variant in the same replication, averaged over
    the regular and high-debt test sets."""
    base = df.groupby(["T", "rep"]).transform("first")
    rel = 0.5 * (df["test_crps"] / base["test_crps"] + df["high_crps"] / base["high_crps"])
    return df.assign(rel_crps=rel)


def run_pilot(out: Path, n_rep=4):
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    jobs = [(T, s) for T in PILOT_T for s in range(n_rep)]
    lam_rows = sum(Parallel(n_jobs=-1)(delayed(pilot_lambda)(T, s) for T, s in jobs), [])
    lam_df = _criterion(pd.DataFrame(lam_rows))
    lam_summary = lam_df.groupby("variant")[["rel_crps", "test_crps", "high_crps",
                                              "err_v", "err_s"]].mean()
    lam = float(lam_summary["rel_crps"].idxmin().split("=")[1])
    t_lam = time.time() - t0
    pen_rows = sum(Parallel(n_jobs=-1)(delayed(pilot_pen)(T, s, lam) for T, s in jobs), [])
    pen_df = _criterion(pd.DataFrame(pen_rows))
    pen_summary = pen_df.groupby("variant")[["rel_crps", "test_crps", "high_crps",
                                              "err_v", "err_s"]].mean()
    pen = float(pen_summary["rel_crps"].idxmin().split("=")[1])
    pd.concat([lam_df, pen_df]).to_csv(out / "pilot_runs.csv", index=False)
    pd.concat({"lambda": lam_summary, "pen": pen_summary}).to_csv(out / "pilot_summary.csv")
    choice = dict(lam_d=lam, pen=pen, n_rep=n_rep, T=list(PILOT_T), design=PILOT_DESIGN,
                  seconds=time.time() - t0, seconds_lambda_stage=t_lam)
    (out / "tuning.json").write_text(json.dumps(choice, indent=2))
    print(lam_summary.round(5), pen_summary.round(5), choice, sep="\n")
    return choice
