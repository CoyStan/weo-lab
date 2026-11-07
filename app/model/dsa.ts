// Debt sustainability analysis: standardised stress tests and a debt fan chart,
// modelled on the IMF's sovereign risk and debt sustainability framework for
// market-access countries (MAC SRDSF) and the standard stress tests of its
// predecessor (the 2013 MAC DSA).
//
// Every scenario is an ordinary ScenarioConfig run through simulate(), so all
// the identities of the accounts hold in each of them. Shocks start at quarter
// `from` (the game's clock + 1): what has already happened is left alone.
//
// The shocks, as config changes:
//   growth       real growth 1 s.d. lower for two years (EM 2 pp, AE 1.5 pp): a
//                quarterly cut to the level of potential output, plus the primary
//                balance falling with it (semi-elasticity 0.25, as in the MAC DSA)
//   interest     +200 bp on the sovereign spread for the rest of the horizon (a
//                rating downgrade of that size, renewed until the horizon ends)
//   primary      primary balance 1 pp lower for two years (half its 10-year s.d.)
//   exchange     a 30% real depreciation in the first quarter (a step devaluation;
//                under a float the currency is managed for that one quarter)
//   combined     the four above at half size
//   contingent   a one-off 10% of GDP debt increase (stock-flow adjustment) plus
//                the growth shock
//
// Thresholds (MAC DSA high-risk benchmarks): emerging markets debt 70% and GFN
// 15% of GDP; advanced economies debt 85% and GFN 20%.

import { simulate } from "./economy.ts";
import { getPreset } from "./presets.ts";
import { mulberry32 } from "./random.ts";
import { generateRandomShocks } from "./shocks.ts";
import type { Decision, QuarterState, Residual, ScenarioConfig, ScheduledShock } from "./types.ts";

export type StressId = "baseline" | "growth" | "interest" | "primary" | "exchange" | "combined" | "contingent";

export const STRESS_IDS: StressId[] = ["baseline", "growth", "interest", "primary", "exchange", "combined", "contingent"];

export const STRESS_META: Record<StressId, { label: string; short: string; plain: string }> = {
  baseline: { label: "Baseline", short: "Baseline", plain: "Current policies, no new shock." },
  growth: { label: "Real GDP growth shock", short: "Growth", plain: "Growth one standard deviation lower for two years." },
  interest: { label: "Real interest rate shock", short: "Interest rate", plain: "Markets charge 200 bp more for the rest of the horizon." },
  primary: { label: "Primary balance shock", short: "Primary balance", plain: "The primary balance 1 pp of GDP weaker for two years." },
  exchange: { label: "Exchange rate shock", short: "Exchange rate", plain: "A 30% real depreciation in the first quarter." },
  combined: { label: "Combined shock", short: "Combined", plain: "All four shocks above at half size, at once." },
  contingent: { label: "Contingent liability shock", short: "Contingent liability", plain: "The state takes on debts worth 10% of GDP (say, a bank rescue), and growth falls." },
};

export type Archetype = "EM" | "AE";

export type Thresholds = { debt: number; gfn: number };

export const THRESHOLDS: Record<Archetype, Thresholds> = { EM: { debt: 70, gfn: 15 }, AE: { debt: 85, gfn: 20 } };

/** Shock sizes by archetype. */
const GROWTH_SD: Record<Archetype, number> = { EM: 2, AE: 1.5 };
const SPREAD_SHOCK = 200;
const PB_SHOCK = 1;
const FX_SHOCK = 30;
const CONTINGENT = 10;
/** Semi-elasticity of the primary balance to growth during the growth shock (MAC DSA). */
const PB_ELASTICITY = 0.25;
/** Quarters of the temporary shocks (two years). */
const SHOCK_QUARTERS = 8;

export function archetypeOf(config: ScenarioConfig): Archetype {
  return getPreset(config.presetId).archetype === "Advanced economy" ? "AE" : "EM";
}

export type StressScenario = {
  id: StressId;
  label: string;
  /** Paths from quarter from − 1 (the last outturn) to `to`, so index i is quarter from − 1 + i. */
  debt: number[];
  gfn: number[];
  ob: number[];
  interest: number[];
  peakDebt: number;
  peakDebtQuarter: number;
  peakGfn: number;
  peakGfnQuarter: number;
  /** Debt at the end of the horizon. */
  endDebt: number;
  /** Peak debt above the archetype's threshold. */
  debtFlag: boolean;
  gfnFlag: boolean;
};

export type StressTests = {
  from: number;
  to: number;
  archetype: Archetype;
  thresholds: Thresholds;
  /** Quarter labels from − 1 .. to. */
  labels: string[];
  scenarios: StressScenario[];
};

