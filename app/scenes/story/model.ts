// The causal map's data: who pushed which goal, through which channel, by how
// much, quarter by quarter. Pure (no React), built on the game's own
// explanation logic: decompose.ts splits each goal's path into momentum, each
// shock and each policy instrument (the sizes); routes.ts reads the model's own
// drivers to say by which road each piece travelled (the channels), and keeps
// apart what the drivers leave unexplained; framework.ts channels() says
// whether a channel is blocked; the staff forecast against the "had you changed
// nothing" path gives the player's own effect over time.

import type { Component, Decomposition } from "../../game/decompose";
import type { Channel } from "../../game/framework";
import type { Mission } from "../../game/missions";
import { SHOCKS } from "../../model/shocks";
import type { Policy, QuarterState, ScenarioConfig, ShockKind } from "../../model/types";
import type { GoalRoads, PieceRoads, RoadMetric } from "./routes";

export type MetricId = "infl" | "growth" | "debt" | "unemp" | "ob" | "ca" | "reserves" | "spread";
export type ChannelId = "costs" | "demand" | "expect" | "fx" | "credit" | "budget" | "snowball";
export type CauseKind = "shock" | "history" | "momentum" | "lever";
export type IconId =
  | ShockKind
  | "history"
  | "drift"
  | "rates"
  | "budget"
  | "currency"
  | "support"
  | "demand"
  | "costs"
  | "expect"
  | "fx"
  | "credit"
  | "purse"
  | "snowball"
  | "infl"
  | "growth"
  | "debt"
  | "unemp"
  | "ob"
  | "ca"
  | "reserves"
  | "spread";

export type Cause = {
  id: string;
  kind: CauseKind;
  title: string;
  sub: string;
  note?: string;
  icon: IconId;
  /** The goal a shock's own description names ("Inflation +2 pp"): its card adds the total with knock-ons, so the two numbers reconcile. */
  names?: MetricId;
  /** A shock's first quarter. */
  from?: string;
};
export type Flow = {
  id: string;
  cause: string;
  channel: ChannelId;
  metric: MetricId;
  /** Contribution to the change since the start, by quarter. */
  values: number[];
  /**
   * The road is the fixed table's, not the model's drivers': the goal has no drivers
   * (budget balance, current account, reserves, spreads), or most of this push is what the
   * drivers leave unexplained (potential output, the natural rate, a one-off).
   */
  approx: boolean;
};
export type Outcome = {
  metric: MetricId;
  label: string;
  unit: string;
  digits: number;
  /** Staff forecast under current policy (actual before the clock). */
  path: number[];
  /** The same had the player changed nothing, or null if nothing changed. */
  ghost: number[] | null;
  goal: string | null;
  /** +1 if higher is better, −1 if lower is better, at quarter t. */
  good: (t: number) => 1 | -1;
};
export type ChannelMeta = { id: ChannelId; title: string; sub: string; icon: IconId };

export type Travel = {
  /** "Your rate hike": what the player changed, in a few words. */
  lever: string;
  /** Effect of everything the player changed, forecast minus had-you-changed-nothing, by quarter. */
  demand: number[];
  diffs: { metric: MetricId; values: number[] }[];
  sentence: string;
  /** The same in two steps, for a phone: what moves at once, and the main goal at the goal date. */
  short: string;
  /** The two steps alone, without the lever's name ("spending −0.4 pp in 2027Q1 → public debt −7.6 pp by 2029Q4"). */
  steps: string;
};

export type Story = {
  clock: number;
  end: number;
  /** First quarter the time strip shows. */
  first: number;
  labels: string[];
  causes: Cause[];
  flows: Flow[];
  outcomes: Outcome[];
  travel: Travel | null;
};

