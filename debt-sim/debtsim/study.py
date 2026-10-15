"""Phase 3: main simulation study, one job per replication, results checkpointed."""
import pickle
import time
from dataclasses import replace
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from joblib import Parallel, delayed

from .config import DESIGNS
from .data import make_replication
from .evaluate import forecast_metrics, drift_and_threshold
from .models import fit_all, CELLS

CONFIGS = ("C0", "C1", "B1") + CELLS + ("SEL",)
NOPOOL = ("C2", "C3", "B1")           # refit without the market-access countries (D2H)
DESIGN_ID = {"D1": 1, "D2": 2, "D3": 3, "D2H": 4}


def rep_seed(design, T, r):
    return 1_000_000 * DESIGN_ID[design] + 1_000 * T + r


def run_rep(design, T, r, out_dir: Path):
    path = out_dir / f"{design}_T{T}_r{r:03d}.pkl"
    if path.exists():
        return path
    torch.set_num_threads(1)
    tic = time.time()
    rep = make_replication(DESIGNS[design], T, rep_seed(design, T, r))
    F = fit_all(rep)
    t_fit = time.time() - tic
    tic = time.time()
    fm = forecast_metrics(F, CONFIGS)
    th = drift_and_threshold(F, CONFIGS)
    if design == "D2H":
        keep = rep.train["ma"] == 0
        rep_np = replace(rep, train=rep.train[keep].reset_index(drop=True))
        th += drift_and_threshold(fit_all(rep_np, configs=NOPOOL), NOPOOL, suffix="_nopool")
    meta = dict(design=design, T=T, rep=r, seed=rep.seed, t_fit=t_fit,
                t_eval=time.time() - tic, n_train=len(rep.train), n_test=len(rep.test),
                n_test_rec3=int(rep.test["d_h3"].notna().sum()),
                censored_burnin=rep.info["censored_burnin"],
                censored_sample=rep.info["censored_sample"],
                censored_test_rows=int(25 * 5 * 10 - len(rep.test)),
                selected=F.selected,
                **{f"t_{k}": v for k, v in F.timings.items()},
                **{f"ep_{k}": n.info["best_epoch"] for k, n in F.nets.items() if k != "SEL"},
                **{f"valhd_{k}": F.nets[k].info.get("val_hd_crps", np.nan) for k in CELLS},
                val_hd_n=F.nets["C2"].info.get("val_hd_n", 0))
    for row in fm + th:
        row.update(design=design, T=T, rep=r)
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(pickle.dumps({"forecast": fm, "threshold": th, "meta": meta}))
    tmp.rename(path)
    return path


def collect(out: Path):
    fm, th, meta = [], [], []
    for p in sorted((out / "reps").glob("*.pkl")):
        d = pickle.loads(p.read_bytes())
        fm += d["forecast"]
        th += d["threshold"]
        meta.append(d["meta"])
    pd.DataFrame(fm).to_csv(out / "forecast_metrics.csv", index=False)
    pd.DataFrame(th).to_csv(out / "threshold_metrics.csv", index=False)
    pd.DataFrame(meta).to_csv(out / "replication_meta.csv", index=False)


def run_study(out: Path, n_rep=20, designs=("D1", "D2", "D3", "D2H"), Ts=(15, 25, 40),
              n_jobs=-1):
    reps = out / "reps"
    reps.mkdir(parents=True, exist_ok=True)
    jobs = [(d, T, r) for r in range(n_rep) for d in designs for T in Ts]
    jobs = [j for j in jobs if not (reps / f"{j[0]}_T{j[1]}_r{j[2]:03d}.pkl").exists()]
    t0 = time.time()
    Parallel(n_jobs=n_jobs, verbose=5)(delayed(run_rep)(*j, reps) for j in jobs)
    collect(out)
    print(f"{len(jobs)} replications in {time.time() - t0:.0f}s")
