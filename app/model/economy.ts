// WEO Scenario Lab — a small open-economy model at quarterly frequency.
//
// The structure is a semi-structural "gap" model of the kind used in
// forecasting and programme work: an IS curve for the output gap, a hybrid
// Phillips curve with credibility-weighted expectations, a policy rule or a
// manual rate, an FX-pressure block that resolves into depreciation or reserve
// loss depending on the regime, standard debt dynamics with an FX valuation
// term, a current-account equation, Okun's law and a reduced-form sovereign
// spread. Everything is deterministic given the configuration, so the whole
// horizon is recomputed on every change.
//
// Expectations are partly model-consistent (QPM style): expected inflation
// mixes the target (by credibility), next quarter's inflation on the solved
// path and last quarter's; demand and the currency respond to the real and
// nominal rates expected over the coming year. The path is solved by
// Fair–Taylor iteration (see solve()).

import { getPreset, WEO_REFERENCE, WORLD_INFLATION } from "./presets.ts";
import type { Preset } from "./presets.ts";
import { generateRandomShocks, impulseAt } from "./shocks.ts";
import type { Impulse } from "./shocks.ts";
import { SHOCKS } from "./shocks.ts";
import type { Decision, Drivers, FxRegime, Policy, QuarterState, Residual, ScenarioConfig, ScheduledShock, ShockKind, SimEvent, SimResult } from "./types.ts";
import { evaluateConstraints } from "./constraints.ts";
import { accountParams, creditTarget, externalYield, moneyTarget } from "./accounts.ts";

export const HORIZON = 24;
/** Default calendar year of quarter 1. Historical episodes start earlier. */
export const START_YEAR = 2026;

// The calendar follows the scenario last simulated, so labels match whatever is on screen.
let startYear = START_YEAR;

export function setStartYear(year: number) {
  startYear = year;
}

export function getStartYear(): number {
  return startYear;
}

export function quarterLabel(t: number): string {
  if (t <= 0) return `${startYear - 1}Q4`;
  return `${startYear + Math.floor((t - 1) / 4)}Q${((t - 1) % 4) + 1}`;
}

export function quarterYear(t: number): number {
  return t <= 0 ? startYear - 1 : startYear + Math.floor((t - 1) / 4);
}

