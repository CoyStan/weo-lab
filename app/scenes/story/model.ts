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
export type ChannelId = "costs" | "capacity" | "demand" | "expect" | "fx" | "credit" | "budget" | "snowball";
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
  /** Effect of everything the player changed on growth, forecast minus had-you-changed-nothing, by quarter. */
  growth: number[];
  /**
   * The strip's rows: the mission's goals the moves change most by the goal date (for each goal's
   * scale), at most two, each the effect of everything the player changed, by quarter.
   */
  diffs: { metric: MetricId; values: number[] }[];
  /**
   * Every strip row in words, in the strip's order, each with its helps/hurts word: "Your rate hike: growth −0.2 pp
   * in 2026Q1, −0.8 pp at worst in 2026Q4, hurts → inflation −0.07 pp in 2026Q1, −1.0 pp by 2027Q4, helps". With two
   * levers or more moved, one clause each ("Your firmer rule: …. Your float: …").
   */
  sentence: string;
  /** The same with one figure per row, the furthest one, for a phone. */
  short: string;
  /** The short form without the lever's name when one lever moved ("growth −0.8 pp at worst in 2026Q4, hurts → …"); with several, each named. */
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
  { id: "costs", title: "Costs", sub: "world prices: food, fuel, commodities", icon: "costs" },
  // What the economy can produce: potential output and the natural rate, which the model's drivers leave
  // unexplained (a supply shock's lost capacity, reforms, public investment). Always a rough road.
  { id: "capacity", title: "Capacity", sub: "what the economy can produce", icon: "supply-shock" },
  { id: "demand", title: "Spending", sub: "people and firms", icon: "demand" },
  { id: "expect", title: "Expectations", sub: "of future prices", icon: "expect" },
  { id: "fx", title: "Exchange rate", sub: "the currency", icon: "fx" },
  { id: "credit", title: "Credit and trust", sub: "loans, spreads", icon: "credit" },
  { id: "budget", title: "The budget", sub: "taxes, spending", icon: "purse" },
  // Debt's own arithmetic, apart from the budget: the interest bill grows the debt, nominal growth shrinks its ratio.
  { id: "snowball", title: "Debt snowball", sub: "interest vs growth", icon: "snowball" },
];
export const CHANNEL_ORDER = CHANNELS.map((c) => c.id);
/** A commodity exporter's price bust is lost income, not higher costs: on its road the "Costs" card is named for world prices. */
export const isBust = (c: Cause | undefined) => c?.icon === "commodity-bust";
/** A road's card: "Costs", or "World prices" where the commodity bust is one of the causes on it (same road, same routing). */
export function channelMeta(id: ChannelId, bust = false): ChannelMeta {
  const ch = CHANNELS.find((c) => c.id === id)!;
  return id === "costs" && bust ? { ...ch, title: "World prices", sub: "food, fuel, commodities we buy and sell" } : ch;
}

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
/**
 * Arrow widths count one "unit of push" per goal (ref): 1 pp on most, 2 pp on debt, 0.5 on
 * unemployment and reserves, 50 bp on a spread. Said in words for the goals drawn whose unit
 * is not 1 pp, e.g. "Debt arrows at half width; unemployment and reserves at double."
 */
