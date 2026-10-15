"""Evaluation of fitted configurations on one replication."""
from functools import lru_cache

import numpy as np

from .config import DESIGNS
from .data import W_COLS
from .metrics import evaluate, crps, interval
from .models import forecast_draws, drift_at, recursive_draws
from .data import H_REC
from .phase1 import D_UPPER, M_GRID
from .threshold import bounds
from .truth import cached_truth

B_FIXED = 1.1                 # secondary diagnostic reference point (beyond the data)
B_RULE_PCTS = (75, 85, 90, 95)
SUPPORT_RADIUS, SUPPORT_MIN_OBS, SUPPORT_MIN_COUNTRIES = 0.1, 20, 3


@lru_cache(maxsize=None)
def truth_for(name):
    tm = cached_truth(name)
    grid = np.arange(0.2, D_UPPER + 1e-9, 0.01)
    curv = np.array([tm.drift_derivs(x)[2] for x in grid])
    return tm, tm.crossing(), grid, curv


def true_M(name, b):
    _, _, grid, curv = truth_for(name)
    return float(curv[grid >= b - 1e-9].max())


def forecast_metrics(F, configs, S=500, seed=0):
    """One-step metrics on the continuation test panels and the high-debt set, and
    3-year recursive debt metrics on test origins with an observed d_{t+3}.
    Draws use common random numbers across configurations. SEL reuses its cell."""
    rep = F.rep
    sd_w = rep.train[W_COLS].std().values
    sd_all = rep.train[W_COLS + ["d_next"]].std().values
    rows = []
    origins = rep.test[rep.test["d_h3"].notna()]
    for c in configs:
        src = F.selected if c == "SEL" else c
        rng = np.random.default_rng((rep.seed, seed, 17))
        for set_name, df in (("test", rep.test), ("high", rep.high)):
            w, dn = forecast_draws(F, src, df, S, rng)
            rows.append(dict(config=c, set=set_name, **evaluate(w, dn, df, sd_w, sd_all)))
        dh = recursive_draws(F, src, origins, S, H_REC, rng)
        y = origins["d_h3"].values
        m = {"crps": float(np.mean(crps(dh, y)))}
        for lev in (0.8, 0.9):
            cov, wd = interval(dh, y, lev)
            m[f"cov{int(lev * 100)}"], m[f"width{int(lev * 100)}"] = cov.mean(), wd.mean()
        rows.append(dict(config=c, set="rec3", **m))
    return rows


def threshold_rows(F, cfg_name, b, b_label, name, r_true):
    tm = truth_for(name)[0]
    v, s, c = drift_at(F, cfg_name, b)
    tv, ts, tc = tm.drift_derivs(b)
    Mt = true_M(name, b)
    row = dict(config=cfg_name, b_label=b_label, b=b, v_hat=v, s_hat=s, c_hat=c,
               v_true=tv, s_true=ts, c_true=tc, err_v=abs(v - tv), err_s=abs(s - ts),
               cert=bool(v < 0 and s > 0), cert_true=bool(tv < 0 and ts > 0), r_true=r_true,
               M_true=Mt)
    for M, key in [(m, f"M{m:g}") for m in M_GRID] + [(Mt, "Mtrue")]:
        L, U, valid = bounds(b, v, s, M, D_UPPER)
        L, U = float(L), float(U)
        row[f"L_{key}"], row[f"U_{key}"], row[f"valid_{key}"] = L, U, bool(valid)
        row[f"coverL_{key}"] = bool(row["cert"] and L <= r_true)           # one-sided
        row[f"cover_{key}"] = bool(valid and L <= r_true <= U)            # two-sided
        row[f"width_{key}"] = U - L if valid else np.nan
    return row


def local_support(train, b):
    near = train[np.abs(train["d"] - b) <= SUPPORT_RADIUS]
    return len(near) >= SUPPORT_MIN_OBS and near["country"].nunique() >= SUPPORT_MIN_COUNTRIES


def drift_and_threshold(F, configs, suffix=""):
    rep = F.rep
    name = rep.design.name
    r_true = truth_for(name)[1]
    rows = []
    b85 = rep.quantile(0.85)
    for c in configs:
        rows.append(threshold_rows(F, c, b85, "p85", name, r_true))
        rows.append(threshold_rows(F, c, B_FIXED, "fixed", name, r_true))
        if name == "D2H":     # data-driven reference point
            chosen = None
            for q in B_RULE_PCTS:
                b = rep.quantile(q / 100)
                if not local_support(rep.train, b):
                    continue
                if drift_at(F, c, b)[1] > 0:
                    chosen = (q, b)
                    break
            if chosen is None:
                rows.append(dict(config=c, b_label="rule", b=np.nan, cert=False,
                                 rule_pct=np.nan, r_true=r_true))
            else:
                row = threshold_rows(F, c, chosen[1], "rule", name, r_true)
                row["rule_pct"] = chosen[0]
                rows.append(row)
    for r in rows:
        r["config"] = r["config"] + suffix
    return rows