export function yearLabels(): number[] {
  return Array.from({ length: HORIZON / 4 }, (_, i) => startYear + i);
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Keeps the output gap in a plausible range without a hard wall. Inside
 * −10…+6 it passes through unchanged; beyond, it bends smoothly toward −25 and
 * +12. A hard clamp used to pin deep recessions at exactly −15, so for quarters
 * at a time no policy could move growth at all. Here every push still counts,
 * just less the deeper the slump.
 */
export function softBound(x: number): number {
  if (x < -10) return -10 - 15 * Math.tanh((-10 - x) / 15);
  if (x > 6) return 6 + 6 * Math.tanh((x - 6) / 6);
  return x;
}

export const ZERO_DRIVERS: Drivers = {
  infl: { expectations: 0, demand: 0, currency: 0, oil: 0, shocks: 0, other: 0 },
  gap: { fading: 0, monetary: 0, fiscal: 0, external: 0, commodities: 0, currency: 0, confidence: 0, shocks: 0, other: 0 },
  debt: { interestGrowth: 0, primary: 0, currency: 0, other: 0 },
};

/** Policy in force at quarter t: preset defaults plus every decision taken at or before t. */
export function policyAt(defaults: Policy, decisions: Decision[], t: number): Policy {
  let p: Policy = { ...defaults };
  for (const d of decisions) if (d.quarter <= t) p = { ...p, ...d.changes };
  return p;
}

/** FX pressure a float would resolve into depreciation this quarter, excluding the PPP drift. */
function fundamentalPressure(preset: Preset, rate: number, usRate: number, spread: number, ca: number, flows: number, controls: boolean): number {
  const P = preset.params;
  const interestDiff = rate - (usRate + spread / 100);
  const flowTerm = flows < 0 ? (controls ? 0.5 : 1) * flows : flows;
  return -P.k1 * interestDiff + (P.k2 * -ca) / 4 - P.k3 * flowTerm;
}

/**
 * Expectations are solved by Fair–Taylor iteration: each pass takes the
 * previous pass's paths for inflation, the policy rate and credibility as what
 * agents expect, until the inflation path stops moving (max |Δπ| below the
 * tolerance, or the iteration cap). The first pass uses the old
 * backward-looking rule; with the cap at 1 the model is the old one. The cap is
 * 12 rather than 8: frontier economies on a fixed nominal rate have explosive
 * backward dynamics and need 9–11 passes; most scenarios take 5–7.
 * `depth` is the Anderson-mixing memory. `predictor` is the persistence agents
 * attach to a drift of the economy away from the expected path within a pass
 * (it vanishes at the fixed point); `newsPersistence` is the same for
 * surprises (see solve()).
 */
export const SOLVER = { maxIterations: 12, tolerance: 1e-4, depth: 5, predictor: 0.9, newsPersistence: 0.8 };

/** Paths from the previous Fair–Taylor pass, indexed by quarter 0..HORIZON. */
type Guess = { buf: Float64Array; infl: Float64Array; rate: Float64Array; anchor: Float64Array };
const guessOf = (buf: Float64Array): Guess => ({ buf, infl: buf.subarray(0, HORIZON + 1), rate: buf.subarray(HORIZON + 1, 2 * (HORIZON + 1)), anchor: buf.subarray(2 * (HORIZON + 1)) });

export type SolveInfo = { iterations: number; residual: number; converged: boolean };

/** Shocks nobody can see coming: random draws and the campaign's surprises. */
export const isNews = (s: ScheduledShock) => s.source === "random" || s.id.startsWith("surprise");

export function simulate(config: ScenarioConfig): SimResult {
  return solve(config).result;
}

type Anticipated = { preset: Preset; guess: Guess; iterations: number; residual: number };
/** Recently solved anticipated paths. Keyed on everything they depend on, so a hit returns exactly what a fresh solve would. */
const anticipatedCache = new Map<string, Anticipated>();
const CACHE_SIZE = 64;

/** Forget cached expectations (for benchmarks and tests). */
export function clearExpectationsCache() {
  anticipatedCache.clear();
}

/**
 * The simulation plus how the expectations solver converged.
 *
 * Information sets: agents know the policy settings, institutions, one-off
 * actions and shocks in the configuration from the quarter each is announced
 * (see the `announced` fields in types.ts), and form model-consistent
 * expectations about them. They cannot foresee news: calibration residuals
 * (the model's unexplained part, estimated quarter by quarter) and surprise or
 * random shocks. So expectations are solved on the anticipated scenario
 * (everything but the news); the reported path then runs once with the news,
 * and agents who see the economy drift from the anticipated path expect the
 * drift to persist (decaying at `newsPersistence` a quarter). Without news,
 * that final run is simply one more Fair–Taylor pass.
 */
export function solve(config: ScenarioConfig): { result: SimResult } & SolveInfo {
  setStartYear(config.startYear ?? START_YEAR);
  const preset = getPreset(config.presetId);
  const residualAt = new Map((config.residuals ?? []).map((r) => [r.quarter, r]));
  const shocks: ScheduledShock[] = [...config.shocks, ...(config.randomShocks ? generateRandomShocks(config.seed, HORIZON) : [])].sort((a, b) => a.quarter - b.quarter);
  const decisions = [...config.decisions].sort((a, b) => a.quarter - b.quarter);
  const known = shocks.filter((s) => !isNews(s));
  const hasNews = known.length < shocks.length || residualAt.size > 0;

  // Inputs that do not depend on the solution, computed once for every pass.
  const pols: Policy[] = [];
  for (let t = 0; t <= HORIZON; t++) pols.push(policyAt(preset.defaultPolicy, decisions, t));
  const impulses = (list: ScheduledShock[], residuals: Map<number, Residual>) => {
    const imps: Impulse[] = [];
    const actives: ShockKind[][] = [];
    for (let t = 0; t <= HORIZON; t++) {
      const { impulse, active } = impulseAt(list, Math.max(1, t));
      const res = residuals.get(t);
      imps.push(res && t > 0 ? { ...impulse, gapAdd: impulse.gapAdd + (res.gap ?? 0), inflAdd: impulse.inflAdd + (res.infl ?? 0), debtOneOff: impulse.debtOneOff + (res.debt ?? 0) } : impulse);
      actives.push(t > 0 ? active : []);
    }
    return { imps, actives };
  };

  // Information sets. Agents learn of each decision, one-off and adoption in the quarter it
  // is announced (by default the quarter it takes effect: policy changes are news unless
  // pre-announced), and of non-news shocks when announced (by default at the start). For
  // each announcement date there is one anticipated scenario, solved by Fair–Taylor
  // iteration; in quarter t agents expect the path of the latest scenario announced by t.
  // So a later decision never changes quarters before it is announced.
  const annOf = (x: { quarter: number; announced?: number }) => Math.max(0, Math.min(x.quarter, x.announced ?? x.quarter));
  const annShock = (x: ScheduledShock) => Math.max(0, Math.min(x.quarter, x.announced ?? 0));
  const dates = [...new Set([0, ...decisions.map(annOf), ...config.oneOffs.map(annOf), ...(config.institutions ?? []).map(annOf), ...known.map(annShock)])].sort((a, b) => a - b);
  const noResiduals = new Map<number, Residual>();
  const solveSet = (a: number): Anticipated => {
    const last = a === dates[dates.length - 1];
    const decs = last ? decisions : decisions.filter((d) => annOf(d) <= a);
    const sh = last ? known : known.filter((x) => annShock(x) <= a);
    const c: ScenarioConfig = last ? config : { ...config, oneOffs: config.oneOffs.filter((o) => annOf(o) <= a), institutions: (config.institutions ?? []).filter((x) => annOf(x) <= a) };
    const key = JSON.stringify([config.presetId, config.startYear, config.assumptions, decs, c.oneOffs, sh, c.institutions, SOLVER]);
    let ant = anticipatedCache.get(key);
    if (ant && ant.preset !== preset) ant = undefined;
    if (!ant) {
      const ps: Policy[] = last ? pols : [];
      if (!last) for (let t = 0; t <= HORIZON; t++) ps.push(policyAt(preset.defaultPolicy, decs, t));
      const { imps, actives } = impulses(sh, noResiduals);
      ant = { preset, ...fairTaylor((guess) => pass(c, preset, sh, decs, noResiduals, ps, imps, actives, guess, SOLVER.predictor, true).guess) };
      anticipatedCache.set(key, ant);
      if (anticipatedCache.size > CACHE_SIZE) anticipatedCache.delete(anticipatedCache.keys().next().value!);
    } else {
      // Most recently used last.
      anticipatedCache.delete(key);
      anticipatedCache.set(key, ant);
    }
    return ant;
  };
  const sets = dates.map(solveSet);
  const { imps, actives } = impulses(shocks, residualAt);
  // With the iteration cap at one, expectations stay backward-looking throughout (the old model).
  const forward = SOLVER.maxIterations > 1;
  const setAt: (Guess | null)[] = [];
  for (let t = 0, k = 0; t <= HORIZON; t++) {
    while (k + 1 < dates.length && dates[k + 1] <= t) k++;
    setAt.push(forward ? sets[k].guess : null);
  }
  const surprised = hasNews || dates.length > 1;
  const final = pass(config, preset, shocks, decisions, residualAt, pols, imps, actives, (t) => setAt[t], surprised ? SOLVER.newsPersistence : SOLVER.predictor);
  const iterations = Math.max(...sets.map((x) => x.iterations));
  const residual = Math.max(...sets.map((x) => x.residual));
  return { result: final.result, iterations, residual, converged: residual < SOLVER.tolerance };
}

/**
 * Plain Fair–Taylor iteration moves news back one quarter per pass, so it is
 * accelerated with Anderson mixing over the last few passes (the expected
 * paths of inflation, the policy rate and credibility, stacked). The residual
 * is always that of a plain pass: how far the solved inflation path is from
 * the one agents expected.
 */
function fairTaylor(run: (guess: Guess | null) => Guess): { guess: Guess; iterations: number; residual: number } {
  const fs: Float64Array[] = [];
  const rs: Float64Array[] = [];
  let guess = run(null);
  let residual = Infinity;
  let iterations = 1;
  while (iterations < SOLVER.maxIterations) {
    iterations++;
    const out = run(guess);
    residual = 0;
    for (let t = 1; t <= HORIZON; t++) residual = Math.max(residual, Math.abs(out.infl[t] - guess.infl[t]));
    if (residual < SOLVER.tolerance) {
      guess = out;
      break;
    }
    const r = new Float64Array(out.buf.length);
    for (let j = 0; j < r.length; j++) r[j] = out.buf[j] - guess.buf[j];
    fs.push(out.buf);
    rs.push(r);
    if (fs.length > SOLVER.depth + 1) {
      fs.shift();
      rs.shift();
    }
    guess = iterations < SOLVER.maxIterations ? guessOf(anderson(fs, rs)) : out;
  }
  return { guess, iterations, residual };
}

/**
 * Anderson mixing: the combination of recent passes whose residuals
 * (output − input) cancel best in least squares, applied to their outputs.
 */
function anderson(fs: Float64Array[], rs: Float64Array[]): Float64Array {
  const k = fs.length;
  const last = fs[k - 1];
  if (k < 2) return last;
  const n = last.length;
  // Minimise |r_k − Σ γ_i (r_{i+1} − r_i)| over γ (normal equations, m ≤ depth).
  const m = k - 1;
  const dr: Float64Array[] = [];
  for (let i = 0; i < m; i++) {
    const d = new Float64Array(n);
    const a = rs[i + 1];
    const b = rs[i];
    for (let j = 0; j < n; j++) d[j] = a[j] - b[j];
    dr.push(d);
  }
  const dot = (a: Float64Array, b: Float64Array) => {
    let s = 0;
    for (let j = 0; j < n; j++) s += a[j] * b[j];
    return s;
  };
  const M: number[][] = [];
  const v: number[] = [];
  for (let i = 0; i < m; i++) M.push(new Array<number>(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = i; j < m; j++) M[i][j] = M[j][i] = dot(dr[i], dr[j]);
    M[i][i] = M[i][i] * (1 + 1e-10) + 1e-14;
    v.push(dot(dr[i], rs[k - 1]));
  }
  const gamma = solveSmall(M, v);
  if (!gamma || !gamma.every(Number.isFinite)) return last;
  const x = last.slice();
  for (let i = 0; i < m; i++) {
    const g = gamma[i];
    const a = fs[i + 1];
    const b = fs[i];
    for (let j = 0; j < n; j++) x[j] -= g * (a[j] - b[j]);
  }
  return x;
}

/** Gaussian elimination with partial pivoting for a tiny system; null if singular. */
function solveSmall(M: number[][], v: number[]): number[] | null {
  const m = v.length;
  const a = M.map((row, i) => [...row, v[i]]);
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-300) return null;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = c + 1; r < m; r++) {
      const f = a[r][c] / a[c][c];
      for (let j = c; j <= m; j++) a[r][j] -= f * a[c][j];
    }
  }
  const x = new Array<number>(m).fill(0);
  for (let r = m - 1; r >= 0; r--) {
    let s = a[r][m];
    for (let j = r + 1; j < m; j++) s -= a[r][j] * x[j];
    x[r] = s / a[r][r];
  }
  return x;
}