export function widthNote(metrics: MetricId[]): string {
  const name = (m: MetricId) => (m === "debt" ? "debt" : METRICS[m].label.toLowerCase());
  const half = metrics.filter((m) => m !== "spread" && METRICS[m].ref === 2).map(name);
  const dbl = metrics.filter((m) => m !== "spread" && METRICS[m].ref === 0.5).map(name);
  const parts: string[] = [];
  if (half.length) parts.push(`${half.join(" and ")} arrows at half width`);
  if (dbl.length) parts.push(half.length ? `${dbl.join(" and ")} at double` : `${dbl.join(" and ")} arrows at double width`);
  if (metrics.includes("spread")) parts.push("bond spread arrows: 50 bp as wide as 1 pp");
  const text = parts.join("; ");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}.` : "";
}
/** A push big enough to be worth a sentence: 0.05 pp (5 bp on a spread). */
export const matters = (v: number, m: MetricId) => Math.abs(v) >= (m === "spread" ? 5 : 0.05);

// The fixed road. Used for goals the model has no drivers for (budget balance, current
// account, reserves, spreads), and for the part of a push on inflation or debt the drivers
// leave unexplained (one-offs). What they leave of growth and unemployment is potential
// output and the natural rate: that goes through capacity (roughRoad). The map marks these
// roads as rough. Everywhere else the road comes from the model's drivers (routes.ts).
type Route = Partial<Record<MetricId, ChannelId>>;
const DEFAULT_ROUTE: Record<MetricId, ChannelId> = { infl: "demand", growth: "demand", unemp: "demand", debt: "budget", ob: "budget", ca: "fx", reserves: "fx", spread: "credit" };
const ROUTES: Record<string, Route> = {
  momentum: { infl: "expect" },
  history: { infl: "costs" },
  rates: { ca: "demand", debt: "snowball" },
  // Public investment's lasting effect is on capacity, paid for from the budget.
  budget: { growth: "budget", unemp: "budget", ca: "demand", reserves: "budget", spread: "budget" },
  currency: { infl: "fx", growth: "fx", unemp: "fx", debt: "fx", ob: "fx", ca: "fx", reserves: "fx", spread: "fx" },
  // What the drivers leave of reforms is capacity (roughRoad), marked rough.
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
/**
 * The road for what the drivers leave unexplained. On growth and unemployment that is potential
 * output and the natural rate: capacity. The one exception is a commodity bust: for an exporter a
 * price fall is lost income, not lost capacity, so its rough part stays with world prices (costs).
 * On inflation and debt (one-offs), the fixed road.
 */
const roughRoad = (key: string, m: MetricId, fixed: ChannelId): ChannelId => (m === "growth" || m === "unemp" ? (key === "commodity-bust" ? "costs" : "capacity") : fixed);

const num = (v: number, d = 2) => String(Number(v.toFixed(d)));
const fmt = (v: number, d = 1) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : v.toFixed(d));
export const signed = (v: number, d = 1) => {
  const s = fmt(Math.abs(v), d);
  return s === (0).toFixed(d) ? s : `${v > 0 ? "+" : "−"}${s}`;
};

const POLICY_ICON: Record<string, IconId> = { rates: "rates", budget: "budget", currency: "currency", support: "support" };

/** Shocks whose one-line description names a goal the map tracks (SHOCKS[kind].short, first part). */
const SHOCK_NAMES: Partial<Record<ShockKind, MetricId>> = { "food-price": "infl" };

/** "Commodities −35%" at 1.2 times the usual size: "Commodities −42% (1.2× usual)". The display only; the shock is the model's. */
function scaledShort(short: string, m: number): string {
  return `${short.replace(/\d+(?:\.\d+)?/g, (x) => num(Number(x) * m, 1))} (${num(m, 1)}× usual)`;
}

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
    // One move gets its own name ("Your float"); several share "Your currency moves", each in the sub line.
    const moves: { title: string; bit: string }[] = [];
    const REGIME = { float: "float", managed: "managed rate", peg: "peg" } as const;
    if (p.fxRegime !== u.fxRegime) moves.push({ title: `Your ${REGIME[p.fxRegime]}`, bit: `${u.fxRegime} → ${p.fxRegime}` });
    if (p.fxIntervention !== u.fxIntervention) moves.push({ title: p.fxIntervention > u.fxIntervention ? "Your heavier intervention" : "Your lighter intervention", bit: `intervention ${num(u.fxIntervention, 0)}% → ${num(p.fxIntervention, 0)}%` });
    if (p.capitalControls !== u.capitalControls) moves.push({ title: p.capitalControls ? "Your capital controls" : "Your controls lifted", bit: p.capitalControls ? "capital controls" : "controls lifted" });
    const dev = config.oneOffs.filter((o) => o.kind === "devalue").length > start.oneOffs.filter((o) => o.kind === "devalue").length;
    if (dev) moves.push({ title: "Your devaluation", bit: "devaluation" });
    return { title: moves.length === 1 ? moves[0].title : "Your currency moves", sub: moves.map((x) => x.bit).join(", ") || "earlier quarters" };
  }
  // Support: "reforms" only when a reform changed; an IMF programme alone is named for itself.
  const imf = p.imfProgram !== u.imfProgram;
  const reforms = p.laborReform !== u.laborReform || p.productivityReform !== u.productivityReform || p.tradeOpenness !== u.tradeOpenness;
  const inst = (config.institutions ?? []).length > (start.institutions ?? []).length;
  const deal = config.oneOffs.some((o) => o.kind === "restructure") && !start.oneOffs.some((o) => o.kind === "restructure");
  const bits: string[] = [];
  if (imf) bits.push(p.imfProgram > 0 ? `IMF ${num(p.imfProgram, 1)}% GDP a year` : "IMF programme ended");
  if (reforms) bits.push("reforms");
  if (inst) bits.push("institutions");
  if (deal) bits.push("debt deal");
  const only = bits.length === 1;
  const title =
    only && imf ? (p.imfProgram > 0 ? "Your IMF programme" : "Your IMF exit") : only && reforms ? "Your reforms" : only && inst ? "Your new institutions" : only && deal ? "Your debt deal" : reforms ? "Your reforms and support" : "Your support";
  return { title, sub: bits.join(", ") || "earlier quarters" };
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
      const split = goalRoads ? splitByRoad(values, goalRoads, fixed, roughRoad(routeKey, m, fixed), first, end) : null;
      if (split) for (const r of split) flows.push({ id: `${cause}|${m}|${r.channel}`, cause, channel: r.channel, metric: m, values: r.values, approx: r.approx });
      else flows.push({ id: `${cause}|${m}|${fixed}`, cause, channel: fixed, metric: m, values, approx: true });
    }
  };
  for (const comp of decomp.components) {
    if (comp.kind === "momentum") {
      // The drift is the economy with no shocks and the policy the player found, so the card says that policy is in it.
      const sub = policyUntouched.rateMode === "manual" ? `no shocks, rate kept at ${num(policyUntouched.manualRate)}%` : "no shocks, policy as you found it";
      causes.push({ id: "momentum", kind: "momentum", title: "Its own drift", sub, icon: "drift" });
      addFlows("momentum", "momentum", comp);
    } else if (comp.kind === "environment") {
      const shockId = comp.id.startsWith("shock:") ? comp.id.slice(6) : null;
      const s = shockId ? config.shocks.find((x) => x.id === shockId) : null;
      if (s) {
        const spec = SHOCKS[s.kind];
        const size = Math.abs(s.magnitude - 1) < 0.01 ? spec.short.split(",")[0] : scaledShort(spec.short, s.magnitude);
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
    const diff = (m: MetricId) => forecast.slice(0, end + 1).map((s, t) => s[m] - untouched[t][m]);
    const growth = diff("growth");
    // What the strip shows as 0: under 0.005 (0.5 bp on a spread).
    const flat = (v: number, m: MetricId) => Math.abs(v) < (m === "spread" ? 0.5 : 0.005);
    // The rows: the mission's goals, ranked by what the moves change at the goal date for each goal's scale; a goal
    // the moves leave at 0 in every quarter shown is left out. Which goals, never what they say: the figures are the model's.
    const goals = outcomes.filter((o) => o.goal).map((o) => o.metric);
    const size = (d: { metric: MetricId; values: number[] }) => Math.abs(d.values[end] ?? 0) / METRICS[d.metric].ref;
    let diffs = (goals.length ? goals : metrics)
      .map((m) => ({ metric: m, values: diff(m) }))
      .filter((d) => d.values.slice(first, end + 1).some((v) => !flat(v, d.metric)))
      .sort((a, b) => size(b) - size(a))
      .slice(0, 2);
    // Growth moves first and carries the move on to inflation or unemployment: its row goes first, so the
    // sentence reads in the order things happen ("growth … → inflation …"). Otherwise the rows sit side by side.
    if (diffs.length === 2 && diffs[1].metric === "growth" && (diffs[0].metric === "infl" || diffs[0].metric === "unemp")) diffs = [diffs[1], diffs[0]];
    const join = diffs.length === 2 && diffs[0].metric === "growth" ? " → " : "; ";
    const now = Math.min(end, clock + 1);
    const name = (m: MetricId) => METRICS[m].label.toLowerCase();
    const amount = (v: number, m: MetricId) => `${signed(v, m === "spread" ? 0 : Math.abs(v) < 0.095 && !flat(v, m) ? 2 : 1)}${unitWord(m)}`;
    const toneAt = (m: MetricId, v: number, t: number) => (Math.sign(v) === outcomes.find((x) => x.metric === m)?.good(t) ? "good" : "bad");
    // ", helps" or ", hurts" for a mission goal, so the sentence never leans on the strip's colours.
    const word = (m: MetricId, v: number, t: number) => {
      const o = outcomes.find((x) => x.metric === m);
      return o?.goal && !flat(v, m) ? (toneAt(m, v, t) === "good" ? ", helps" : ", hurts") : "";
    };
    // One row in words: what moves in the quarter being decided, and, when it goes much further later (at least
    // half as far again, and 0.05 pp or more), how far and when: "growth −0.2 pp in 2026Q1, −0.8 pp at worst in
    // 2026Q4, hurts". The worst (or best) point is the biggest push from the deciding quarter to the goal date, as
    // goalPushes() finds it. The short form keeps that further figure, not the first one.
    const clause = (m: MetricId, at: (t: number) => number): { long: string; short: string } => {
      const n = at(now);
      let w = now;
      for (let q = now + 1; q <= end; q++) if (Math.abs(at(q)) > Math.abs(at(w))) w = q;
      const vw = at(w);
      // Never 0.05 pp (5 bp) in any quarter: too small to help or hurt, as the strip's row says ("tiny").
      if (!matters(vw, m)) {
        const s = `${name(m)} stays tiny (${amount(vw, m)} at most, ${labels[w]})`;
        return { long: s, short: s };
      }
      const lead = `${name(m)} ${amount(n, m)} in ${labels[now]}`;
      if (w === now || !matters(vw, m) || Math.abs(vw) < 1.5 * Math.abs(n)) return { long: `${lead}${word(m, n, now)}`, short: `${lead}${word(m, n, now)}` };
      const when = w === end ? `by ${labels[w]}` : `${toneAt(m, vw, w) === "bad" ? "at worst" : "at best"} in ${labels[w]}`;
      const far = `${amount(vw, m)} ${when}${word(m, vw, w)}`;
      // The first step says its own word only when it matters and its tone differs from the later one.
      const leadWord = matters(n, m) && word(m, n, now) !== word(m, vw, w) ? word(m, n, now) : "";
      return { long: `${lead}${leadWord}, ${far}`, short: `${name(m)} ${far}` };
    };
    // A lever's own push is worth naming on a row when it reaches 0.05 pp (5 bp) in some quarter the strip shows.
    const cellsMove = (at: (t: number) => number, m: MetricId) => {
      for (let t = first; t <= end; t++) if (matters(at(t), m)) return true;
      return false;
    };
    const rowsFor = (at: (m: MetricId) => (t: number) => number, only = false) => {
      const list = diffs.filter((d) => !only || cellsMove(at(d.metric), d.metric)).map((d) => clause(d.metric, at(d.metric)));
      return { long: list.map((x) => x.long).join(join), short: list.map((x) => x.short).join(join), n: list.length };
    };
    const none = `too small to show on your goals by ${labels[end]}`;
    let sentence: string;
    let short: string;
    let steps: string;
    if (levers.length >= 2) {
      // Each lever its own clause, on the strip's rows where its own push is worth naming, from its own piece of the
      // decomposition (the strip adds them up). With three levers or more, one figure a row (the furthest), so every
      // lever fits the strip's lines.
      const parts = levers.map((c) => {
        const comp = decomp.components.find((x) => x.id === c.id);
        const r = rowsFor((m) => (t) => comp?.values[m]?.[t] ?? 0, true);
        return { long: `${c.title}: ${r.n ? r.long : none}`, short: `${c.title}: ${r.n ? r.short : none}` };
      });
      sentence = parts.map((x) => (levers.length >= 3 ? x.short : x.long)).join(". ");
      short = parts.map((x) => x.short).join(". ");
      steps = short;
    } else {
      const r = rowsFor((m) => (t) => diffs.find((d) => d.metric === m)?.values[t] ?? 0);
      sentence = `${lever}: ${r.n ? r.long : none}`;
      short = `${lever}: ${r.n ? r.short : none}`;
      steps = r.n ? r.short : none;
    }
    travel = { lever, growth, diffs, sentence, short, steps };
  }

  return { clock, end, first, labels, causes, flows, outcomes, travel };
}

/**
 * Split a piece's push on a goal between at most three roads, by the model's drivers
 * (routes.ts). The sizes stay the decomposition's: each quarter's value is shared among
 * the kept roads that push the same way, so the parts add up to it exactly. What the drivers
 * leave unexplained (`rough`) goes down `roughRoad` (capacity for growth and unemployment,
 * the fixed road otherwise); a road whose push is mostly that is marked approximate. So is
 * a kept road that also carries a fair share of the roads left out: where, at any quarter
 * shown (first to end), the same-sign weight on roads not kept is at least a third of the
 * road's own, its size is not the drivers' alone. Returns null where nothing pushes.
 */
function splitByRoad(values: number[], goal: GoalRoads, fixed: ChannelId, roughRoad: ChannelId, first: number, end: number): { channel: ChannelId; values: number[]; approx: boolean }[] | null {
  const weights = (t: number) => {
    const w: Partial<Record<ChannelId, number>> = {};
    for (const [k, v] of Object.entries(goal.roads) as [ChannelId, number[]][]) w[k] = (w[k] ?? 0) + (v[t] ?? 0);
    w[roughRoad] = (w[roughRoad] ?? 0) + (goal.rough[t] ?? 0);
    return w;
  };
  const T = Math.min(end, values.length - 1);
  let peak = 0;
  for (let t = 1; t <= T; t++) if (Math.abs(values[t] ?? 0) > Math.abs(values[peak] ?? 0)) peak = t;
  const vmax = Math.abs(values[peak] ?? 0);
  if (vmax < 1e-9) return null;
  // The roads that carry at least a quarter of the push at some quarter shown; three at most.
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
    .slice(0, 3)
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
  for (const o of out) {
    // The rough road is approximate where at least a third of what it carries, at its peak, is the drivers' unexplained part.
    if (o.channel === roughRoad) {
      let p = 0;
      for (let t = 1; t <= T; t++) if (Math.abs(o.values[t]) > Math.abs(o.values[p])) p = t;
      const sign = o.values[p] >= 0 ? 1 : -1;
      const all = (weights(p)[roughRoad] ?? 0) * sign;
      const rough = (goal.rough[p] ?? 0) * sign;
      if (all <= 0 || rough >= all / 3) o.approx = true;
    }
    // Any kept road is approximate where the roads left out carry, the same way, a third of its own weight or more.
    for (let t = Math.max(1, first); t <= T && !o.approx; t++) {
      const v = values[t] ?? 0;
      if (Math.abs(v) < 1e-9) continue;
      const sign = v >= 0 ? 1 : -1;
      const w = weights(t);
      const own = Math.max(0, (w[o.channel] ?? 0) * sign);
      if (own <= 0) continue;
      let dropped = 0;
      for (const [k, x] of Object.entries(w) as [ChannelId, number][]) if (!keep.includes(k)) dropped += Math.max(0, x * sign);
      if (dropped >= own / 3) o.approx = true;
    }
  }
  return out;
}

export type Drawn = { flow: Flow; value: number; n: number };

/** A cause's whole push on a goal at quarter t: all its roads added together, drawn or not. */
export function causeTotal(story: Story, cause: string, m: MetricId, t: number): number {
  return story.flows.filter((f) => f.cause === cause && f.metric === m).reduce((a, f) => a + (f.values[t] ?? 0), 0);
}

/**
 * The flows worth drawing at quarter t, at most `max`:
 *   1. the player's own first, so the map never folds them away: on each goal, each lever's
 *      biggest road whenever the lever's whole push there is 0.05 pp or more (small at first:
 *      that's the lag), mission goals first, then its other roads of 0.05 pp or more;
 *   2. every goal's biggest push, so no goal is left without one (debt moves in small
 *      steps and must never vanish into "more pushes"); these keep their room;
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
  // Each goal's biggest push, when it is worth a word (0.05 pp, 5 bp): a goal with none says "no push to speak of yet".
  const best: Drawn[] = [];
  for (const o of story.outcomes) {
    const b = all.filter((d) => d.flow.metric === o.metric && matters(d.value, d.flow.metric)).sort((a, b) => b.n - a.n)[0];
    if (b) best.push(b);
  }
  // The player's own: each lever's main road on each goal, then its other roads.
  const main: Drawn[] = [];
  const more: Drawn[] = [];
  const pairs = new Map<string, Drawn[]>();
  for (const d of all) {
    if (!lever.has(d.flow.cause)) continue;
    const k = `${d.flow.cause}|${d.flow.metric}`;
    pairs.set(k, [...(pairs.get(k) ?? []), d]);
  }
  for (const list of pairs.values()) {
    const whole = Math.abs(list.reduce((a, d) => a + d.value, 0)) / metricRef(list[0].flow.metric);
    const sorted = [...list].sort((a, b) => b.n - a.n);
    if (whole >= 0.05 || sorted[0].n >= 0.05) main.push(sorted[0]);
    more.push(...sorted.slice(1).filter((d) => d.n >= 0.05));
  }
  const goalFirst = (a: Drawn, b: Drawn) => Number(isGoal.has(b.flow.metric)) - Number(isGoal.has(a.flow.metric)) || b.n - a.n;
  const mine = [...main.sort(goalFirst), ...more.sort(goalFirst)];
  const others = best.filter((d) => !mine.includes(d));
  const keep: Drawn[] = [...mine.slice(0, Math.max(0, max - others.length)), ...others];
  const rest = all
    .filter((d) => !keep.includes(d) && !lever.has(d.flow.cause) && (must(d) || d.n >= Math.max(0.15, 0.12 * top)))
    .sort((a, b) => Number(must(b)) - Number(must(a)) || b.n - a.n);
  keep.push(...rest.slice(0, Math.max(0, max - keep.length)));
  // A lever is never one of "N more pushes": every lever moved has its own place in the cause column (index.tsx).
  const hidden = all.filter((d) => d.n >= 0.05 && !keep.includes(d) && !lever.has(d.flow.cause)).length;
  return { drawn: keep, hidden };
}

/**
 * A goal's visible pushes, rounded so that they and one "others" figure add up exactly to the change its card
 * shows. `pills` are the causes' whole pushes (true values), `change` the goal's true change and `shown` that
 * change as the card rounds it, at `digits`. A push shown with two decimals ("−0.07") keeps them; the others are
 * rounded to the card's step by largest remainder, together with what the hidden pushes add up to, so the sum
 * lands on the card's figure. `others` is what is left (the hidden pushes, plus the two-decimal pushes' hundredths);
 * `fine` says it needs two decimals to add up.
 */
export function reconcile(pills: number[], change: number, shown: number, m: MetricId, digits: number): { values: number[]; others: number; fine: boolean } {
  const sub = Math.pow(10, digits + 1); // hundredths on a one-digit goal
  const step = 10; // one of the card's steps, in hundredths
  const small = (v: number) => m !== "spread" && digits >= 1 && Math.abs(v) < 0.095;
  const out = pills.map((v) => (small(v) ? Math.round(v * 100) * (sub / 100) : 0));
  const big = pills.map((_, i) => i).filter((i) => !small(pills[i]));
  const total = Math.round(shown * sub);
  const fixed = out.reduce((a, b) => a + b, 0);
  const rest = change - pills.reduce((a, b) => a + b, 0);
  const items = [...big.map((i) => pills[i]), rest].map((v) => (v * sub) / step);
  const floors = items.map((x) => Math.floor(x + 1e-9));
  let k = Math.round((total - fixed) / step) - floors.reduce((a, b) => a + b, 0);
  // On a near tie a visible push keeps its own rounding and "others" gives way.
  const byRem = items.map((x, i) => ({ i, r: x - floors[i] - (i === items.length - 1 ? 0.08 : 0) })).sort((a, b) => b.r - a.r);
  for (let j = 0; k > 0; j++, k--) floors[byRem[j % byRem.length].i] += 1;
  for (let j = 0; k < 0; j++, k++) floors[byRem[byRem.length - 1 - (j % byRem.length)].i] -= 1;
  big.forEach((i, j) => (out[i] = floors[j] * step));
  const others = total - out.reduce((a, b) => a + b, 0);
  return { values: out.map((x) => x / sub), others: others / sub, fine: others % step !== 0 };
}

/** "others ▼ −0.2": what the visible pushes leave of a goal's change, at the precision that makes them add up. */
export function othersText(r: { others: number; fine: boolean }, m: MetricId, digits: number): string | null {
  if (Math.abs(r.others) < 1e-9) return null;
  return `${r.others > 0 ? "▲" : "▼"} ${signed(r.others, r.fine ? digits + 1 : digits)}${pushUnit(m)}`;
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
  // The player's own, on any goal (a move that is small now may land later): when it lands. The strip is the
  // sum of all the player's moves, so it speaks for a lever only when that lever is the only one moved.
  const levers = story.causes.filter((c) => c.kind === "lever").length;
  const mineAll = pairs((c) => c.kind === "lever", story.flows).map((p) => {
    if (story.end > t) {
      const strip = story.travel?.diffs.find((d) => d.metric === p.metric);
      const value = strip && levers === 1 ? strip.values[story.end] : total(p.cause.id, p.metric, story.end);
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

export type GoalPush = HeadPush & {
  /** The player's own: its biggest push from the next quarter to the goal date, when bigger than now ("at worst"). */
  extreme?: { value: number; label: string; tone: "good" | "bad" };
};

/**
 * One goal's story at quarter t, for a goal in trouble: its biggest push, and the player's own
 * biggest push there (or, when the player has none, the next biggest), each cause's roads added
 * together, since the mission's start. The player's own also says how far it goes in the
 * quarters to come, when that is further than now.
 */
export function goalPushes(story: Story, t: number, m: MetricId): GoalPush[] {
  const o = story.outcomes.find((x) => x.metric === m);
  if (!o) return [];
  const levers = story.causes.filter((c) => c.kind === "lever");
  const strip = levers.length === 1 ? story.travel?.diffs.find((d) => d.metric === m) : undefined;
  const tone = (v: number, q: number): "good" | "bad" => (Math.sign(v) === o.good(q) ? "good" : "bad");
  const pushes: GoalPush[] = story.causes.map((c) => {
    const value = causeTotal(story, c.id, m, t);
    const p: GoalPush = { cause: c, metric: m, goal: o.label.toLowerCase(), value, tone: tone(value, t) };
    if (c.kind === "lever") {
      const at = (q: number) => (strip ? (strip.values[q] ?? 0) : causeTotal(story, c.id, m, q));
      let far = -1;
      for (let q = t + 1; q <= story.end; q++) if (Math.abs(at(q)) > Math.abs(far < 0 ? value : at(far))) far = q;
      if (far > 0 && matters(at(far), m) && Math.abs(at(far)) - Math.abs(value) >= 0.05 * metricRef(m)) p.extreme = { value: at(far), label: story.labels[far] ?? "", tone: tone(at(far), far) };
      p.small = !matters(value, m);
    }
    return p;
  });
  const n = (p: GoalPush) => Math.abs(p.value) / metricRef(m);
  const counts = (p: GoalPush) => matters(p.value, m) || p.extreme !== undefined;
  const ranked = pushes.filter(counts).sort((a, b) => n(b) - n(a));
  const first = ranked.find((p) => matters(p.value, m));
  if (!first) return ranked.filter((p) => p.cause.kind === "lever").slice(0, 1);
  const own = ranked.find((p) => p !== first && p.cause.kind === "lever");
  const second = own ?? ranked.find((p) => p !== first && matters(p.value, m));
  return second ? [first, second] : [first];
}

/** Largest push on any flow, any quarter shown: one scale for the whole strip of time, so arrows grow as effects build. */
export function maxPush(story: Story): number {
  let top = 0;
  for (const f of story.flows) for (let t = story.first; t <= story.end; t++) top = Math.max(top, Math.abs(f.values[t] ?? 0) / metricRef(f.metric));
  return Math.max(top, 0.5);
}