export const CHANNELS: ChannelMeta[] = [
  // Oil and commodity prices in the model's drivers (for an exporter, what its goods fetch), food and supply shocks.
  { id: "costs", title: "Costs", sub: "food, fuel, commodities", icon: "costs" },
  { id: "demand", title: "Spending", sub: "people and firms", icon: "demand" },
  { id: "expect", title: "Expectations", sub: "of future prices", icon: "expect" },
  { id: "fx", title: "Exchange rate", sub: "the currency", icon: "fx" },
  { id: "credit", title: "Credit and trust", sub: "loans, spreads", icon: "credit" },
  { id: "budget", title: "The budget", sub: "taxes, spending", icon: "purse" },
  // Debt's own arithmetic, apart from the budget: the interest bill grows the debt, nominal growth shrinks its ratio.
  { id: "snowball", title: "Debt snowball", sub: "interest vs growth", icon: "snowball" },
];
export const CHANNEL_ORDER = CHANNELS.map((c) => c.id);

const METRICS: Record<MetricId, { label: string; unit: string; digits: number; good: 1 | -1; /** One "unit of push" for arrow widths. */ ref: number }> = {
  infl: { label: "Inflation", unit: "%", digits: 1, good: -1, ref: 1 },
  growth: { label: "Growth", unit: "%", digits: 1, good: 1, ref: 1 },
  debt: { label: "Public debt", unit: "% GDP", digits: 1, good: -1, ref: 2 },
  unemp: { label: "Unemployment", unit: "%", digits: 1, good: -1, ref: 0.5 },
  ob: { label: "Budget balance", unit: "% GDP", digits: 1, good: 1, ref: 1 },
  ca: { label: "Current account", unit: "% GDP", digits: 1, good: 1, ref: 1 },
  reserves: { label: "Reserves", unit: "months", digits: 1, good: 1, ref: 0.5 },
  spread: { label: "Bond spread", unit: "bp", digits: 0, good: -1, ref: 50 },
};
export const metricRef = (m: MetricId) => METRICS[m].ref;
/** Units of a push on a metric: pp for rates and ratios, bp for spreads, months for reserves. */
export const pushUnit = (m: MetricId) => (m === "spread" ? " bp" : m === "reserves" ? " mo" : "");
/** The same, spelled out for sentences: "+2.4 pp", "+30 bp", "−0.5 mo". */
export const unitWord = (m: MetricId) => (m === "spread" ? " bp" : m === "reserves" ? " mo" : " pp");
export const metricLabel = (m: MetricId) => METRICS[m].label;
/** A push big enough to be worth a sentence: 0.05 pp (5 bp on a spread). */
export const matters = (v: number, m: MetricId) => Math.abs(v) >= (m === "spread" ? 5 : 0.05);

// The fixed road. Used for goals the model has no drivers for (budget balance, current
// account, reserves, spreads), and for the part of a push the drivers leave unexplained
// (potential output, the natural rate, one-offs). The map marks these roads as rough.
// Everywhere else the road comes from the model's drivers (routes.ts).
type Route = Partial<Record<MetricId, ChannelId>>;
const DEFAULT_ROUTE: Record<MetricId, ChannelId> = { infl: "demand", growth: "demand", unemp: "demand", debt: "budget", ob: "budget", ca: "fx", reserves: "fx", spread: "credit" };
const ROUTES: Record<string, Route> = {
  momentum: { infl: "expect" },
  history: { infl: "costs" },
  rates: { ca: "demand", debt: "snowball" },
  // Public investment's lasting effect is on capacity, paid for from the budget.
  budget: { growth: "budget", unemp: "budget", ca: "demand", reserves: "budget", spread: "budget" },
  currency: { infl: "fx", growth: "fx", unemp: "fx", debt: "fx", ob: "fx", ca: "fx", reserves: "fx", spread: "fx" },
  // What the drivers leave of reforms is capacity, what people and firms can produce: no road of its own, so
  // it goes the way of people and firms (spending), marked rough.
  support: { infl: "expect" },
  "food-price": { infl: "costs" },
  "oil-spike": { infl: "costs", growth: "costs", unemp: "costs" },
  "supply-shock": { infl: "costs", growth: "costs", unemp: "costs" },
  "natural-disaster": { infl: "costs", growth: "costs", unemp: "costs" },
  pandemic: { infl: "costs" },
  "global-recession": { ca: "demand" },
  "commodity-bust": { infl: "fx" },
  "sudden-stop": { infl: "fx", growth: "credit", unemp: "credit", debt: "fx" },
  downgrade: { infl: "fx", growth: "credit", unemp: "credit" },
  "inflow-surge": { infl: "fx", growth: "credit", unemp: "credit", debt: "fx" },
  "banking-crisis": { growth: "credit", unemp: "credit" },
};
const route = (key: string, m: MetricId): ChannelId => ROUTES[key]?.[m] ?? DEFAULT_ROUTE[m];