/** Add residual impulses to a config, summing with any already there for the same quarter. */
function addResiduals(config: ScenarioConfig, adds: Residual[]): ScenarioConfig {
  const byQ = new Map<number, Residual>();
  for (const r of config.residuals ?? []) byQ.set(r.quarter, { ...r });
  for (const a of adds) {
    const r = byQ.get(a.quarter) ?? { quarter: a.quarter };
    for (const k of ["gap", "infl", "pb", "debt", "pot"] as const) {
      if (a[k] !== undefined) r[k] = (r[k] ?? 0) + a[k]!;
    }
    byQ.set(a.quarter, r);
  }
  return { ...config, residuals: [...byQ.values()].sort((a, b) => a.quarter - b.quarter) };
}

function lastQuarter(config: ScenarioConfig): number {
  return simulate({ ...config, randomShocks: false }).path.length - 1;
}

function quarters(from: number, n: number, last: number): number[] {
  const out: number[] = [];
  for (let q = from; q < from + n && q <= last; q++) out.push(q);
  return out;
}

/** Growth lower by `sd` pp a year for two years: a quarterly cut to potential output, with the primary balance falling alongside. */
function growthShock(config: ScenarioConfig, from: number, last: number, sd: number): ScenarioConfig {
  return addResiduals(
    config,
    quarters(from, SHOCK_QUARTERS, last).map((q) => ({ quarter: q, pot: -sd / 4, pb: -PB_ELASTICITY * sd })),
  );
}

/** Spread higher by `bp` from `from` to the end: a downgrade of that size, renewed as each one expires. */
function interestShock(config: ScenarioConfig, from: number, last: number, bp: number): ScenarioConfig {
  const shocks: ScheduledShock[] = [];
  for (let q = from; q <= last; q += 8) shocks.push({ id: `dsa-spread-${q}`, kind: "downgrade", quarter: q, magnitude: bp / 150, source: "scheduled" });
  return { ...config, shocks: [...config.shocks, ...shocks] };
}

function primaryShock(config: ScenarioConfig, from: number, last: number, size: number): ScenarioConfig {
  return addResiduals(
    config,
    quarters(from, SHOCK_QUARTERS, last).map((q) => ({ quarter: q, pb: -size })),
  );
}

/**
 * A step real depreciation of `pct`% in quarter `from`. A floating currency is
 * managed for that one quarter so the step can happen. As in the IMF's standard
 * test, the shock isolates the balance-sheet effect: foreign-currency debt
 * revalues and prices jump once (pass-through), but the export boost to demand
 * and the extra inflation after the first quarter are held at the reference
 * path (`ref`, the same config without the depreciation), so the depreciation
 * lasts and inflation does not erode the debt it has just added.
 */
function exchangeShock(config: ScenarioConfig, from: number, last: number, pct: number, regimeBefore: QuarterState["regime"]): ScenarioConfig {
  const decisions: Decision[] = [...config.decisions];
  if (regimeBefore === "float") {
    decisions.push({ quarter: from, changes: { fxRegime: "managed" } });
    if (from + 1 <= last) decisions.push({ quarter: from + 1, changes: { fxRegime: "float" } });
  }
  const ref = simulate(config).path;
  let c: ScenarioConfig = { ...config, decisions, oneOffs: [...config.oneOffs, { id: `dsa-fx-${from}`, quarter: from, kind: "devalue", value: pct }] };
  // Quarter by quarter: take out the demand effect, then the inflation after impact.
  for (let q = from; q <= last; q++) {
    const gapDev = simulate(c).path[q].gap - ref[q].gap;
    if (Math.abs(gapDev) > 1e-6) c = addResiduals(c, [{ quarter: q, gap: -gapDev }]);
    if (q === from) continue;
    const inflDev = simulate(c).path[q].infl - ref[q].infl;
    if (Math.abs(inflDev) > 1e-6) c = addResiduals(c, [{ quarter: q, infl: -inflDev }]);
  }
  return c;
}

function contingentShock(config: ScenarioConfig, from: number, size: number): ScenarioConfig {
  return addResiduals(config, [{ quarter: from, debt: size }]);
}

/**
 * The config for one stress scenario at a given scale (1 = the standard size;
 * the combined shock uses 0.5 of each single shock).
 */
export function stressConfig(config: ScenarioConfig, from: number, id: StressId, scale = 1): ScenarioConfig {
  const base = { ...config, randomShocks: false };
  const last = lastQuarter(base);
  const f = Math.max(1, Math.min(from, last));
  const sd = GROWTH_SD[archetypeOf(config)];
  const regimeBefore = simulate(base).path[f - 1].regime;
  switch (id) {
    case "baseline":
      return base;
    case "growth":
      return growthShock(base, f, last, sd * scale);
    case "interest":
      return interestShock(base, f, last, SPREAD_SHOCK * scale);
    case "primary":
      return primaryShock(base, f, last, PB_SHOCK * scale);
    case "exchange":
      return exchangeShock(base, f, last, FX_SHOCK * scale, regimeBefore);
    case "combined": {
      const h = 0.5 * scale;
      let c = growthShock(base, f, last, sd * h);
      c = interestShock(c, f, last, SPREAD_SHOCK * h);
      c = primaryShock(c, f, last, PB_SHOCK * h);
      return exchangeShock(c, f, last, FX_SHOCK * h, regimeBefore);
    }
    case "contingent":
      return growthShock(contingentShock(base, f, CONTINGENT * scale), f, last, sd * scale);
  }
}