function pass(
  config: ScenarioConfig,
  preset: Preset,
  shocks: ScheduledShock[],
  decisions: Decision[],
  residualAt: Map<number, Residual>,
  pols: Policy[],
  imps: Impulse[],
  actives: ShockKind[][],
  /** The expected path agents hold in quarter t (null: backward-looking). */
  guessIn: Guess | null | ((t: number) => Guess | null),
  rho: number,
  /** Intermediate pass: only the expected paths matter, so skip labels, drivers, events and constraints. */
  lite = false,
): { result: SimResult; guess: Guess } {
  const P = preset.params;
  const A = config.assumptions;
  const events: SimEvent[] = [];
  const path: QuarterState[] = [];
  const next = guessOf(new Float64Array(3 * (HORIZON + 1)));

  const init = preset.initial;
  const policy0 = policyAt(preset.defaultPolicy, decisions, 0);
  const monthOfImports = P.importsGDP / 12;

  // Accounts at the start: trade, income and transfers reproduce the initial current
  // account; private consumption closes the national accounts.
  const AP = { ...accountParams(preset.archetype), ...preset.accounts };
  const ob0 = init.structPB + P.autoStabilizer * init.gap - (init.iEff / 100) * init.debt;
  const income0 = (externalYield(AP.nfa0, A.usRate, init.spread) / 100) * AP.nfa0;
  const M0 = P.importsGDP;
  const nx0 = init.ca - income0 - AP.transfers;
  const X0 = M0 + nx0;
  const r0gap = init.rate - init.infl - P.neutralRealRate;
  const diff0 = init.rate - A.usRate - init.spread / 100;
  const reservesPct0 = init.reserves * monthOfImports;
  const creditGov0 = AP.bankDebtShare * init.debt;

  const initial: QuarterState = {
    t: 0,
    label: quarterLabel(0),
    gap: init.gap,
    growth: init.growth,
    infl: init.infl,
    rate: init.rate,
    realRate: init.rate - init.infl,
    rer: 100,
    dE: 0,
    debt: init.debt,
    pb: init.structPB + P.autoStabilizer * init.gap,
    ob: init.structPB + P.autoStabilizer * init.gap - (init.iEff / 100) * init.debt,
    structPB: init.structPB,
    iEff: init.iEff,
    interest: (init.iEff / 100) * init.debt,
    gfn: Math.max(0, -(init.structPB + P.autoStabilizer * init.gap - (init.iEff / 100) * init.debt)) + init.debt / P.avgMaturity,
    ca: init.ca,
    reserves: init.reserves,
    reservesPct: init.reserves * monthOfImports,
    unemp: init.unemp,
    nairu: P.nairu,
    spread: init.spread,
    cred: init.cred,
    oil: A.oilPrice,
    commodity: A.commodityPrice,
    potGrowth: A.potentialGrowth,
    potLevel: 100,
    gdpLevel: 100 * (1 + init.gap / 100),
    regime: policy0.fxRegime,
    imfDisb: 0,
    pressure: 0,
    activeShocks: [],
    drivers: ZERO_DRIVERS,
    acct: {
      cons: 100 - AP.inv0 - AP.gov0 - nx0,
      inv: AP.inv0,
      gov: AP.gov0,
      exports: X0,
      imports: M0,
      nx: nx0,
      primaryIncome: income0,
      transfers: AP.transfers,
      fa: -init.ca,
      faFdi: AP.fdi,
      faPortfolio: 0,
      faOther: -init.ca - AP.fdi,
      official: 0,
      dReserves: 0,
      nfa: AP.nfa0,
      nfaValuation: 0,
      publicSI: ob0,
      privateSI: init.ca - ob0,
      saving: AP.inv0 + preset.defaultPolicy.publicInvestment + init.ca,
      money: AP.money0,
      mNfa: reservesPct0,
      creditGov: creditGov0,
      creditPrivate: AP.credit0,
      otherNet: AP.money0 - reservesPct0 - creditGov0 - AP.credit0,
    },
  };
  path.push(initial);
  next.infl[0] = initial.infl;
  next.rate[0] = initial.rate;
  next.anchor[0] = Math.min(1, init.cred / 100);

  // GDP levels for the four quarters before the start, so year-on-year growth is defined from quarter 1.
  const gdpHist: number[] = [];
  for (let k = 4; k >= 1; k--) gdpHist.push(initial.gdpLevel / Math.pow(1 + init.growth / 100, k / 4));
  gdpHist.push(initial.gdpLevel);

  // Pressure at the initial equilibrium is netted out so a baseline without shocks sits still.
  const pressure0 = fundamentalPressure(preset, init.rate, A.usRate, init.spread, init.ca, 0, policy0.capitalControls);

  let regime: FxRegime = policy0.fxRegime;
  let effReform = { labor: 0, prod: 0, trade: 0 };
  let effInvest = preset.defaultPolicy.publicInvestment;
  let restructurePenalty = 0;
  // Cumulative spending-side fiscal adjustment, pp of GDP (moves government spending in the national accounts).
  let cumSpendCut = 0;
  let programWasActive = false;
  let offTrackLogged = -99;
  let elbLogged = false;
  let reserveCrisisLogged = false;
  let inflationSpiralLogged = false;
  let marketAccessLogged = false;

  const adopted = new Map<string, number[]>();
  for (const x of config.institutions ?? []) adopted.set(x.id, [...(adopted.get(x.id) ?? []), x.quarter]);
  const sinceAdoption = (id: string, t: number) => {
    const qs = adopted.get(id);
    if (!qs) return -1;
    for (const q of qs) if (q <= t) return t - q;
    return -1;
  };
  // Powers of the drift persistence, rho^k.
  const pw = new Float64Array(HORIZON + 3);
  for (let k = 0; k < pw.length; k++) pw[k] = Math.pow(rho, k);

  const guessAt = typeof guessIn === "function" ? guessIn : () => guessIn;
  for (let t = 1; t <= HORIZON; t++) {
    const guess = guessAt(t);
    const prev = path[t - 1];
    const has = (id: string) => sinceAdoption(id, t) >= 0;
    const pol = pols[t];
    const imp = imps[t];
    const active = actives[t];
    const res = residualAt.get(t);

    for (const sh of shocks) {
      if (lite || sh.quarter !== t) continue;
      const spec = SHOCKS[sh.kind];
      events.push({ quarter: t, kind: "shock", title: spec.name, detail: `${spec.short}${sh.magnitude !== 1 ? ` × ${sh.magnitude.toFixed(1)}` : ""}${sh.source === "random" ? " (random draw)" : ""}`, severity: spec.severity });
    }
    for (const d of decisions) {
      if (lite || d.quarter !== t) continue;
      events.push({ quarter: t, kind: "decision", title: "Policy decision", detail: describeChanges(d.changes), severity: "info" });
    }

    // Regime switches happen only through an explicit decision this quarter, so a
    // peg that broke stays broken until the economist re-pegs on purpose.
    const regimeDecision = decisions.find((d) => d.quarter === t && d.changes.fxRegime !== undefined);
    if (regimeDecision && regimeDecision.changes.fxRegime && regimeDecision.changes.fxRegime !== regime) {
      regime = regimeDecision.changes.fxRegime;
      events.push({ quarter: t, kind: "regime", title: `Exchange-rate regime: ${regimeName(regime)}`, detail: regime === "peg" ? "Parity fixed at the current rate; reserves now absorb all pressure." : regime === "managed" ? `Intervention absorbs ${pol.fxIntervention}% of pressure.` : "The currency now floats.", severity: "info" });
    }

    // One-off actions this quarter.
    let devalueAdd = 0;
    let haircut = 0;
    for (const action of config.oneOffs) {
      if (action.quarter !== t) continue;
      if (action.kind === "devalue") {
        if (regime === "float") {
          events.push({ quarter: t, kind: "action", title: "Step devaluation has no effect", detail: "The currency already floats; there is no parity to move.", severity: "warn" });
        } else {
          devalueAdd += action.value;
          events.push({ quarter: t, kind: "action", title: `Step devaluation of ${action.value}%`, detail: "The parity is reset; pass-through lifts inflation and FX debt revalues.", severity: "warn" });
        }
      } else if (action.kind === "restructure") {
        haircut += action.value;
        events.push({ quarter: t, kind: "action", title: `Debt restructuring, ${action.value}% haircut`, detail: "Debt falls at once; spreads and credibility pay for it over the next two years.", severity: "warn" });
      }
    }

    // Exogenous paths.
    const oilBase = A.oilPrice * Math.pow(1 + A.oilDrift / 100, t / 4);
    const oil = oilBase * imp.oilMult;
    const commodityBase = A.commodityPrice * Math.pow(1 + A.commodityDrift / 100, t / 4);
    const commodity = commodityBase * imp.commodityMult;
    const partnerGrowth = A.partnerGrowth + imp.partnerGrowthAdd;
    const globalGrowth = A.globalGrowth + imp.globalGrowthAdd;
    const usRate = A.usRate;
    const riskPremium = A.riskPremium + imp.riskPremiumAdd;
    const oilChangeQ = (oil / prev.oil - 1) * 100;
    const oilDev = oil / WEO_REFERENCE.oilPrice - 1;
    const prevOilDev = prev.oil / WEO_REFERENCE.oilPrice - 1;
    const commodityDev = commodity / WEO_REFERENCE.commodityPrice - 1;
    const prevCommodityDev = prev.commodity / WEO_REFERENCE.commodityPrice - 1;

    // Reforms and investment phase in gradually.
    effReform = {
      labor: effReform.labor + (pol.laborReform - effReform.labor) * 0.12,
      prod: effReform.prod + (pol.productivityReform - effReform.prod) * 0.12,
      trade: effReform.trade + (pol.tradeOpenness - effReform.trade) * 0.12,
    };
    const prevInvest = effInvest;
    effInvest += (pol.publicInvestment - effInvest) * 0.25;
    const investDelta = effInvest - preset.defaultPolicy.publicInvestment;

    // Potential output.
    const debtOverhang = Math.max(0, prev.debt - 90) * 0.004;
    const hysteresis = prev.gap < -3 ? 0.05 : 0;
    const potGrowth = A.potentialGrowth + 0.3 * effReform.prod + 0.15 * effReform.trade + 0.1 * effReform.labor + (has("investment-agency") ? 0.18 : 0.12) * investDelta - debtOverhang - hysteresis;
    const potLevel = prev.potLevel * (1 + potGrowth / 400) * imp.potentialLevelMult * (1 + (res?.pot ?? 0) / 100);

    // Expectations anchored by credibility.
    // An inflation-targeting framework anchors expectations as if credibility were 10 points higher.
    // Hybrid expectations: the unanchored part mixes next quarter's inflation on the expected
    // path (weight λ) with last quarter's. The first pass is backward-looking.
    const anchor = Math.min(1, (prev.cred + (has("inflation-targeting") ? 10 : 0)) / 100);
    next.anchor[t] = anchor;
    const lambda = P.leadWeight;
    // Expected inflation for s+1 as formed in quarter s, read off the expected path.
    // Beyond the horizon there is no solved path, so expectations there are backward-looking.
    // Where this pass has already drifted from the expected path, later quarters are
    // expected to keep that drift (a predictor that vanishes at the fixed point).
    const dInfl = guess ? prev.infl - guess.infl[t - 1] : 0;
    const dRate = guess ? prev.rate - guess.rate[t - 1] : 0;
    const expInfl = (s: number) => guess!.infl[s] + pw[s - t + 1] * dInfl;
    const expectedAt = (s: number, a: number, target: number) => {
      const lead = s < HORIZON ? lambda * expInfl(s + 1) + (1 - lambda) * expInfl(s - 1) : expInfl(s - 1);
      return a * target + (1 - a) * lead;
    };
    const inflExp = guess && t < HORIZON ? anchor * pol.inflationTarget + (1 - anchor) * (lambda * expInfl(t + 1) + (1 - lambda) * prev.infl) : anchor * pol.inflationTarget + (1 - anchor) * prev.infl;
    // Demand responds to the real rate expected over the coming year, with a one-quarter lag:
    // last quarter's rate and the next three on the expected path, each net of expected inflation.
    let realRatePrev = prev.rate - inflExp;
    if (guess) {
      const now = realRatePrev;
      let s = now;
      for (let j = 1; j < 4; j++) s += t + j <= HORIZON ? guess.rate[t - 1 + j] + pw[j] * dRate - expectedAt(t + j, guess.anchor[t + j], pols[t + j].inflationTarget) : now;
      realRatePrev = s / 4;
    }

    // Structural fiscal path and the demand impulse it carries.
    const structPB = prev.structPB + pol.fiscalAdjustment / 4;
    const dStruct = structPB - prev.structPB;
    const slack = Math.max(0, -prev.gap);
    const multiplier = (P.multiplierSpend * (1 - pol.adjustmentMix / 100) + P.multiplierTax * (pol.adjustmentMix / 100)) * (1 + 0.1 * slack);
    const fiscalImpulse = -dStruct * multiplier + (effInvest - prevInvest) * P.multiplierSpend;

    // Demand from abroad, commodities, competitiveness and financial conditions.
    const externalImpulse = (P.externalDemand * (partnerGrowth - WEO_REFERENCE.partnerGrowth)) / 4;
    const oilImpulse = -P.oilImportShare * 0.5 * (oilDev - prevOilDev);
    const commodityImpulse = P.commodityExportShare * 0.4 * (commodityDev - prevCommodityDev);
    const rerImpulse = 0.03 * (prev.rer - 100);
    const riskImpulse = -0.0012 * (prev.spread - P.spreadBase);
    const controlsCost = pol.capitalControls ? -0.05 : 0;
    // High inflation erodes real incomes and raises uncertainty; it does not buy output for long.
    const inflationDrag = -0.03 * Math.max(0, prev.infl - 12);

    const monetaryImpulse = -(P.sigma / 4) * (realRatePrev - P.neutralRealRate);
    const gap = softBound(
      P.rhoGap * prev.gap + monetaryImpulse + fiscalImpulse + externalImpulse + oilImpulse + commodityImpulse + rerImpulse + riskImpulse + controlsCost + inflationDrag + imp.gapAdd,
    );
    const gapParts = {
      fading: (P.rhoGap - 1) * prev.gap,
      monetary: monetaryImpulse,
      fiscal: fiscalImpulse,
      external: externalImpulse,
      commodities: oilImpulse + commodityImpulse,
      currency: rerImpulse,
      confidence: riskImpulse + controlsCost + inflationDrag,
      shocks: imp.gapAdd,
    };

    // FX block. "Fundamentals" is the pressure from interest differentials, the current
    // account, capital flows and the financing gap, net of the initial equilibrium; the
    // PPP drift is the inflation differential. A float resolves both into depreciation;
    // a peg absorbs the fundamentals with reserves and lets the real rate appreciate.
    const flows = imp.capitalFlowAdd < 0 && has("macroprudential") ? imp.capitalFlowAdd * 0.7 : imp.capitalFlowAdd;
    // Markets price the currency off the rate they expect over the coming year (uncovered
    // interest parity, in flow form), so an announced tightening moves it on impact. The
    // backward-looking first pass uses last quarter's rate.
    let rateFx = prev.rate;
    if (guess) {
      let s = 0;
      for (let j = 0; j < 4; j++) s += t + j <= HORIZON ? guess.rate[t + j] + pw[j + 1] * dRate : guess.rate[HORIZON] + pw[HORIZON - t + 1] * dRate;
      rateFx = s / 4;
    }
    const fundamentals = fundamentalPressure(preset, rateFx, usRate, prev.spread, prev.ca, flows, pol.capitalControls) - pressure0 + (P.k3 * P.financingGap) / 4 + riskPremium / 800;
    const pppDrift = (prev.infl - WORLD_INFLATION) / 4;
    const pressure = fundamentals + pppDrift;
    let dE = 0;
    let absorbed = 0;
    let pegBreak = false;
    if (regime === "float") {
      dE = pressure;
    } else if (regime === "managed") {
      const share = prev.reserves > 0.5 ? pol.fxIntervention / 100 : 0;
      absorbed = share * fundamentals;
      dE = pressure - absorbed;
    } else {
      if (prev.reserves <= 0.5 && fundamentals > 0) {
        pegBreak = true;
        dE = 20 + pressure;
        regime = "float";
      } else {
        absorbed = fundamentals;
        dE = 0;
      }
    }
    dE += devalueAdd;
    if (A.rerConvention === "constant" && regime === "float" && !pegBreak) {
      // WEO convention: the real rate is held flat, the nominal rate moves with the inflation differential.
      dE = pppDrift + devalueAdd;
    }
    const dRer = dE - pppDrift;
    const rer = Math.max(40, prev.rer * (1 + dRer / 100));

    // Inflation: hybrid Phillips curve with pass-through from real depreciation surprises and oil.
    // The PPP-consistent part of nominal depreciation is the inflation already in the system.
    const backward = Math.max(0.2, 0.35 + 0.4 * (1 - prev.cred / 100) - (has("cb-independence") ? 0.05 : 0));
    const infl = Math.max(-3, backward * prev.infl + (1 - backward) * inflExp + P.kappa * gap + P.passthrough * dRer + P.oilInflation * oilChangeQ + imp.inflAdd);
    const inflParts = {
      expectations: (1 - backward) * (inflExp - prev.infl),
      demand: P.kappa * gap,
      currency: P.passthrough * dRer,
      oil: P.oilInflation * oilChangeQ,
      shocks: imp.inflAdd,
    };

    // Policy rate.
    let rate: number;
    if (regime === "peg") {
      // Behind a peg the rate follows the anchor's plus the spread and any pressure.
      // A central bank setting the rate by hand can hold it higher to defend the
      // parity (it cannot go lower without losing reserves faster).
      rate = usRate + prev.spread / 100 + Math.max(0, pressure) * 0.5;
      if (pol.rateMode === "manual") rate = Math.max(rate, pol.manualRate);
    } else if (pol.rateMode === "manual") {
      rate = pol.manualRate;
    } else {
      const ruleTarget = P.neutralRealRate + inflExp + pol.ruleStrength * (infl - pol.inflationTarget) + 0.5 * gap;
      rate = 0.7 * prev.rate + 0.3 * ruleTarget;
      if (ruleTarget < P.elb && !elbLogged) {
        elbLogged = true;
        events.push({ quarter: t, kind: "crisis", title: "Policy rate at the effective lower bound", detail: "The rule asks for a negative rate; monetary policy is constrained.", severity: "warn" });
      }
    }
    rate = Math.max(P.elb, rate);
    const realRate = rate - infl;

    // Programme status.
    const programActive = pol.imfProgram > 0;
    const onTrack = pol.fiscalAdjustment >= 0.5;
    const imfDisb = programActive && onTrack ? pol.imfProgram / 4 : 0;
    if (programActive && !programWasActive) {
      events.push({ quarter: t, kind: "program", title: "IMF programme approved", detail: `${pol.imfProgram}% of GDP per year, conditional on at least 0.5 pp/yr of fiscal adjustment.`, severity: "good" });
    }
    if (programActive && !onTrack && t - offTrackLogged >= 4) {
      offTrackLogged = t;
      events.push({ quarter: t, kind: "program", title: "Programme off track", detail: "Fiscal adjustment is below the 0.5 pp/yr condition; disbursements are paused.", severity: "bad" });
    }
    programWasActive = programActive;

    // Sovereign spread.
    restructurePenalty = restructurePenalty * 0.8 + (haircut > 0 ? (400 * haircut) / 30 : 0);
    const spreadTarget =
      P.spreadBase +
      4 * Math.max(0, prev.debt - P.debtThreshold) +
      60 * Math.max(0, 3 - prev.reserves) +
      25 * Math.max(0, -prev.ca - 4) +
      riskPremium +
      (100 - prev.cred) * 1.2 -
      (100 - init.cred) * 1.2 +
      restructurePenalty +
      (pol.capitalControls ? 60 : 0) -
      (programActive && onTrack ? 40 : 0) +
      15 * Math.max(0, prev.infl - pol.inflationTarget - 3) +
      (pegBreak ? 300 : 0) -
      (has("fiscal-rule") ? 30 : 0);
    const spreadBaseline = 4 * Math.max(0, init.debt - P.debtThreshold) + 60 * Math.max(0, 3 - init.reserves) + 25 * Math.max(0, -init.ca - 4) + 15 * Math.max(0, init.infl - preset.defaultPolicy.inflationTarget - 3);
    const spread = Math.max(20, 0.6 * prev.spread + 0.4 * (spreadTarget - spreadBaseline));

    // Fiscal block and debt dynamics.
    const exporterOilRevenue = P.oilImportShare < 0 ? -P.oilImportShare * 0.4 * oilDev : 0;
    const commodityRevenue = P.commodityRevenueShare * commodityDev + exporterOilRevenue;
    const taxAdmin = sinceAdoption("tax-admin", t);
    const pb = structPB + P.autoStabilizer * gap + commodityRevenue - investDelta - imp.spendingAdd + (taxAdmin >= 0 ? 0.4 * Math.min(1, (taxAdmin + 1) / 4) : 0) + (res?.pb ?? 0);
    // New debt is priced off the policy rate and spread; the stock reprices as it rolls over.
    const marketRate = rate + spread / 100 + P.termPremium;
    const marketRate0 = init.rate + init.spread / 100 + P.termPremium;
    const iEffTarget = init.iEff + P.marketDebtShare * (marketRate - marketRate0) - (has("debt-office") ? 0.3 : 0);
    const iEff = 0.95 * prev.iEff + 0.05 * iEffTarget;
    const interest = (iEff / 100) * prev.debt;
    const ob = pb - interest;
    const gdpLevel = potLevel * (1 + gap / 100);
    const growthQ = (gdpLevel / prev.gdpLevel - 1) * 400;
    const nominalGrowth = growthQ + infl;
    const debtParts = {
      interestGrowth: (prev.debt * (1 + iEff / 400)) / (1 + nominalGrowth / 400) - prev.debt,
      primary: -pb / 4,
      currency: P.fxDebtShare * prev.debt * (dE / 100),
    };
    let debt = prev.debt + debtParts.interestGrowth + debtParts.primary + debtParts.currency + imp.debtOneOff;
    if (haircut > 0) debt *= 1 - haircut / 100;
    debt = clamp(debt, 0, 400);
    const gfn = Math.max(0, -ob) + prev.debt / P.avgMaturity;

    // Current account = trade balance + primary income + transfers. Exports gain from a
    // weaker currency, partner growth and commodity (or oil) prices; imports rise with
    // demand, oil prices and government spending, and fall with a weaker currency.
    const competitiveness = 0.5 * P.exportElasticity * clamp(prev.rer - 100, -50, 80);
    const exports =
      X0 +
      competitiveness +
      P.externalDemand * 0.6 * (partnerGrowth - WEO_REFERENCE.partnerGrowth) +
      P.commodityExportShare * commodityDev +
      (P.oilImportShare < 0 ? -P.oilImportShare * oilDev : 0);
    const imports =
      M0 - competitiveness + 0.3 * (gap - init.gap) + (P.oilImportShare > 0 ? P.oilImportShare * oilDev : 0) + 0.3 * imp.spendingAdd + 0.2 * investDelta;
    const nx = exports - imports;
    // Interest and dividends on the net foreign position: deficits build liabilities, which cost income later.
    const primaryIncome = (externalYield(prev.acct.nfa, usRate, prev.spread) / 100) * prev.acct.nfa;
    const ca = nx + primaryIncome + AP.transfers;

    // Reserves.
    let reservesPct = prev.reservesPct - absorbed * P.k5 + imfDisb + (sinceAdoption("swap-line", t) === 0 ? 1.5 * monthOfImports : 0);
    if (pegBreak) reservesPct = Math.max(reservesPct, 0.5 * monthOfImports);
    reservesPct = Math.max(0.1 * monthOfImports, reservesPct);
    const reserves = reservesPct / monthOfImports;

    // ---- Accounts ----------------------------------------------------------
    // Balance of payments: reserves change by what the current account, private flows
    // and official money bring in. Private flows close the identity ("other investment");
    // under a float the exchange rate moves until they finance the current account.
    const swapInflow = sinceAdoption("swap-line", t) === 0 ? 1.5 * monthOfImports : 0;
    const dReserves = 4 * (reservesPct - prev.reservesPct);
    const official = 4 * (imfDisb + swapInflow);
    const fa = dReserves - ca - official;
    const faFdi = AP.fdi;
    const faPortfolio = 0.6 * (prev.rate - usRate - prev.spread / 100 - diff0) + 4 * flows;
    // External stock: eroded by nominal growth, built up by the current account, revalued by the exchange rate.
    const nfaValuation = AP.nfaFxShare * prev.acct.nfa * (dE / 100);
    const nfa = prev.acct.nfa / (1 + nominalGrowth / 400) + ca / 4 + nfaValuation;
    // National accounts: government spending moves with spending-side adjustment, public
    // investment and emergency spending; private investment with activity and real rates.
    cumSpendCut += dStruct * (1 - pol.adjustmentMix / 100);
    const gov = AP.gov0 - cumSpendCut + investDelta + imp.spendingAdd;
    const inv = clamp(AP.inv0 + 0.8 * (gap - init.gap) - 0.4 * (realRatePrev - P.neutralRealRate - r0gap), 5, 45);
    // Monetary survey: money demand and private credit are behavioural; other items close it.
    const money = prev.acct.money + 0.25 * (moneyTarget(AP.money0, rate, init.rate, infl, init.infl) - prev.acct.money);
    const creditPrivate = prev.acct.creditPrivate + 0.25 * (creditTarget(AP.credit0, gap, realRate - P.neutralRealRate - r0gap) - prev.acct.creditPrivate);
    const creditGov = AP.bankDebtShare * debt;
    const acct = {
      cons: 100 - inv - gov - nx,
      inv,
      gov,
      exports,
      imports,
      nx,
      primaryIncome,
      transfers: AP.transfers,
      fa,
      faFdi,
      faPortfolio,
      faOther: fa - faFdi - faPortfolio,
      official,
      dReserves,
      nfa,
      nfaValuation,
      publicSI: ob,
      privateSI: ca - ob,
      saving: inv + effInvest + ca,
      money,
      mNfa: reservesPct,
      creditGov,
      creditPrivate,
      otherNet: money - reservesPct - creditGov - creditPrivate,
    };

    // Labour market.
    const nairu = prev.nairu + (P.nairu - 0.6 * effReform.labor - prev.nairu) * 0.1;
    const unemp = Math.max(1, nairu - P.okun * (has("safety-net") ? 0.8 : 1) * gap);

    // Growth, year on year.
    gdpHist.push(gdpLevel);
    const growth = (gdpLevel / gdpHist[gdpHist.length - 5] - 1) * 100;

    // Credibility.
    let dCred = 0;
    const inflDev = Math.abs(infl - pol.inflationTarget);
    dCred += inflDev <= 1 ? 0.5 : inflDev <= 3 ? 0 : -Math.min(2, (0.6 * (inflDev - 3)) / 2);
    dCred += debt < prev.debt ? 0.3 : debt > P.debtThreshold ? -0.3 : 0;
    if (reserves < 3 && regime !== "float") dCred -= 0.5;
    if (pol.rateMode === "manual" && regime !== "peg" && infl > pol.inflationTarget + 2 && realRate < 0) dCred -= 0.8;
    if (programActive) dCred += onTrack ? 0.3 : -0.8;
    if (haircut > 0) dCred -= 20;
    if (devalueAdd > 0) dCred -= 5;
    if (pegBreak) dCred -= 15;
    dCred += imp.credAdd < 0 && has("forward-guidance") ? imp.credAdd / 2 : imp.credAdd;
    if (has("cb-independence")) dCred += 0.25;
    if (has("fiscal-rule")) dCred += 0.1;
    const cred = clamp(prev.cred + dCred, 5, 100);

    if (pegBreak) events.push({ quarter: t, kind: "crisis", title: "Peg abandoned", detail: "Reserves ran out; the currency drops 20% and floats from here.", severity: "bad" });
    if (reserves < 1 && !reserveCrisisLogged) {
      reserveCrisisLogged = true;
      events.push({ quarter: t, kind: "crisis", title: "Reserves below one month of imports", detail: "Import cover is critically low; spreads climb and the peg is at risk.", severity: "bad" });
    } else if (reserves >= 2) reserveCrisisLogged = false;
    if (infl > 20 && !inflationSpiralLogged) {
      inflationSpiralLogged = true;
      events.push({ quarter: t, kind: "crisis", title: "Inflation above 20%", detail: "Expectations are de-anchoring; credibility is draining.", severity: "bad" });
    } else if (infl < 12) inflationSpiralLogged = false;
    if (spread > 1000 && !marketAccessLogged) {
      marketAccessLogged = true;
      events.push({ quarter: t, kind: "crisis", title: "Market access lost", detail: "Spreads above 1,000 bp; refinancing at market rates is no longer realistic.", severity: "bad" });
    } else if (spread < 700) marketAccessLogged = false;

    next.infl[t] = infl;
    next.rate[t] = rate;
    path.push({
      t,
      label: lite ? "" : quarterLabel(t),
      gap,
      growth,
      infl,
      rate,
      realRate,
      rer,
      dE,
      debt,
      pb,
      ob,
      structPB,
      iEff,
      interest,
      gfn,
      ca,
      reserves,
      reservesPct,
      unemp,
      nairu,
      spread,
      cred,
      oil,
      commodity,
      potGrowth,
      potLevel,
      gdpLevel,
      regime,
      imfDisb,
      pressure,
      activeShocks: active,
      acct,
      drivers: lite
        ? ZERO_DRIVERS
        : {
            infl: { ...inflParts, other: infl - prev.infl - (inflParts.expectations + inflParts.demand + inflParts.currency + inflParts.oil + inflParts.shocks) },
            gap: {
              ...gapParts,
              other: gap - prev.gap - (gapParts.fading + gapParts.monetary + gapParts.fiscal + gapParts.external + gapParts.commodities + gapParts.currency + gapParts.confidence + gapParts.shocks),
            },
            debt: { ...debtParts, other: debt - prev.debt - (debtParts.interestGrowth + debtParts.primary + debtParts.currency) },
          },
    });
    void globalGrowth;
  }

  const breaches = lite ? [] : evaluateConstraints(path, config.constraints);
  return { result: { path, events, breaches, shocks }, guess: next };
}

