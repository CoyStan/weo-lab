"""Entry point: python run.py phase1 [--out results]"""
import argparse
import time
from pathlib import Path

import warnings
warnings.filterwarnings("ignore", category=RuntimeWarning)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("phase", choices=["phase1", "phase3", "collect", "report"])
    ap.add_argument("--out", default="results")
    ap.add_argument("--reps", type=int, default=20)
    ap.add_argument("--designs", default="D1,D2,D3,D2H")
    ap.add_argument("--T", default="15,25,40")
    args = ap.parse_args()
    out = Path(args.out)
    t0 = time.time()
    if args.phase == "phase1":
        from debtsim.phase1 import run_phase1
        run_phase1(out / "phase1")
    elif args.phase == "phase3":
        from debtsim.study import run_study
        run_study(out / "phase3", n_rep=args.reps, designs=args.designs.split(","),
                  Ts=tuple(int(t) for t in args.T.split(",")))
    elif args.phase == "collect":
        from debtsim.study import collect
        collect(out / "phase3")
    elif args.phase == "report":
        from debtsim.report import write_report
        write_report(out)
    print(f"{args.phase} done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
