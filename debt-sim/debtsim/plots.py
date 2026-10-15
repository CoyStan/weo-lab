"""Figures."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from .config import DESIGNS
from .dgp import simulate_panel

COLORS = {"D1": "#4C72B0", "D2": "#DD8452", "D3": "#55A868", "D2H": "#8172B3",
          "D2H-group": "#937860"}


def plot_phase1(out: Path, pooled):
    fig_dir = out / "figures"
    fig_dir.mkdir(exist_ok=True)

    # 1. simulated debt paths, one panel per design
    fig, axes = plt.subplots(1, len(DESIGNS), figsize=(4 * len(DESIGNS), 3.4), sharey=True)
    for ax, (name, design) in zip(axes, DESIGNS.items()):
        df, fx, _ = simulate_panel(design, 25, 40, 50, seed=1)
        for c, g in df.groupby("country"):
            ma = fx["ma"][c] > 0
            ax.plot(g["year"], g["d"], lw=0.9, alpha=0.8,
                    color=COLORS["D2H-group"] if ma else COLORS[name])
        ax.axhline(1.1, color="grey", ls=":", lw=0.8)
        ax.set_title(f"{name}: 25 countries, 40 years")
        ax.set_xlabel("year")
    axes[0].set_ylabel("debt / GDP")
    fig.tight_layout()
    fig.savefig(fig_dir / "debt_paths.png", dpi=150)
    plt.close(fig)

    # 2. true drift curves with crossing and data quantiles
    curves = pd.read_csv(out / "truth_drift_curves.csv")
    th = pd.read_csv(out / "truth_threshold.csv")
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    for name, g in curves.groupby("design", sort=False):
        ls = "--" if name == "D2H-group" else "-"
        axes[0].plot(g["d"], g["drift"], ls=ls, color=COLORS[name], label=name)
        axes[1].plot(g["d"], g["drift_d2"], ls=ls, color=COLORS[name], label=name)
        if name in th["design"].values:
            r = th.loc[th["design"] == name, "r"].iloc[0]
            axes[0].plot([r], [0], "o", color=COLORS[name])
            axes[0].annotate(f"r={r:.2f}", (r, 0), textcoords="offset points",
                             xytext=(-8, 8 + 10 * list(COLORS).index(name)),
                             fontsize=8, color=COLORS[name])
    for name in ("D2", "D2H"):
        q95 = np.quantile(pooled[name], 0.95)
        axes[0].axvline(q95, color=COLORS[name], ls=":", lw=0.9)
    axes[0].axhline(0, color="black", lw=0.6)
    axes[0].set(xlabel="debt d", ylabel="drift  E[d' - d | d]",
                title="True drift, typical country, g = 0 (dotted: pooled 95th pct)",
                ylim=(-0.04, 0.06))
    axes[1].axhline(0, color="black", lw=0.6)
    axes[1].set(xlabel="debt d", ylabel="drift curvature", title="True drift curvature")
    axes[0].legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(fig_dir / "true_drift.png", dpi=150)
    plt.close(fig)

    # 3. pooled debt distribution
    fig, ax = plt.subplots(figsize=(6, 3.4))
    bins = np.linspace(0, 1.6, 65)
    for name, d in pooled.items():
        ax.hist(d, bins=bins, histtype="step", density=True, color=COLORS[name], label=name)
    ax.set(xlabel="debt d", ylabel="density", title="Pooled simulated debt (T = 40)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(fig_dir / "debt_distribution.png", dpi=150)
    plt.close(fig)