const num = (v: number, d = 2) => String(Number(v.toFixed(d)));
const fmt = (v: number, d = 1) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : v.toFixed(d));
export const signed = (v: number, d = 1) => {
  const s = fmt(Math.abs(v), d);
  return s === (0).toFixed(d) ? s : `${v > 0 ? "+" : "−"}${s}`;
};

const POLICY_ICON: Record<string, IconId> = { rates: "rates", budget: "budget", currency: "currency", support: "support" };

/** Shocks whose one-line description names a goal the map tracks (SHOCKS[kind].short, first part). */
const SHOCK_NAMES: Partial<Record<ShockKind, MetricId>> = { "food-price": "infl" };

/** What the player changed in one instrument group, in a few words. */
function leverText(group: string, p: Policy, u: Policy, config: ScenarioConfig, start: ScenarioConfig): { title: string; sub: string } {
  if (group === "rates") {
    if (p.rateMode === "manual" && u.rateMode === "manual" && p.manualRate !== u.manualRate) return { title: p.manualRate > u.manualRate ? "Your rate hike" : "Your rate cut", sub: `${num(u.manualRate)}% → ${num(p.manualRate)}%` };
    if (p.rateMode !== u.rateMode) return { title: "Your rate", sub: p.rateMode === "manual" ? `set by hand: ${num(p.manualRate)}%` : "back on the rule" };
    if (p.ruleStrength !== u.ruleStrength) return { title: p.ruleStrength > u.ruleStrength ? "Your firmer rule" : "Your softer rule", sub: `×${num(u.ruleStrength, 1)} → ×${num(p.ruleStrength, 1)}` };
    if (p.inflationTarget !== u.inflationTarget) return { title: "Your new target", sub: `${num(u.inflationTarget)}% → ${num(p.inflationTarget)}%` };
    return { title: "Your rate moves", sub: "earlier quarters" };
  }
  if (group === "budget") {
    const bits: string[] = [];
    if (p.fiscalAdjustment !== u.fiscalAdjustment) bits.push(`${signed(p.fiscalAdjustment - u.fiscalAdjustment, 1)} pp a year`);
    if (p.publicInvestment !== u.publicInvestment) bits.push(`investment ${num(u.publicInvestment, 1)} → ${num(p.publicInvestment, 1)}%`);
    const tighter = p.fiscalAdjustment > u.fiscalAdjustment;
    return { title: p.fiscalAdjustment === u.fiscalAdjustment ? "Your budget" : tighter ? "Your budget squeeze" : "Your budget boost", sub: bits.join(", ") || "earlier quarters" };
  }
  if (group === "currency") {
    const bits: string[] = [];
    if (p.fxRegime !== u.fxRegime) bits.push(`${u.fxRegime} → ${p.fxRegime}`);
    if (p.fxIntervention !== u.fxIntervention) bits.push(`intervention ${num(p.fxIntervention, 0)}%`);
    if (p.capitalControls !== u.capitalControls) bits.push(p.capitalControls ? "capital controls" : "controls lifted");
    const dev = config.oneOffs.filter((o) => o.kind === "devalue").length > start.oneOffs.filter((o) => o.kind === "devalue").length;
    if (dev) bits.push("devaluation");
    return { title: "Your currency moves", sub: bits.join(", ") || "earlier quarters" };
  }
  const bits: string[] = [];
  if (p.imfProgram !== u.imfProgram) bits.push(`IMF ${num(p.imfProgram, 1)}% GDP`);
  if (p.laborReform !== u.laborReform || p.productivityReform !== u.productivityReform || p.tradeOpenness !== u.tradeOpenness) bits.push("reforms");
  if ((config.institutions ?? []).length > (start.institutions ?? []).length) bits.push("institutions");
  if (config.oneOffs.some((o) => o.kind === "restructure")) bits.push("debt deal");
  return { title: "Your reforms and support", sub: bits.join(", ") || "earlier quarters" };
}

