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
  sentence: string;
  /** The same in two steps, for a phone: what moves at once, and the main goal at the goal date. */
  short: string;
  /** The two steps alone, without the lever's name ("growth −0.2 pp in 2027Q1; public debt −5.3 pp by 2029Q4, helps"). */
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
      const split = goalRoads ? splitByRoad(values, goalRoads, fixed, roughRoad(routeKey, m, fixed), first, end) : null;
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
    const diff = (m: MetricId) => forecast.slice(0, end + 1).map((s, t) => s[m] - untouched[t][m]);
    const growth = diff("growth");
    // What the strip shows as 0: under 0.005 (0.5 bp on a spread).
    const flat = (v: number, m: MetricId) => Math.abs(v) < (m === "spread" ? 0.5 : 0.005);
    // The rows: the mission's goals, ranked by what the moves change at the goal date for each goal's scale; a goal
    // the moves leave at 0 in every quarter shown is left out. Which goals, never what they say: the figures are the model's.
    const goals = outcomes.filter((o) => o.goal).map((o) => o.metric);
    const size = (d: { metric: MetricId; values: number[] }) => Math.abs(d.values[end] ?? 0) / METRICS[d.metric].ref;
    const diffs = (goals.length ? goals : metrics)
      .map((m) => ({ metric: m, values: diff(m) }))
      .filter((d) => d.values.slice(first, end + 1).some((v) => !flat(v, d.metric)))
      .sort((a, b) => size(b) - size(a))
      .slice(0, 2);
    const main = diffs[0] ?? null;
    const now = Math.min(end, clock + 1);
    const mid = Math.min(end, clock + 4);
    const name = (m: MetricId) => METRICS[m].label.toLowerCase();
    const amount = (v: number, m: MetricId) => `${signed(v, m === "spread" ? 0 : Math.abs(v) < 0.095 && !flat(v, m) ? 2 : 1)}${unitWord(m)}`;
    // ", helps" or ", hurts" for a mission goal, so the sentence never leans on the strip's colours.
    const word = (m: MetricId, v: number, t: number) => {
      const o = outcomes.find((x) => x.metric === m);
      return o?.goal && !flat(v, m) ? (Math.sign(v) === o.good(t) ? ", helps" : ", hurts") : "";
    };
    // First what moves at once (growth), then the main goal as it builds. An arrow only where one leads to the
    // other (growth to inflation or unemployment); for debt, the budget balance or reserves the two are side by side:
    // in the model a squeeze that lowers demand raises the debt ratio, and debt falls because of the primary surplus.
    const head = main?.metric !== "growth" && !flat(growth[now] ?? 0, "growth") ? `growth ${amount(growth[now], "growth")} in ${labels[now]}${word("growth", growth[now], now)}` : null;
    const join = main && (main.metric === "infl" || main.metric === "unemp") ? " → " : "; ";
    const at = (t: number, by: boolean) => `${amount(main!.values[t], main!.metric)} ${by ? "by" : "in"} ${labels[t]}`;
    const steps: { t: number; text: string }[] = [];
    if (main) {
      if (!head || end <= now) steps.push({ t: now, text: at(now, false) });
      if (mid < end && mid > now) steps.push({ t: mid, text: at(mid, true) });
      if (end > now) steps.push({ t: end, text: at(end, true) });
    }
    // The tone word after the last step, and after an earlier one whose tone differs.
    const said = (list: { t: number; text: string }[]) =>
      list
        .map((s, i) => {
          const w = word(main!.metric, main!.values[s.t], s.t);
          const next = list[i + 1];
          return `${s.text}${!next || w !== word(main!.metric, main!.values[next.t], next.t) ? w : ""}`;
        })
        .join(", ");
    const mainText = main && steps.length ? `${name(main.metric)} ${said(steps)}` : `too small to show on your goals by ${labels[end]}`;
    const shortSteps = main ? (head ? steps.slice(-1) : [steps[0], ...(steps.length > 1 ? steps.slice(-1) : [])]) : [];
    const shortText = main && shortSteps.length ? `${name(main.metric)} ${said(shortSteps)}` : mainText;
    const sentence = head ? `${head}${join}${mainText}` : mainText;
    const short = head ? `${head}${join}${shortText}` : shortText;
    travel = { lever, growth, diffs, sentence: `${lever}: ${sentence}`, short: `${lever}: ${short}`, steps: short };
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
  // Each goal's biggest push.
  const best: Drawn[] = [];
  for (const o of story.outcomes) {
    const b = all.filter((d) => d.flow.metric === o.metric && Math.abs(d.value) >= 0.005).sort((a, b) => b.n - a.n)[0];
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
