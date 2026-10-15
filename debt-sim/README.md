# debt-sim: learning sovereign debt dynamics through the debt identity

Self-contained simulation study (no real data). Python, numpy/scipy/pandas, PyTorch (CPU),
joblib. All randomness is seeded.

```bash
pip install -r requirements.txt
python -m pytest -q tests          # identity, residuals, true quantiles, derivatives, bounds, models
python run.py phase1               # DGP, ground truth, figures  -> results/phase1
python run.py pilot --reps 4       # tune lambda_d and the penalty weight once -> results/pilot
python run.py phase2               # one replication per T, end to end, timings -> results/phase2
```

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

## Deviations and choices worth knowing

* **D2H** (heterogeneous fiscal space) is an extra design: 20% of countries have
  lower interest (-1pp), lower primary balances (-3.7pp) and a risk-premium response
  scaled by 0.3, so they sit stably at 0.8-1.0. Under D1-D3 the true drift slope at the
  training 85th percentile is negative, so the threshold certificate does not apply there.
* Panels in which some country's debt exceeds 1.6 are redrawn (rate reported in
  `results/phase1/data_moments.csv`).
* The global factor g has unconditional sd 1; drivers load on g_{t+1}.
* C1 models d_{t+1} on the change scale d_{t+1} - d_t (mapped back by adding d_t).
* Country embeddings use an L2 penalty of 1.0 x mean squared embedding; early stopping
  cannot select before 200 epochs; the selected epoch count is then refit on all
  training years.
