"""Entry point: python run.py phase1 [--out results]"""
import argparse
import time
from pathlib import Path

import warnings
warnings.filterwarnings("ignore", category=RuntimeWarning)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("phase", choices=["phase1", "phase2", "pilot", "phase3", "report"])
    ap.add_argument("--out", default="results")
    ap.add_argument("--reps", type=int, default=None)
    args = ap.parse_args()
    out = Path(args.out)
    t0 = time.time()
    if args.phase == "phase1":
        from debtsim.phase1 import run_phase1
        run_phase1(out / "phase1")
    elif args.phase == "phase2":
        from debtsim.phase2 import run_phase2
        run_phase2(out / "phase2")
    elif args.phase == "pilot":
        from debtsim.pilot import run_pilot
        run_pilot(out / "pilot", n_rep=args.reps or 4)
    elif args.phase == "phase3":
        from debtsim.study import run_study
        run_study(out / "phase3", n_rep=args.reps or 20)
    print(f"{args.phase} done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
