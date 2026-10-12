// Calibration: find per-quarter residual impulses that make the model reproduce
// annual data (growth, inflation, budget balance, end-year debt) under a given
// policy path. The player then plays against the same residuals, so doing what
// actually happened reproduces history, and doing something else is an
// illustrative counterfactual.

import { HORIZON, simulate } from "../model/economy.ts";
import type { QuarterState, Residual, ScenarioConfig } from "../model/types.ts";

export type YearTarget = { year: number; growth?: number; infl?: number; balance?: number; debt?: number };

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Largest demand residual per quarter, pp of the output gap. */
const GAP_LIMIT = 6;

function quartersOf(year: number, startYear: number): number[] {
  const first = (year - startYear) * 4 + 1;
  return [first, first + 1, first + 2, first + 3].filter((q) => q >= 1 && q <= HORIZON);
}

/** Annual measures comparable to WEO data: averages of quarterly values, debt at year end. */
export function annual(path: QuarterState[], year: number, startYear: number) {
  const qs = quartersOf(year, startYear);
  const states = qs.map((q) => path[q]);
  return {
    growth: mean(states.map((s) => s.growth)),
    infl: mean(states.map((s) => s.infl)),
    balance: mean(states.map((s) => s.ob)),
    debt: states[states.length - 1].debt,
  };
}

function withResiduals(config: ScenarioConfig, residuals: Map<number, Residual>): ScenarioConfig {
  return { ...config, residuals: [...residuals.values()] };
}

/**
 * Root of an increasing function on [lo, hi], starting near x0: expand a
 * bracket, then regula falsi (Illinois). If the root is out of range, the
 * closer end is returned, so calibration degrades gracefully.
 */
function solve1D(f: (x: number) => number, x0: number, lo: number, hi: number, tol = 0.01): number {
  let a = Math.max(lo, Math.min(hi, x0));
  let fa = f(a);
  if (Math.abs(fa) < tol) return a;
  let step = 0.5;
  let b = a;
  let fb = fa;
  for (let i = 0; i < 12 && Math.sign(fb) === Math.sign(fa); i++) {
    b = Math.max(lo, Math.min(hi, fa > 0 ? b - step : b + step));
    fb = f(b);
    if (b === lo || b === hi) break;
    step *= 2;
  }
  if (Math.sign(fb) === Math.sign(fa)) return Math.abs(fb) < Math.abs(fa) ? b : a;
  let side = 0;
  for (let i = 0; i < 40; i++) {
    const c = (a * fb - b * fa) / (fb - fa);
    const fc = f(c);
    if (Math.abs(fc) < tol) return c;
    if (Math.sign(fc) === Math.sign(fb)) {
      b = c;
      fb = fc;
      if (side === -1) fa /= 2;
      side = -1;
    } else {
      a = c;
      fa = fc;
      if (side === 1) fb /= 2;
      side = 1;
    }
  }
  return (a + b) / 2;
}

/**
 * Solve year by year, in order, so each year's residuals see the previous
 * years' outcomes. Growth and inflation are solved by alternating
 * one-variable solves; the balance and debt then follow almost exactly.
 */
export function calibrate(base: ScenarioConfig, targets: YearTarget[], options: { hidden?: boolean } = {}): ScenarioConfig {
  const startYear = base.startYear ?? 2026;
  const residuals = new Map<number, Residual>();
  for (const r of base.residuals ?? []) residuals.set(r.quarter, { ...r });
  const set = (qs: number[], patch: Partial<Residual>) => {
    for (const q of qs) {
      const prev = residuals.get(q) ?? { quarter: q };
      residuals.set(q, { ...prev, ...patch, quarter: q, ...(options.hidden ? { hidden: true } : {}) });
    }
  };
  const get = (q: number) => residuals.get(q) ?? { quarter: q };

  for (const target of [...targets].sort((a, b) => a.year - b.year)) {
    const qs = quartersOf(target.year, startYear);
    if (qs.length < 4) continue;
    const measure = () => annual(simulate(withResiduals(base, residuals)).path, target.year, startYear);

    // Growth through the demand residual, inflation through the price residual, alternately until both settle.
    if (target.growth !== undefined || target.infl !== undefined) {
      for (let round = 0; round < 4; round++) {
        let moved = 0;
        if (target.growth !== undefined) {
          const goal = target.growth;
          const before = get(qs[0]).gap ?? 0;
          const g = solve1D((x) => {
            set(qs, { gap: x });
            return measure().growth - goal;
          }, before, -GAP_LIMIT, GAP_LIMIT);
          set(qs, { gap: g });
          moved = Math.max(moved, Math.abs(g - before));
          // Demand alone can't explain it: put the rest in a permanent loss (or gain) of capacity.
          if (Math.abs(measure().growth - goal) > 0.05) {
            const potBefore = get(qs[0]).pot ?? 0;
            const p = solve1D((x) => {
              set(qs, { pot: x });
              return measure().growth - goal;
            }, potBefore, -6, 6);
            set(qs, { pot: p });
            moved = Math.max(moved, Math.abs(p - potBefore));
          }
        }
        if (target.infl !== undefined) {
          const goal = target.infl;
          const before = get(qs[0]).infl ?? 0;
          const i = solve1D((x) => {
            set(qs, { infl: x });
            return measure().infl - goal;
          }, before, -30, 30);
          set(qs, { infl: i });
          moved = Math.max(moved, Math.abs(i - before));
        }
        if (moved < 0.01) break;
      }
    }

    // Budget balance: a primary-balance residual, which moves the balance almost one for one.
    if (target.balance !== undefined) {
      let pb = get(qs[0]).pb ?? 0;
      for (let iter = 0; iter < 4; iter++) {
        set(qs, { pb });
        const err = measure().balance - target.balance;
        if (Math.abs(err) < 0.02) break;
        pb -= err;
      }
      set(qs, { pb });
    }

    // End-year debt: a stock-flow adjustment in the year's last quarter.
    if (target.debt !== undefined) {
      const last = qs[qs.length - 1];
      let extra = get(last).debt ?? 0;
      for (let iter = 0; iter < 3; iter++) {
        residuals.set(last, { ...get(last), debt: extra, ...(options.hidden ? { hidden: true } : {}) });
        const err = measure().debt - target.debt;
        if (Math.abs(err) < 0.05) break;
        extra -= err;
      }
    }
  }
  return withResiduals(base, residuals);
}