function goalText(mission: Mission | undefined, m: MetricId, unit: string, labels: string[]): string | null {
  const o = mission?.objectives.find((x) => x.metric === m && !x.bonus) ?? mission?.objectives.find((x) => x.metric === m);
  if (!o) return null;
  const n = num(o.threshold, 1).replace("-", "−");
  const v = `${o.op === "<=" ? "≤" : "≥"} ${n}${unit === "%" ? "%" : unit === "% GDP" ? "% of GDP" : ` ${unit}`}`;
  return o.when === "end" ? `goal ${v} by ${labels[mission!.quarters] ?? "the end"}` : o.when === "every" ? `goal ${v} every quarter` : `goal ${v}`;
}

function goalDir(mission: Mission | undefined, m: MetricId): 1 | -1 | null {
  const o = mission?.objectives.find((x) => x.metric === m && !x.bonus) ?? mission?.objectives.find((x) => x.metric === m);
  return o ? (o.op === "<=" ? -1 : 1) : null;
}

export type StoryInput = {
  config: ScenarioConfig;
  start: ScenarioConfig;
  mission: Mission | undefined;
  clock: number;
  end: number;
  forecast: QuarterState[];
  untouched: QuarterState[];
  touched: boolean;
  policy: Policy;
  policyUntouched: Policy;
  decomp: Decomposition;
  chans: Channel[];
  /** Each piece's push by road, from the model's drivers (routes.ts); null to use the fixed table everywhere. */
  roads: Map<string, PieceRoads> | null;
};

