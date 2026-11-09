// The road each push takes, read from the model's own drivers.
//
// The decomposition (decompose.ts) says how much each cause moved each goal, not by which
// road. The model does, quarter by quarter: every QuarterState carries `drivers`, the
// change in inflation split into expectations, demand, the currency, oil and shocks; the
// change in the output gap split into the policy rate, the budget, partner demand,
// commodity prices, the currency, confidence and direct shocks; the change in debt split
// into the primary balance, interest against growth and the currency.
//
// Each piece of the decomposition is switched on and off as decompose.ts does it
// (environment pieces on top of the bare economy, the player's instruments on top of the
// whole environment), and the drivers' difference is carried forward the way the model
// carries each quarter's push: inflation keeps a share b of last quarter's (the Phillips
// curve's persistence) and takes 1 − b of expected inflation, so a push that lifts
// inflation and then expectations shows up partly "through expectations"; the output gap
// keeps rhoGap of last quarter's. Only the split is used; the sizes stay the
// decomposition's (which averages two orderings, this uses one), so the arrows still add
// up to each goal's change.
//
// What the drivers do not explain is kept apart as `rough`, never spread over the roads:
// the piece's own on-minus-off change in the goal, less what the roads add up to. For
// growth that is mostly potential output (reforms, public investment, a supply shock's
// lost capacity, debt overhang); for unemployment the natural rate (labour reform); for
// debt the one-offs (a bank bailout, a restructuring's haircut). The map sends the rough
// part down the fixed road (model.ts) and marks it as approximate.
//
// Inflation, growth, unemployment and debt have drivers. The budget balance, the current
// account, reserves and spreads do not, and keep the fixed road, marked approximate.

import { simulate } from "../../model/economy";
import { getPreset } from "../../model/presets";
import type { Decision, OneOffAction, Policy, QuarterState, ScenarioConfig, ShockKind } from "../../model/types";

/** The roads a push can take. "snowball" is the debt ratio's own arithmetic: the interest bill against nominal growth. */
export type Road = "costs" | "demand" | "expect" | "fx" | "credit" | "budget" | "snowball";
/** One goal's change from one piece, by road, added up since the start (index = quarter); `rough` is what the drivers leave unexplained. */
export type GoalRoads = { roads: Partial<Record<Road, number[]>>; rough: number[] };
export type RoadMetric = "infl" | "growth" | "unemp" | "debt";
export type PieceRoads = Partial<Record<RoadMetric, GoalRoads>>;

// The player's instrument groups, as in decompose.ts (kept in step with its GROUPS).
const GROUPS: { id: string; fields: (keyof Policy)[]; oneOffs: OneOffAction["kind"][]; institutions?: boolean }[] = [
  { id: "rates", fields: ["rateMode", "manualRate", "ruleStrength", "inflationTarget"], oneOffs: [] },
  { id: "budget", fields: ["fiscalAdjustment", "adjustmentMix", "publicInvestment"], oneOffs: [] },
  { id: "currency", fields: ["fxRegime", "fxIntervention", "capitalControls"], oneOffs: ["devalue"] },
  { id: "support", fields: ["imfProgram", "laborReform", "productivityReform", "tradeOpenness"], oneOffs: ["restructure"], institutions: true },
];

type Piece = { id: string; shockIds?: string[]; residuals?: boolean; group?: (typeof GROUPS)[number]; kind?: ShockKind };

function playerDecisions(full: ScenarioConfig, start: ScenarioConfig): Decision[] {
  const inherited = new Set(start.decisions.map((d) => JSON.stringify(d)));
  return full.decisions.filter((d) => !inherited.has(JSON.stringify(d)));
}

/** The pieces present, with the same ids as the decomposition's components. */
function pieces(full: ScenarioConfig, start: ScenarioConfig): { env: Piece[]; pol: Piece[] } {
  const env: Piece[] = [];
  if ((full.residuals ?? []).length) env.push({ id: "history", residuals: true });
  for (const s of [...full.shocks].sort((a, b) => a.quarter - b.quarter)) env.push({ id: `shock:${s.id}`, shockIds: [s.id], kind: s.kind });
  let envPieces = env;
  if (env.length > 4) {
    const rest = env.slice(3);
    envPieces = [...env.slice(0, 3), { id: "other-shocks", shockIds: rest.flatMap((p) => p.shockIds ?? []), residuals: rest.some((p) => p.residuals) }];
  }
  const used = playerDecisions(full, start);
  const pol = GROUPS.filter(
    (g) =>
      used.some((d) => Object.keys(d.changes).some((k) => g.fields.includes(k as keyof Policy))) ||
      full.oneOffs.some((o) => g.oneOffs.includes(o.kind)) ||
      (g.institutions && (full.institutions ?? []).length > (start.institutions ?? []).length),
  ).map((g) => ({ id: g.id, group: g }));
  return { env: envPieces, pol };
}

