"""Phase 2: one replication end to end, with timings."""
import time
from pathlib import Path

import pandas as pd
import torch

from .config import DESIGNS
from .data import make_replication
from .evaluate import forecast_metrics, drift_and_threshold
from .models import fit_all, Tuning

CONFIGS = ("C0", "C1", "C2", "C3", "C4", "B1")


def run_one(design_name, T, seed, tuning, configs=CONFIGS):
    torch.set_num_threads(1)
    tic = time.time()
    rep = make_replication(DESIGNS[design_name], T, seed)
    F = fit_all(rep, tuning, configs=[c for c in configs if c != "C0"])
    t_fit = time.time() - tic
    tic = time.time()
    fm = forecast_metrics(F, configs)
    th = drift_and_threshold(F, configs)
    t_eval = time.time() - tic
    meta = dict(design=design_name, T=T, seed=seed, redraws=rep.n_redraws,
                t_fit=t_fit, t_eval=t_eval, **{f"t_{k}": v for k, v in F.timings.items()},
                **{f"ep_{k}": n.info["best_epoch"] for k, n in F.nets.items()})
    for r in fm + th:
        r.update(design=design_name, T=T, seed=seed)
    return fm, th, meta


def run_phase2(out: Path, design="D2", Ts=(15, 25, 40), seed=1, tuning=None):
    """One replication per T (run in parallel, one core each) for timings."""
    from joblib import Parallel, delayed
    out.mkdir(parents=True, exist_ok=True)
    tuning = tuning or Tuning.from_pilot(out.parent / "pilot" / "tuning.json")
    res = Parallel(n_jobs=len(Ts))(delayed(run_one)(design, T, seed, tuning) for T in Ts)
    pd.DataFrame(sum([r[0] for r in res], [])).to_csv(out / "single_rep_forecast.csv", index=False)
    pd.DataFrame(sum([r[1] for r in res], [])).to_csv(out / "single_rep_threshold.csv", index=False)
    pd.DataFrame([r[2] for r in res]).to_csv(out / "single_rep_meta.csv", index=False)
    return res