export function buildStory(input: StoryInput): Story {
  const { config, start, mission, clock, end, forecast, untouched, touched, policy, policyUntouched, decomp, chans, roads: roadsByPiece } = input;
  const labels = forecast.map((s) => s.label);
  const first = Math.max(1, clock);

  // Goals: the mission's objectives that the decomposition covers, padded to three.
  const keys: MetricId[] = [];
  for (const o of mission?.objectives ?? []) if (o.metric in METRICS && !keys.includes(o.metric as MetricId)) keys.push(o.metric as MetricId);
  for (const k of ["infl", "growth", "debt"] as MetricId[]) if (keys.length < 3 && !keys.includes(k)) keys.push(k);
  const metrics = keys.slice(0, 3);
  const target = policy.inflationTarget;

  const outcomes: Outcome[] = metrics.map((m) => {
    const meta = METRICS[m];
    const path = forecast.slice(0, end + 1).map((s) => s[m]);
    return {
      metric: m,
      label: meta.label,
      unit: meta.unit,
      digits: meta.digits,
      path,
      ghost: touched ? untouched.slice(0, end + 1).map((s) => s[m]) : null,
      goal: goalText(mission, m, meta.unit, labels),
      // The mission's own goal says which way is better (inflation "≤ 3.8%": down helps); otherwise the usual direction,
      // and for inflation, toward the target.
      good: goalDir(mission, m) ? () => goalDir(mission, m)! : m === "infl" ? (t: number) => ((path[t] ?? path[path.length - 1]) > target ? -1 : 1) : () => meta.good,
    };
  });

  // Causes and their flows, from the decomposition; each flow on the road(s) the model's drivers say it took.
  const causes: Cause[] = [];
  const flows: Flow[] = [];
  const rateChannel = chans.find((c) => c.id === "rates");
  const addFlows = (cause: string, routeKey: string, comp: Component) => {
    for (const m of metrics) {
      const values = comp.values[m] ?? [];
      if (!values.some((v) => Math.abs(v) / METRICS[m].ref >= 0.02)) continue;
      const fixed = route(routeKey, m);
      const goalRoads = roadsByPiece?.get(comp.id)?.[m as RoadMetric];
      const split = goalRoads ? splitByRoad(values, goalRoads, fixed, end) : null;
      if (split) for (const r of split) flows.push({ id: `${cause}|${m}|${r.channel}`, cause, channel: r.channel, metric: m, values: r.values, approx: r.approx });
      else flows.push({ id: `${cause}|${m}|${fixed}`, cause, channel: fixed, metric: m, values, approx: true });
    }
  };
  for (const comp of decomp.components) {
    if (comp.kind === "momentum") {
      causes.push({ id: "momentum", kind: "momentum", title: "Its own drift", sub: "what would happen anyway", icon: "drift" });
      addFlows("momentum", "momentum", comp);
    } else if (comp.kind === "environment") {
      const shockId = comp.id.startsWith("shock:") ? comp.id.slice(6) : null;
      const s = shockId ? config.shocks.find((x) => x.id === shockId) : null;
      if (s) {
        const spec = SHOCKS[s.kind];
        const size = Math.abs(s.magnitude - 1) < 0.01 ? spec.short.split(",")[0] : `${num(s.magnitude, 1)}× the usual size`;
        const title = s.id === "surprise-confidence" ? "Markets lose trust" : spec.name;
        const names = Math.abs(s.magnitude - 1) < 0.01 ? SHOCK_NAMES[s.kind] : undefined;
        causes.push({ id: comp.id, kind: "shock", title, sub: size, from: labels[s.quarter] ?? "", icon: s.kind, names });
        addFlows(comp.id, s.kind, comp);
      } else {
        const history = comp.id === "history";
        causes.push({ id: comp.id, kind: history ? "history" : "shock", title: history ? (comp.label.startsWith("What") ? "What really hit" : "The WEO trend") : "Other shocks", sub: history ? "surprises in the data" : "smaller shocks together", icon: "history" });
        addFlows(comp.id, "history", comp);
      }
    } else {
      const t = leverText(comp.id, policy, policyUntouched, config, start);
      const note = comp.id === "rates" && rateChannel?.status === "blocked" ? "the peg overrides it" : undefined;
      causes.push({ id: comp.id, kind: "lever", title: t.title, sub: t.sub, note, icon: POLICY_ICON[comp.id] ?? "support" });
      addFlows(comp.id, comp.id, comp);
    }
  }

  // The player's own effect over time: forecast against "had you changed nothing", as the strip shows it.
  let travel: Travel | null = null;
  if (touched) {
    const levers = causes.filter((c) => c.kind === "lever");
    const lever = levers.length === 1 ? levers[0].title : levers.length ? "Your moves" : "Your earlier moves";
    const demand = forecast.slice(0, end + 1).map((s, t) => s.gap - untouched[t].gap);
    const diffs = metrics.slice(0, 2).map((m) => ({ metric: m, values: forecast.slice(0, end + 1).map((s, t) => s[m] - untouched[t][m]) }));
    const main = diffs[0];
    const now = Math.min(end, clock + 1);
    const mid = Math.min(end, clock + 4);
    const name = (m: MetricId) => METRICS[m].label.toLowerCase();
    const amount = (v: number, m: MetricId) => `${signed(v, Math.abs(v) < 0.095 && Math.abs(v) >= 0.005 ? 2 : 1)}${unitWord(m)}`;
    // First what moves at once (growth, or spending when growth is not on the strip), then the main goal as it builds.
    const fast = diffs.find((d) => d.metric === "growth");
    const parts: string[] = [];
    if (fast && fast !== main) parts.push(`${name(fast.metric)} ${amount(fast.values[now], fast.metric)} in ${labels[now]}`);
    else if (!fast) parts.push(`spending ${amount(demand[now] ?? 0, "growth")} in ${labels[now]}`);
    if (fast === main) parts.push(`${name(main.metric)} ${amount(main.values[now], main.metric)} in ${labels[now]}`);
    if (mid < end && mid > now) parts.push(`${fast === main ? "" : `${name(main.metric)} `}${amount(main.values[mid], main.metric)} by ${labels[mid]}`);
    if (end > now) parts.push(`${parts.length > 1 || fast === main ? "" : `${name(main.metric)} `}${amount(main.values[end], main.metric)} by ${labels[end]}`);
    const shortParts = [parts[0]];
    if (end > now && (fast !== main || parts.length > 1)) shortParts.push(`${fast === main ? "" : `${name(main.metric)} `}${amount(main.values[end], main.metric)} by ${labels[end]}`);
    travel = { lever, demand, diffs, sentence: `${lever}: ${parts.join(" → ")}`, short: `${lever}: ${shortParts.join(" → ")}`, steps: shortParts.join(" → ") };
  }

  return { clock, end, first, labels, causes, flows, outcomes, travel };
}