/** The scenario with only the given pieces switched on (as decompose.ts builds it). */
function build(full: ScenarioConfig, start: ScenarioConfig, on: Piece[]): ScenarioConfig {
  const shockIds = new Set(on.flatMap((p) => p.shockIds ?? []));
  const groups = on.filter((p) => p.group).map((p) => p.group!);
  const fields = new Set(groups.flatMap((g) => g.fields));
  const oneOffKinds = new Set(groups.flatMap((g) => g.oneOffs));
  const decisions: Decision[] = [...start.decisions];
  for (const d of playerDecisions(full, start)) {
    const changes = Object.fromEntries(Object.entries(d.changes).filter(([k]) => fields.has(k as keyof Policy))) as Partial<Policy>;
    if (Object.keys(changes).length) decisions.push({ quarter: d.quarter, changes });
  }
  return {
    ...full,
    randomShocks: false,
    shocks: full.shocks.filter((s) => shockIds.has(s.id)),
    residuals: on.some((p) => p.residuals) ? full.residuals : [],
    decisions,
    oneOffs: full.oneOffs.filter((o) => oneOffKinds.has(o.kind)),
    institutions: groups.some((g) => g.institutions) ? full.institutions : start.institutions,
  };
}

/**
 * A direct hit on demand (a shock's own impulse to the output gap) takes the road its
 * kind names: a banking crisis through credit, a supply shock through costs, most others
 * through spending. This is a label for the shock's own impulse, not a guess at knock-ons.
 */
const DIRECT_GAP: Partial<Record<ShockKind, Road>> = {
  "oil-spike": "costs",
  "supply-shock": "costs",
  "natural-disaster": "costs",
  "food-price": "costs",
  "banking-crisis": "credit",
  "sudden-stop": "credit",
  downgrade: "credit",
  "inflow-surge": "credit",
};

type Parts = Partial<Record<Road, number>>;
const add = (o: Parts, k: Road, v: number) => (o[k] = (o[k] ?? 0) + v);
const diff = (a: Parts, b: Parts | null): Parts => {
  const out: Parts = { ...a };
  if (b) for (const k of Object.keys(b) as Road[]) add(out, k, -(b[k] ?? 0));
  return out;
};
const zeros = (h: number) => Array<number>(h + 1).fill(0);

/** Store one quarter's levels by road. */
function put(out: Partial<Record<Road, number[]>>, level: Parts, t: number, horizon: number) {
  for (const k of Object.keys(level) as Road[]) (out[k] ??= zeros(horizon))[t] = level[k]!;
}

/** The goal's own change (on minus off, or since the start for the bare economy), less what the roads explain. */
function withRough(roads: Partial<Record<Road, number[]>>, change: (t: number) => number, horizon: number): GoalRoads {
  const rough = zeros(horizon);
  for (let t = 1; t <= horizon; t++) {
    let sum = 0;
    for (const v of Object.values(roads)) sum += v![t] ?? 0;
    rough[t] = change(t) - sum;
  }
  return { roads, rough };
}

/**
 * Inflation by road. The model's Phillips curve: inflation = b × last quarter's + (1 − b) ×
 * expected + demand + currency pass-through + oil + shocks, with b falling as credibility
 * rises. So each road's level decays at b, and expected inflation (the target's pull, and
 * past inflation feeding into what people expect: second-round effects) is a road of its
 * own. The `expectations` driver is (1 − b)(expected − last), so expected's part is that
 * plus (1 − b) × last.
 */
function inflation(on: QuarterState[], off: QuarterState[] | null, cbIndependence: number | null, horizon: number): GoalRoads {
  const out: Partial<Record<Road, number[]>> = {};
  let level: Parts = {};
  const base = (t: number) => (off ? off[t].infl : on[0].infl);
  for (let t = 1; t <= horizon; t++) {
    const prev = on[t - 1];
    const b = Math.max(0.2, 0.35 + 0.4 * (1 - prev.cred / 100) - (cbIndependence !== null && cbIndependence <= t ? 0.05 : 0));
    const d = (s: QuarterState): Parts => ({ expect: s.drivers.infl.expectations, demand: s.drivers.infl.demand, fx: s.drivers.infl.currency, costs: s.drivers.infl.oil + s.drivers.infl.shocks });
    const imp = diff(d(on[t]), off ? d(off[t]) : null);
    add(imp, "expect", (1 - b) * (prev.infl - base(t - 1)));
    const next: Parts = {};
    for (const k of new Set([...Object.keys(level), ...Object.keys(imp)]) as Set<Road>) next[k] = b * (level[k] ?? 0) + (imp[k] ?? 0);
    level = next;
    put(out, level, t, horizon);
  }
  return withRough(out, (t) => on[t].infl - base(t), horizon);
}

/**
 * The output gap by road: it keeps rhoGap of last quarter's ("fading" in the drivers), so
 * each road's level decays at rhoGap. A shock's own impulse ("shocks") takes the road its
 * kind names. The economy's own drift also closes the gap it started with: that goes
 * through spending. Levels only; growth and unemployment read them below.
 */
