"""Tables and figures for the report (Phase 4)."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

DESIGNS = ["D1", "D2", "D3", "D2H"]
TS = [15, 25, 40]
SETS = {"test": "one-step, test panels", "high": "one-step, high-debt states",
        "rec3": "3-year recursive"}
# categorical palette in fixed order (reference instance of the dataviz skill)
PAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
CFG_COLOR = {"C2": PAL[0], "C3": PAL[1], "C4_p1": PAL[2], "C1": PAL[3], "B1": PAL[6],
             "SEL": PAL[4], "C4_p10": PAL[5], "C0": "#52514e"}
INK, MUTED, GRID = "#0b0b0b", "#52514e", "#e4e3df"

plt.rcParams.update({"font.size": 9, "axes.edgecolor": MUTED, "axes.labelcolor": INK,
                     "xtick.color": MUTED, "ytick.color": MUTED, "axes.spines.top": False,
                     "axes.spines.right": False, "axes.grid": True, "grid.color": GRID,
                     "grid.linewidth": 0.6, "legend.frameon": False})


def load(out: Path):
    p = out / "phase3"
    return (pd.read_csv(p / "forecast_metrics.csv"), pd.read_csv(p / "threshold_metrics.csv"),
            pd.read_csv(p / "replication_meta.csv"))


def paired(df, a, b, metric, by, relative=True):
    """Mean paired difference a - b (in % of b if relative) with MC standard error."""
    key = ["design", "T", "rep"] + [k for k in ("set", "b_label") if k in df.columns]
    x = df[df["config"] == a].set_index(key)[metric]
    y = df[df["config"] == b].set_index(key)[metric]
    d = (x / y - 1) * 100 if relative else x - y
    d = d.dropna().reset_index()
    g = d.groupby(by)[metric]
    return pd.DataFrame({"mean": g.mean(), "se": g.std() / np.sqrt(g.count()), "n": g.count()})


def fmt(m, s, digits=1):
    if pd.isna(m):
        return ""
    star = "*" if abs(m) > 2 * s else ""
    return f"{m:+.{digits}f} ({s:.{digits}f}){star}"


def diff_table(fm, pairs, metric, sets, by=("design", "T"), relative=True, digits=1):
    """Markdown table: rows design x T, columns comparison x set."""
    cols, frames = [], []
    for a, b in pairs:
        for st in sets:
            t = paired(fm[fm["set"] == st], a, b, metric, list(by), relative)
            frames.append(t.apply(lambda r: fmt(r["mean"], r["se"], digits), axis=1)
                          .rename(f"{a} vs {b} [{st}]"))
    tab = pd.concat(frames, axis=1)
    return tab.reset_index().to_markdown(index=False)


def level_table(fm, configs, metric, st, digits=3):
    t = fm[(fm["set"] == st) & fm["config"].isin(configs)]
    p = t.groupby(["design", "T", "config"])[metric].mean().unstack("config")[configs]
    return p.round(digits).reset_index().to_markdown(index=False)


def write_tables(fm, th, meta, out: Path):
    tdir = out / "phase3" / "tables"
    tdir.mkdir(exist_ok=True)
    T = {}
    main_pairs = [("C3", "C2"), ("C4_p1", "C3"), ("C4_p10", "C3"), ("SEL", "C2")]
    for st in SETS:
        T[f"crps_main_{st}"] = diff_table(fm, main_pairs, "crps", [st])
        T[f"crps_vs_bench_{st}"] = diff_table(
            fm, [("C2", "C1"), ("C3", "C1"), ("C4_p1", "C1"), ("C2", "B1"), ("C3", "B1"),
                 ("C4_p1", "B1"), ("C1", "B1")], "crps", [st])
        T[f"crps_vs_oracle_{st}"] = diff_table(
            fm, [(c, "C0") for c in ["C1", "B1", "C2", "C3", "C4_p1", "SEL"]], "crps", [st])
    T["grid_crps"] = diff_table(fm, [(c, "C2") for c in
                                     ["C2_p1", "C2_p10", "C3", "C4_p1", "C4_p10"]],
                                "crps", ["test", "high", "rec3"], by=("design",))
    for st in ("test", "high"):
        T[f"ql95_{st}"] = diff_table(fm, main_pairs[:3] + [("C2", "B1")], "ql95", [st])
    cfgs = ["C0", "C1", "B1", "C2", "C3", "C4_p1", "C4_p10", "SEL"]
    for st in SETS:
        T[f"cov80_{st}"] = level_table(fm, cfgs, "cov80", st, 2)
        T[f"cov90_{st}"] = level_table(fm, cfgs, "cov90", st, 2)
        T[f"width80_{st}"] = level_table(fm, cfgs, "width80", st, 3)
    for m in ("pinball_drivers", "energy", "pinball_li", "pinball_ln", "pinball_p", "pinball_a"):
        for st in ("test", "high"):
            T[f"{m}_{st}"] = diff_table(fm, [("C3", "C2"), ("C4_p1", "C3"), ("C2", "C1")],
                                        m, [st])
    # selection rule
    sel = meta.groupby(["design", "T"])["selected"].value_counts(normalize=True)
    T["selection"] = sel.unstack(fill_value=0).round(2).reset_index().to_markdown(index=False)
    # censoring
    cens = meta.groupby("design")[["censored_burnin", "censored_sample",
                                   "censored_test_rows"]].mean()
    cens["share_countries"] = (meta.groupby("design")["censored_burnin"].mean()
                               + meta.groupby("design")["censored_sample"].mean()) / 25
    T["censoring"] = cens.round(3).reset_index().to_markdown(index=False)
    # derivatives at the training 85th percentile
    d85 = th[th["b_label"] == "p85"]
    for m in ("err_v", "err_s"):
        p = d85.groupby(["design", "T", "config"])[m].mean().unstack("config")
        p = p[[c for c in ["C1", "B1", "C2", "C2_p1", "C2_p10", "C3", "C4_p1", "C4_p10",
                           "SEL"] if c in p.columns]]
        T[f"deriv_{m}"] = (p * 1000).round(2).reset_index().to_markdown(index=False)
    # threshold design A: false certification at p85 (true certificate does not apply)
    thr = th.copy()
    thr["false_cert"] = thr["cert"] & ~thr["cert_true"].astype(bool)
    a = thr[(thr["b_label"] == "p85") & ~thr["config"].str.endswith("_nopool")]
    T["false_cert_p85"] = (a.groupby(["design", "T", "config"])["false_cert"].mean()
                           .unstack("config").round(2).reset_index().to_markdown(index=False))
    # fixed b = 1.1 diagnostic
    f = thr[(thr["b_label"] == "fixed") & ~thr["config"].str.endswith("_nopool")]
    cols = ["cert", "cover_M0.24", "coverL_M0.24", "cover_Mtrue", "coverL_Mtrue",
            "width_Mtrue"]
    T["fixed_b"] = (f.groupby(["design", "config"])[cols].mean().round(2).reset_index()
                    .to_markdown(index=False))
    # D2H rule
    r = thr[(thr["design"] == "D2H") & (thr["b_label"] == "rule")]
    if len(r):
        r = r.assign(chosen=r["b"].notna(),
                     correct_cert=r["cert"] & r["cert_true"].fillna(False).astype(bool))
        cols = ["chosen", "cert", "correct_cert", "coverL_M0.08", "coverL_M0.24",
                "coverL_M0.4", "coverL_Mtrue", "valid_Mtrue", "cover_Mtrue"]
        T["rule_d2h"] = (r.groupby(["T", "config"])[cols].mean().round(2).reset_index()
                         .to_markdown(index=False))
        T["rule_d2h_pct"] = (r.groupby("config")["rule_pct"].value_counts(normalize=True)
                             .unstack(fill_value=0).round(2).reset_index()
                             .to_markdown(index=False))
        lw = r[r["cert"]].assign(L_gap=lambda x: x["L_Mtrue"] - x["r_true"])
        T["rule_d2h_L"] = (lw.groupby("config")[["b", "L_M0.24", "L_Mtrue", "U_Mtrue", "r_true"]]
                           .median().round(3).reset_index().to_markdown(index=False))
    for k, v in T.items():
        (tdir / f"{k}.md").write_text(v + "\n")
    return T


def _dot_panel(ax, fm, pairs, st, design, title):
    for k, (a, b) in enumerate(pairs):
        t = paired(fm[(fm["set"] == st) & (fm["design"] == design)], a, b, "crps", ["T"])
        x = np.arange(len(t)) + (k - (len(pairs) - 1) / 2) * 0.16
        ax.errorbar(x, t["mean"], yerr=2 * t["se"], fmt="o", ms=5, lw=1.5, capsize=0,
                    color=CFG_COLOR[a], label=f"{a} vs {b}")
    ax.axhline(0, color=MUTED, lw=0.8)
    ax.set_xticks(range(len(TS)), [f"T={t}" for t in TS])
    ax.set_title(title, fontsize=9, color=INK)


def write_figures(fm, th, meta, out: Path):
    fdir = out / "phase3" / "figures"
    fdir.mkdir(exist_ok=True)
    # 1-2. CRPS gains of C3 over C2 and C4 over C3, and each vs B1
    for name, pairs in (("crps_components", [("C3", "C2"), ("C4_p1", "C3"), ("SEL", "C2")]),
                        ("crps_vs_benchmarks", [("C2", "B1"), ("C3", "B1"), ("C4_p1", "B1"),
                                                ("C1", "B1")])):
        fig, axes = plt.subplots(3, 4, figsize=(12, 7.5), sharex=True)
        for i, st in enumerate(SETS):
            for j, d in enumerate(DESIGNS):
                _dot_panel(axes[i, j], fm, pairs, st, d, f"{d} - {SETS[st]}")
                if j == 0:
                    axes[i, j].set_ylabel("debt CRPS difference, %")
        axes[0, 0].legend(fontsize=8, loc="best")
        fig.suptitle("Paired debt CRPS differences (mean, ±2 MC s.e.); below 0 = first "
                     "configuration better", fontsize=10, color=INK)
        fig.tight_layout()
        fig.savefig(fdir / f"{name}.png", dpi=150)
        plt.close(fig)
    # 3. coverage of 80% intervals
    cfgs = ["C0", "C1", "B1", "C2", "C3", "C4_p1", "SEL"]
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.6), sharey=True)
    for ax, st in zip(axes, SETS):
        t = fm[(fm["set"] == st) & fm["config"].isin(cfgs)]
        p = t.groupby(["design", "config"])["cov80"].mean().unstack("config")[cfgs]
        for k, c in enumerate(cfgs):
            ax.plot(np.arange(len(DESIGNS)) + (k - 3) * 0.1, p.loc[DESIGNS, c], "o", ms=6,
                    color=CFG_COLOR[c], label=c)
        ax.axhline(0.8, color=MUTED, lw=0.8, ls="--")
        ax.set_xticks(range(len(DESIGNS)), DESIGNS)
        ax.set_title(f"80% interval coverage - {SETS[st]}", fontsize=9, color=INK)
    axes[-1].legend(fontsize=8, ncol=2)
    fig.tight_layout()
    fig.savefig(fdir / "coverage80.png", dpi=150)
    plt.close(fig)
    # 4. tuning grid: high-debt CRPS relative to C2, by design
    cells = ["C2_p1", "C2_p10", "C3", "C4_p1", "C4_p10"]
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.4), sharey=False)
    for ax, st in zip(axes, SETS):
        for k, c in enumerate(cells):
            t = paired(fm[fm["set"] == st], c, "C2", "crps", ["design"]).reindex(DESIGNS)
            ax.errorbar(np.arange(4) + (k - 2) * 0.13, t["mean"], yerr=2 * t["se"], fmt="o",
                        ms=5, lw=1.5, color=PAL[k], label=c)
        ax.axhline(0, color=MUTED, lw=0.8)
        ax.set_xticks(range(4), DESIGNS)
        ax.set_title(f"vs C2 - {SETS[st]}", fontsize=9, color=INK)
    axes[0].set_ylabel("debt CRPS difference, %")
    axes[0].legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(fdir / "grid_crps.png", dpi=150)
    plt.close(fig)
    # 5. drift slope error at the training 85th percentile
    d85 = th[th["b_label"] == "p85"]
    cfgs = ["C1", "B1", "C2", "C3", "C4_p1", "C4_p10", "SEL"]
    fig, axes = plt.subplots(1, 4, figsize=(12, 3.2), sharey=True)
    for ax, d in zip(axes, DESIGNS):
        for k, c in enumerate(cfgs):
            t = d85[(d85["design"] == d) & (d85["config"] == c)].groupby("T")["err_s"]
            ax.errorbar(np.arange(3) + (k - 3) * 0.1, t.mean(), yerr=2 * t.sem(), fmt="o",
                        ms=5, lw=1.5, color=CFG_COLOR[c], label=c)
        ax.set_xticks(range(3), [f"T={t}" for t in TS])
        ax.set_title(f"{d}: |s_hat - s| at training p85", fontsize=9, color=INK)
    axes[0].set_ylabel("absolute slope error")
    axes[-1].legend(fontsize=7, ncol=2)
    fig.tight_layout()
    fig.savefig(fdir / "slope_error.png", dpi=150)
    plt.close(fig)
    # 6. D2H rule: estimated lower bound L (true M) vs true crossing, pooled vs no-pool
    r = th[(th["design"] == "D2H") & (th["b_label"] == "rule") & th["cert"].astype(bool)]
    if len(r):
        cfgs = [c for c in ["C0", "C2", "C3", "C4_p1", "B1", "C2_nopool", "C3_nopool",
                            "B1_nopool"] if c in set(r["config"])]
        fig, ax = plt.subplots(figsize=(8, 3.4))
        rng = np.random.default_rng(0)
        for k, c in enumerate(cfgs):
            v = r.loc[r["config"] == c, "L_Mtrue"].clip(upper=2.2)
            ax.plot(k + rng.uniform(-0.15, 0.15, len(v)), v, "o", ms=4, alpha=0.6,
                    color=CFG_COLOR.get(c.replace("_nopool", ""), MUTED))
            ax.text(k, 2.25, f"n={len(v)}", ha="center", fontsize=7, color=MUTED)
        ax.axhline(r["r_true"].iloc[0], color=INK, lw=1, ls="--")
        ax.text(len(cfgs) - 0.5, r["r_true"].iloc[0], " true r", va="center", fontsize=8)
        ax.set_xticks(range(len(cfgs)), cfgs, rotation=20)
        ax.set_ylabel("lower bound L (true M)")
        ax.set_title("D2H: certified lower bounds under the data-driven reference rule "
                     "(points above the dashed line are invalid)", fontsize=9, color=INK)
        fig.tight_layout()
        fig.savefig(fdir / "d2h_lower_bounds.png", dpi=150)
        plt.close(fig)


def write_report(out: Path):
    fm, th, meta = load(out)
    T = write_tables(fm, th, meta, out)
    write_figures(fm, th, meta, out)
    return T