/**
 * Split a piece's push on a goal between at most two roads, by the model's drivers
 * (routes.ts). The sizes stay the decomposition's: each quarter's value is shared among
 * the roads that push the same way, so the parts add up to it exactly. What the drivers
 * leave unexplained (`rough`) goes down the fixed road; a road whose push is mostly that
 * is marked approximate. Returns null where nothing pushes.
 */
function splitByRoad(values: number[], goal: GoalRoads, fixed: ChannelId, end: number): { channel: ChannelId; values: number[]; approx: boolean }[] | null {
  const weights = (t: number) => {
    const w: Partial<Record<ChannelId, number>> = {};
    for (const [k, v] of Object.entries(goal.roads) as [ChannelId, number[]][]) w[k] = (w[k] ?? 0) + (v[t] ?? 0);
    w[fixed] = (w[fixed] ?? 0) + (goal.rough[t] ?? 0);
    return w;
  };
  const T = Math.min(end, values.length - 1);
  let peak = 0;
  for (let t = 1; t <= T; t++) if (Math.abs(values[t] ?? 0) > Math.abs(values[peak] ?? 0)) peak = t;
  const vmax = Math.abs(values[peak] ?? 0);
  if (vmax < 1e-9) return null;
  // The roads that carry at least a quarter of the push at some quarter shown; two at most.
  const reach = new Map<ChannelId, number>();
  for (let t = 1; t <= T; t++) {
    const v = values[t] ?? 0;
    const sign = v >= 0 ? 1 : -1;
    const pos = (Object.entries(weights(t)) as [ChannelId, number][]).filter(([, x]) => x * sign > 0);
    const total = pos.reduce((a, [, x]) => a + x * sign, 0);
    if (total <= 0) continue;
    for (const [k, x] of pos) reach.set(k, Math.max(reach.get(k) ?? 0, (Math.abs(v) * Math.abs(x)) / total));
  }
  const keep = [...reach.entries()]
    .filter(([, r]) => r >= 0.25 * vmax)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
  if (!keep.length) return null;
  const out = keep.map((channel) => ({ channel, values: values.map(() => 0), approx: false }));
  values.forEach((v, t) => {
    const w = weights(t);
    const sign = v >= 0 ? 1 : -1;
    const xs = keep.map((k) => Math.max(0, (w[k] ?? 0) * sign));
    const total = xs.reduce((a, b) => a + b, 0);
    keep.forEach((_, i) => (out[i].values[t] = total > 0 ? (v * xs[i]) / total : i === 0 ? v : 0));
  });
  // The fixed road is approximate where at least a third of what it carries, at its peak, is the drivers' unexplained part.
  for (const o of out) {
    if (o.channel !== fixed) continue;
    let p = 0;
    for (let t = 1; t <= T; t++) if (Math.abs(o.values[t]) > Math.abs(o.values[p])) p = t;
    const sign = o.values[p] >= 0 ? 1 : -1;
    const all = (weights(p)[fixed] ?? 0) * sign;
    const rough = (goal.rough[p] ?? 0) * sign;
    o.approx = all <= 0 || rough >= all / 3;
  }
  return out;
}