function outputGap(on: QuarterState[], off: QuarterState[] | null, rho: number, direct: Road, horizon: number): Partial<Record<Road, number[]>> {
  const out: Partial<Record<Road, number[]>> = {};
  let level: Parts = {};
  for (let t = 1; t <= horizon; t++) {
    const d = (s: QuarterState): Parts => {
      const g = s.drivers.gap;
      const p: Parts = { demand: g.monetary + g.external, budget: g.fiscal, costs: g.commodities, fx: g.currency, credit: g.confidence };
      add(p, direct, g.shocks);
      return p;
    };
    const imp = diff(d(on[t]), off ? d(off[t]) : null);
    if (!off) add(imp, "demand", (rho - 1) * on[0].gap);
    const next: Parts = {};
    for (const k of new Set([...Object.keys(level), ...Object.keys(imp)]) as Set<Road>) next[k] = rho * (level[k] ?? 0) + (imp[k] ?? 0);
    level = next;
    put(out, level, t, horizon);
  }
  return out;
}

/**
 * Growth (year on year) by road: the output gap's roads, as the gap's change over four
 * quarters. Growth is potential growth plus that change, and potential output has no
 * drivers: reforms, public investment, a supply shock's lost capacity and debt overhang
 * all land in `rough`.
 */
function growthOf(gap: Partial<Record<Road, number[]>>, on: QuarterState[], off: QuarterState[] | null, horizon: number): GoalRoads {
  const roads: Partial<Record<Road, number[]>> = {};
  for (const [k, v] of Object.entries(gap) as [Road, number[]][]) roads[k] = v.map((x, t) => (t === 0 ? 0 : x - (v[Math.max(0, t - 4)] ?? 0)));
  return withRough(roads, (t) => on[t].growth - (off ? off[t].growth : on[0].growth), horizon);
}

/**
 * Unemployment by road: Okun's law on the output gap's roads (unemployment = natural rate
 * − okun × gap). The natural rate (labour reform) has no drivers and lands in `rough`.
 */
function unemploymentOf(gap: Partial<Record<Road, number[]>>, on: QuarterState[], off: QuarterState[] | null, okun: (t: number) => number, horizon: number): GoalRoads {
  const roads: Partial<Record<Road, number[]>> = {};
  for (const [k, v] of Object.entries(gap) as [Road, number[]][]) roads[k] = v.map((x, t) => -okun(t) * x);
  return withRough(roads, (t) => on[t].unemp - (off ? off[t].unemp : on[0].unemp), horizon);
}

/**
 * Debt by road, added up: the primary balance through the budget (taxes and spending),
 * the interest bill against nominal growth as a road of its own, foreign-currency debt
 * through the currency. One-offs (a bank bailout, a haircut) land in `rough`.
 */
function debt(on: QuarterState[], off: QuarterState[] | null, horizon: number): GoalRoads {
  const out: Partial<Record<Road, number[]>> = {};
  const level: Parts = {};
  for (let t = 1; t <= horizon; t++) {
    const d = (s: QuarterState): Parts => ({ budget: s.drivers.debt.primary, snowball: s.drivers.debt.interestGrowth, fx: s.drivers.debt.currency });
    const imp = diff(d(on[t]), off ? d(off[t]) : null);
    for (const k of Object.keys(imp) as Road[]) add(level, k, imp[k]!);
    put(out, level, t, horizon);
  }
  return withRough(out, (t) => on[t].debt - (off ? off[t].debt : on[0].debt), horizon);
}

/** Roads for every piece of the decomposition, keyed by its component id ("momentum", "shock:…", "rates"…). */
export function roads(full: ScenarioConfig, start: ScenarioConfig, horizon: number): Map<string, PieceRoads> {
  const { env, pol } = pieces(full, start);
  const P = getPreset(full.presetId).params;
  const run = (on: Piece[]) => simulate(build(full, start, on)).path;
  const adopted = (cfg: ScenarioConfig, id: string) => (cfg.institutions ?? []).filter((i) => i.id === id).reduce<number | null>((a, i) => (a === null ? i.quarter : Math.min(a, i.quarter)), null);
  const of = (on: QuarterState[], off: QuarterState[] | null, direct: Road, cfg: ScenarioConfig): PieceRoads => {
    const gap = outputGap(on, off, P.rhoGap, direct, horizon);
    const net = adopted(cfg, "safety-net");
    return {
      infl: inflation(on, off, adopted(cfg, "cb-independence"), horizon),
      growth: growthOf(gap, on, off, horizon),
      unemp: unemploymentOf(gap, on, off, (t) => P.okun * (net !== null && net <= t ? 0.8 : 1), horizon),
      debt: debt(on, off, horizon),
    };
  };
  const out = new Map<string, PieceRoads>();
  const bare = run([]);
  out.set("momentum", of(bare, null, "demand", start));
  for (const p of env) out.set(p.id, of(run([p]), bare, (p.kind && DIRECT_GAP[p.kind]) ?? "demand", start));
  if (pol.length) {
    const envOn = run(env);
    for (const p of pol) out.set(p.id, of(run([...env, p]), envOn, "demand", p.group?.institutions ? full : start));
  }
  return out;
}