function peak(values: number[], offset: number): { value: number; quarter: number } {
  // values[0] is the last outturn (quarter from − 1); peaks are over the projection only.
  let best = -Infinity;
  let at = offset + 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > best) {
      best = values[i];
      at = offset + i;
    }
  }
  return { value: best, quarter: at };
}

/** Summarise one simulated path over from − 1 .. to. */
export function summarise(id: StressId, path: QuarterState[], from: number, to: number, thresholds: Thresholds): StressScenario {
  const slice = path.slice(from - 1, to + 1);
  const debt = slice.map((s) => s.debt);
  const gfn = slice.map((s) => s.gfn);
  const pd = peak(debt, from - 1);
  const pg = peak(gfn, from - 1);
  return {
    id,
    label: STRESS_META[id].label,
    debt,
    gfn,
    ob: slice.map((s) => s.ob),
    interest: slice.map((s) => s.interest),
    peakDebt: pd.value,
    peakDebtQuarter: pd.quarter,
    peakGfn: pg.value,
    peakGfnQuarter: pg.quarter,
    endDebt: debt[debt.length - 1],
    debtFlag: pd.value > thresholds.debt,
    gfnFlag: pg.value > thresholds.gfn,
  };
}

/**
 * The baseline and the six standard stress scenarios from quarter `from` to the
 * end of the horizon (or `to`, if given).
 */
export function stressTests(config: ScenarioConfig, from: number, to?: number): StressTests {
  const base = { ...config, randomShocks: false };
  const basePath = simulate(base).path;
  const last = basePath.length - 1;
  const f = Math.max(1, Math.min(from, last));
  const end = Math.max(f, Math.min(to ?? last, last));
  const archetype = archetypeOf(config);
  const thresholds = THRESHOLDS[archetype];
  const scenarios = STRESS_IDS.map((id) => summarise(id, id === "baseline" ? basePath : simulate(stressConfig(base, f, id)).path, f, end, thresholds));
  return { from: f, to: end, archetype, thresholds, labels: basePath.slice(f - 1, end + 1).map((s) => s.label), scenarios };
}

export type DebtFan = {
  from: number;
  to: number;
  /** Percentiles of debt for quarters from − 1 .. to. */
  p10: number[];
  p50: number[];
  p90: number[];
  /** Share of draws (0–1) in which debt ends the horizon higher than it starts. */
  probRising: number;
  /** p90 − p10 of debt two years ahead (or at the end, if sooner), pp of GDP: the SRDSF fan-width indicator. */
  width2y: number;
  /** The quarter the fan width refers to. */
  widthQuarter: number;
};

/** Standard normal draw from a uniform generator (Box–Muller). */
function normal(rand: () => number): number {
  const u = Math.max(1e-12, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Quarterly s.d. of the ordinary demand and budget surprises added to each draw. */
const NOISE: Record<Archetype, { gap: number; pb: number }> = { EM: { gap: 0.6, pb: 0.4 }, AE: { gap: 0.4, pb: 0.3 } };

/**
 * A probabilistic debt fan from quarter `from`: each draw adds the catalogue's
 * random shocks (the same machinery as the risk fan in fan.ts) and ordinary
 * quarterly surprises to demand and the budget, from `from` on only. Returns
 * the 10th, 50th and 90th percentiles of debt, the probability that debt ends
 * higher than it starts, and the two-year fan width. Deterministic.
 */
export function debtFan(config: ScenarioConfig, from: number, draws = 100): DebtFan {
  const base = { ...config, randomShocks: false };
  const last = lastQuarter(base);
  const f = Math.max(1, Math.min(from, last));
  const noise = NOISE[archetypeOf(config)];
  const paths: number[][] = [];
  for (let i = 0; i < draws; i++) {
    const seed = 9001 + i * 7919;
    const extra = generateRandomShocks(seed, last).filter((s) => s.quarter >= f);
    const rand = mulberry32(seed ^ 0x5f3759df);
    const res: Residual[] = [];
    for (let q = f; q <= last; q++) res.push({ quarter: q, gap: noise.gap * normal(rand), pb: noise.pb * normal(rand) });
    const c = addResiduals({ ...base, shocks: [...base.shocks, ...extra] }, res);
    paths.push(simulate(c).path.slice(f - 1, last + 1).map((s) => s.debt));
  }
  const n = paths[0].length;
  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = paths.map((p) => p[i]).sort((a, b) => a - b);
    p10.push(percentile(v, 0.1));
    p50.push(percentile(v, 0.5));
    p90.push(percentile(v, 0.9));
  }
  const rising = paths.filter((p) => p[n - 1] > p[0]).length / draws;
  const wi = Math.min(8, n - 1);
  return { from: f, to: last, p10, p50, p90, probRising: rising, width2y: p90[wi] - p10[wi], widthQuarter: f - 1 + wi };
}
