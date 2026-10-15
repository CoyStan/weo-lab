# debt-sim: learning sovereign debt dynamics through the debt identity

Self-contained simulation study (no real data). Python, numpy/scipy/pandas, PyTorch (CPU),
joblib. All randomness is seeded.

```bash
pip install -r requirements.txt
python -m pytest -q tests          # identity, residuals, true quantiles, derivatives, bounds, models
python run.py phase1               # DGP, ground truth, figures  -> results/phase1
python run.py phase3 --reps 20     # main study, all designs, T in {15,25,40} -> results/phase3
python run.py phase3 --reps 100 --designs D2,D2H   # extension (resumes from checkpoints)
python run.py collect              # gather checkpoints into CSVs
python run.py report               # tables and figures (R = 20) -> results/phase3/{tables,figures}
```

The write-up is `report.md`.

## Layout

| module | contents |
|---|---|
| `debtsim/config.py` | design parameters D1, D2, D3, D2H |
| `debtsim/dgp.py` | t/Gaussian copula shocks, drivers and d-derivatives, panel simulation, true quantiles |
| `debtsim/truth.py` | Monte Carlo drift, Delta', Delta'' (common random numbers), crossing r |
| `debtsim/threshold.py` | bounds L, U on the crossing, random admissible drifts |
| `debtsim/nets.py` | Bernstein quantile network, pinball loss, PIT, sample CRPS |
| `debtsim/copula.py` | empirical rank copula sampled by whole years |
| `debtsim/train.py` | training (C2-C4 losses, derivative penalties, early stopping) |
| `debtsim/models.py` | configurations C0-C4, B1, identity projection, drift at the reference state |
| `debtsim/metrics.py`, `evaluate.py` | forecast metrics and threshold evaluation |
| `debtsim/study.py`, `report.py` | Phase 3 runner (checkpointed, parallel) and report tables/figures |

## Deviations and choices worth knowing

* **D2H** (heterogeneous fiscal space) is an extra design: 20% of countries have
  lower interest (-1pp), lower primary balances (-3.7pp) and a risk-premium response
  scaled by 0.3, so they sit stably at 0.8-1.0. Under D1-D3 the true drift slope at the
  training 85th percentile is negative, so the threshold certificate does not apply there.
* Censoring on the current state: once a country's debt exceeds 1.6 its later
  transitions are dropped; no panels are redrawn (rates in `results/phase1/data_moments.csv`
  and `results/phase3/tables/censoring.md`).
* C3/C4 run over lambda_d in {0, 2} x penalty in {0, 1, 10}; SEL picks a cell by
  validation CRPS on high-debt validation states only.
* Test sets: 10 independent 5-year continuation panels per replication, a high-debt set,
  and 3-year recursive forecasts.
* The global factor g has unconditional sd 1; drivers load on g_{t+1}.
* C1 models d_{t+1} on the change scale d_{t+1} - d_t (mapped back by adding d_t).
* Country embeddings use an L2 penalty of 1.0 x mean squared embedding; early stopping
  cannot select before 200 epochs; the selected epoch count is then refit on all
  training years.