export type Drawn = { flow: Flow; value: number; n: number };

/**
 * The flows worth drawing at quarter t, at most `max`:
 *   1. every goal's biggest push, so no goal is left without one (debt moves in small
 *      steps and must never vanish into "more pushes");
 *   2. the player's own: on each goal, each lever's biggest road (small at first: that's
 *      the lag), mission goals first, up to half of the slots left;
 *   3. the rest by size: a push of 0.1 pp or more on a debt goal, then the big ones.
 */
export function drawnAt(story: Story, t: number, max: number): { drawn: Drawn[]; hidden: number } {
  const all = story.flows.map((flow) => {
    const value = flow.values[t] ?? 0;
    return { flow, value, n: Math.abs(value) / metricRef(flow.metric) };
  });
  const top = Math.max(0.0001, ...all.map((d) => d.n));
  const lever = new Set(story.causes.filter((c) => c.kind === "lever").map((c) => c.id));
  const isGoal = new Set(story.outcomes.filter((o) => o.goal).map((o) => o.metric));
  const debtGoal = isGoal.has("debt");
  const must = (d: Drawn) => debtGoal && d.flow.metric === "debt" && Math.abs(d.value) >= 0.095;
  const keep: Drawn[] = [];
  for (const o of story.outcomes) {
    const best = all.filter((d) => d.flow.metric === o.metric && Math.abs(d.value) >= 0.005).sort((a, b) => b.n - a.n)[0];
    if (best) keep.push(best);
  }
  const mine = new Map<string, Drawn>();
  for (const d of all) {
    if (!lever.has(d.flow.cause) || d.n < 0.05 || keep.includes(d)) continue;
    const k = `${d.flow.cause}|${d.flow.metric}`;
    if (keep.some((x) => `${x.flow.cause}|${x.flow.metric}` === k)) continue;
    if (!mine.has(k) || mine.get(k)!.n < d.n) mine.set(k, d);
  }
  const room = Math.max(0, Math.floor((max - keep.length) / 2));
  keep.push(...[...mine.values()].sort((a, b) => Number(isGoal.has(b.flow.metric)) - Number(isGoal.has(a.flow.metric)) || b.n - a.n).slice(0, room));
  const rest = all
    .filter((d) => !keep.includes(d) && (lever.has(d.flow.cause) ? d.n >= 0.05 : must(d) || d.n >= Math.max(0.15, 0.12 * top)))
    .sort((a, b) => Number(must(b)) - Number(must(a)) || b.n - a.n);
  keep.push(...rest.slice(0, Math.max(0, max - keep.length)));
  const hidden = all.filter((d) => d.n >= 0.05 && !keep.includes(d)).length;
  return { drawn: keep, hidden };
}

/** "+2.4", "−0.07", "+30 bp": a push's size, in its goal's units. */
export function pushSize(v: number, m: MetricId): string {
  const d = m === "spread" ? 0 : Math.abs(v) < 0.095 ? 2 : 1;
  return `${signed(v, d)}${pushUnit(m)}`;
}

/** "▲ +2.4", "▼ −0.07": the arrow's push, with a shape and a sign as well as a colour. */
export function pushText(v: number, m: MetricId): string {
  return `${v >= 0 ? "▲" : "▼"} ${pushSize(v, m)}`;
}

export type HeadPush = {
  cause: Cause;
  metric: MetricId;
  goal: string;
  /** The cause's push on the goal at quarter t, all its roads together. */
  value: number;
  tone: "good" | "bad";
  /** The player's own push at the goal date, as the strip shows it (forecast against "had you changed nothing"). */
  later?: { value: number; label: string; tone: "good" | "bad" };
  /** Too small to matter yet (under 0.05 pp): say when it lands rather than its size now. */
  small?: boolean;
};