/** The WEO-style reference: preset defaults, reference assumptions, no decisions, no shocks. */
export function baselineConfig(presetId: string): ScenarioConfig {
  const preset = getPreset(presetId);
  return {
    presetId,
    assumptions: { ...WEO_REFERENCE, potentialGrowth: preset.potentialGrowth },
    decisions: [],
    oneOffs: [],
    shocks: [],
    randomShocks: false,
    seed: 1,
    constraints: [],
  };
}

export function regimeName(regime: FxRegime): string {
  return regime === "float" ? "floating" : regime === "managed" ? "managed float" : "peg";
}

const LEVER_LABELS: Record<keyof Policy, string> = {
  rateMode: "Rate setting",
  manualRate: "Policy rate",
  inflationTarget: "Inflation target",
  ruleStrength: "Rule strength",
  fxRegime: "FX regime",
  fxIntervention: "FX intervention",
  fiscalAdjustment: "Fiscal adjustment",
  adjustmentMix: "Adjustment mix",
  publicInvestment: "Public investment",
  laborReform: "Labour reform",
  productivityReform: "Productivity reform",
  tradeOpenness: "Trade openness",
  imfProgram: "IMF financing",
  capitalControls: "Capital controls",
};

export function describeChanges(changes: Partial<Policy>): string {
  const parts: string[] = [];
  for (const key of Object.keys(changes) as (keyof Policy)[]) {
    const v = changes[key];
    if (v === undefined) continue;
    const label = LEVER_LABELS[key];
    if (typeof v === "boolean") parts.push(`${label} ${v ? "on" : "off"}`);
    else if (key === "fxRegime") parts.push(`${label}: ${regimeName(v as FxRegime)}`);
    else if (key === "rateMode") parts.push(`${label}: ${v === "rule" ? "policy rule" : "manual"}`);
    else parts.push(`${label} ${formatLever(key, v as number)}`);
  }
  return parts.join(" · ");
}

export function formatLever(key: keyof Policy, v: number): string {
  switch (key) {
    case "manualRate":
    case "inflationTarget":
      return `${v.toFixed(2).replace(/\.?0+$/, "")}%`;
    case "fxIntervention":
    case "adjustmentMix":
      return `${Math.round(v)}%`;
    case "fiscalAdjustment":
      return `${v > 0 ? "+" : ""}${v.toFixed(2).replace(/\.?0+$/, "")} pp/yr`;
    case "publicInvestment":
    case "imfProgram":
      return `${v.toFixed(2).replace(/\.?0+$/, "")}% GDP`;
    case "ruleStrength":
      return `×${v.toFixed(1)}`;
    default:
      return `${v}`;
  }
}