/**
 * The map's story at quarter t in one line: the biggest push from outside the player's hands
 * (a shock, the economy's own drift) and the player's own biggest push, on the same goal where
 * the player has one. A cause's roads are added back together. Outside pushes come from the
 * arrows the map draws (drawnAt), so the island view names what the map shows; pushes under
 * 0.05 pp are left out, and the player's own is named when it lands, if it is small now.
 */
export function headline(story: Story, t: number, max: number): { top: HeadPush | null; mine: HeadPush | null } {
  const { drawn } = drawnAt(story, t, max);
  const cause = (id: string) => story.causes.find((c) => c.id === id);
  const total = (c: string, m: MetricId, q: number) => story.flows.filter((f) => f.cause === c && f.metric === m).reduce((a, f) => a + (f.values[q] ?? 0), 0);
  const tone = (m: MetricId, v: number, q: number): "good" | "bad" => (Math.sign(v) === story.outcomes.find((x) => x.metric === m)?.good(q) ? "good" : "bad");
  const pair = (c: Cause, m: MetricId): HeadPush | null => {
    const o = story.outcomes.find((x) => x.metric === m);
    if (!o) return null;
    const value = total(c.id, m, t);
    return { cause: c, metric: m, goal: o.label.toLowerCase(), value, tone: tone(m, value, t) };
  };
  const n = (p: HeadPush) => Math.abs(p.value) / metricRef(p.metric);
  const pairs = (keep: (c: Cause) => boolean, from: { cause: string; metric: MetricId }[]) => {
    const seen = new Set<string>();
    const out: HeadPush[] = [];
    for (const f of from) {
      const c = cause(f.cause);
      const k = `${f.cause}|${f.metric}`;
      if (!c || !keep(c) || seen.has(k)) continue;
      seen.add(k);
      const p = pair(c, f.metric);
      if (p) out.push(p);
    }
    return out.sort((a, b) => n(b) - n(a));
  };
  const top = pairs((c) => c.kind !== "lever", drawn.map((d) => d.flow)).find((p) => matters(p.value, p.metric)) ?? null;
  // The player's own, on any goal (a move that is small now may land later): when it lands, as the strip shows it.
  const mineAll = pairs((c) => c.kind === "lever", story.flows).map((p) => {
    if (story.end > t) {
      const strip = story.travel?.diffs.find((d) => d.metric === p.metric);
      const value = strip ? strip.values[story.end] : total(p.cause.id, p.metric, story.end);
      if (value !== undefined) p.later = { value, label: story.labels[story.end] ?? "", tone: tone(p.metric, value, story.end) };
    }
    p.small = !matters(p.value, p.metric);
    return p;
  });
  // A later figure under 0.05 pp is not worth a word either.
  for (const p of mineAll) if (p.later && !matters(p.later.value, p.metric)) delete p.later;
  const counts = (p: HeadPush) => !p.small || p.later !== undefined;
  const reach = (p: HeadPush) => Math.max(n(p), p.later ? Math.abs(p.later.value) / metricRef(p.metric) : 0);
  const best = mineAll.filter(counts).sort((a, b) => reach(b) - reach(a));
  // On the same goal as the outside push when the move does about as much there; otherwise where it does most.
  const same = top ? best.find((p) => p.metric === top.metric && reach(p) >= 0.5 * reach(best[0])) : undefined;
  return { top, mine: same ?? best[0] ?? null };
}

/** Largest push on any flow, any quarter shown: one scale for the whole strip of time, so arrows grow as effects build. */
export function maxPush(story: Story): number {
  let top = 0;
  for (const f of story.flows) for (let t = story.first; t <= story.end; t++) top = Math.max(top, Math.abs(f.values[t] ?? 0) / metricRef(f.metric));
  return Math.max(top, 0.5);
}
