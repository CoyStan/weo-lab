// The causal map's data: who pushed which goal, through which channel, by how
// much, quarter by quarter. Pure (no React), built on the game's own
// explanation logic: decompose.ts splits each goal's path into momentum, each
// shock and each policy instrument; framework.ts channels() says how levers
// travel and whether a channel is blocked; the staff forecast against the
// "had you changed nothing" path gives the player's own effect over time.

import type { Component, Decomposition } from "../../game/decompose";
import type { Channel } from "../../game/framework";
import type { Mission } from "../../game/missions";
import { SHOCKS } from "../../model/shocks";
import type { Policy, QuarterState, ScenarioConfig, ShockKind } from "../../model/types";

export type MetricId = "infl" | "growth" | "debt" | "unemp" | "ob" | "ca" | "reserves" | "spread";
export type ChannelId = "costs" | "demand" | "expect" | "fx" | "credit" | "budget";
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
  | "infl"
  | "growth"
  | "debt"
  | "unemp"
  | "ob"
  | "ca"
  | "reserves"
  | "spread";

export type Cause = { id: string; kind: CauseKind; title: string; sub: string; note?: string; icon: IconId };
export type Flow = { id: string; cause: string; channel: ChannelId; metric: MetricId; /** Contribution to the change since the start, by quarter. */ values: number[] };
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
  { id: "costs", title: "Costs", sub: "food, fuel, wages", icon: "costs" },
  { id: "demand", title: "Spending", sub: "people and firms", icon: "demand" },
  { id: "expect", title: "Expectations", sub: "of future prices", icon: "expect" },
  { id: "fx", title: "Exchange rate", sub: "the currency", icon: "fx" },
  { id: "credit", title: "Credit and trust", sub: "loans, spreads", icon: "credit" },
  { id: "budget", title: "The budget", sub: "taxes, interest", icon: "purse" },
];
export const CHANNEL_ORDER = CHANNELS.map((c) => c.id);

const METRICS: Record<MetricId, { label: string; unit: string; digits: number; good: 1 | -1; /** One "unit of push" for arrow widths. */ ref: number }> = {
  infl: { label: "Inflation", unit: "%", digits: 1, good: -1, ref: 1 },
  growth: { label: "Growth", unit: "%", digits: 1, good: 1, ref: 1 },
  debt: { label: "Public debt", unit: "% GDP", digits: 0, good: -1, ref: 2 },
  unemp: { label: "Unemployment", unit: "%", digits: 1, good: -1, ref: 0.5 },
  ob: { label: "Budget balance", unit: "% GDP", digits: 1, good: 1, ref: 1 },
  ca: { label: "Current account", unit: "% GDP", digits: 1, good: 1, ref: 1 },
  reserves: { label: "Reserves", unit: "months", digits: 1, good: 1, ref: 0.5 },
  spread: { label: "Bond spread", unit: "bp", digits: 0, good: -1, ref: 50 },
};
export const metricRef = (m: MetricId) => METRICS[m].ref;
/** Units of a push on a metric: pp for rates and ratios, bp for spreads, months for reserves. */
export const pushUnit = (m: MetricId) => (m === "spread" ? " bp" : m === "reserves" ? " mo" : "");

// Which channel carries a cause's effect on each goal. The decomposition says
// who moved a goal and by how much; the model's transmission (framework.ts
// channels(), the drivers) says by which road. This table is that road.
type Route = Partial<Record<MetricId, ChannelId>>;
const DEFAULT_ROUTE: Record<MetricId, ChannelId> = { infl: "demand", growth: "demand", unemp: "demand", debt: "budget", ob: "budget", ca: "fx", reserves: "fx", spread: "credit" };
const ROUTES: Record<string, Route> = {
  momentum: { infl: "expect" },
  history: { infl: "costs" },
  rates: { ca: "demand" },
  budget: { ca: "demand", reserves: "budget", spread: "budget" },
  currency: { infl: "fx", growth: "fx", unemp: "fx", debt: "fx", ob: "fx", ca: "fx", reserves: "fx", spread: "fx" },
  support: { infl: "expect", growth: "credit", unemp: "credit" },
  "food-price": { infl: "costs" },
  "oil-spike": { infl: "costs", growth: "costs", unemp: "costs" },
  "supply-shock": { infl: "costs", growth: "costs", unemp: "costs" },
  "natural-disaster": { infl: "costs" },
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
  const v = `${o.op === "<=" ? "≤" : "≥"} ${num(o.threshold, 1)}${unit === "%" ? "%" : ` ${unit}`}`;
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
};

export function buildStory(input: StoryInput): Story {
  const { config, start, mission, clock, end, forecast, untouched, touched, policy, policyUntouched, decomp, chans } = input;
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

  // Causes and their flows, from the decomposition.
  const causes: Cause[] = [];
  const flows: Flow[] = [];
  const rateChannel = chans.find((c) => c.id === "rates");
  const addFlows = (cause: string, routeKey: string, comp: Component) => {
    for (const m of metrics) {
      const values = comp.values[m] ?? [];
      if (!values.some((v) => Math.abs(v) / METRICS[m].ref >= 0.02)) continue;
      flows.push({ id: `${cause}|${m}`, cause, channel: route(routeKey, m), metric: m, values });
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
        causes.push({ id: comp.id, kind: "shock", title, sub: `${size} · ${labels[s.quarter] ?? ""}`, icon: s.kind });
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

  // The player's own effect over time.
  let travel: Travel | null = null;
  if (touched) {
    const levers = causes.filter((c) => c.kind === "lever");
    const lever = levers.length === 1 ? levers[0].title : levers.length ? "Your moves" : "Your earlier moves";
    const demand = forecast.slice(0, end + 1).map((s, t) => s.gap - untouched[t].gap);
    const diffs = metrics.slice(0, 2).map((m) => ({ metric: m, values: forecast.slice(0, end + 1).map((s, t) => s[m] - untouched[t][m]) }));
    const main = diffs[0];
    const d1 = demand[clock + 1] ?? 0;
    const mid = Math.min(end, clock + 4);
    const name = METRICS[main.metric].label.toLowerCase();
    const parts = [`demand ${signed(d1)} pp now`];
    if (mid < end) parts.push(`${name} ${signed(main.values[mid])} by ${labels[mid]}`);
    parts.push(`${mid < end ? "" : `${name} `}${signed(main.values[end])} by ${labels[end]}`);
    travel = { lever, demand, diffs, sentence: `${lever}: ${parts.join(" → ")}` };
  }

  return { clock, end, first, labels, causes, flows, outcomes, travel };
}

export type Drawn = { flow: Flow; value: number; n: number };

/** The flows worth drawing at quarter t: the big ones, plus the player's own (small at first: that's the lag). */
export function drawnAt(story: Story, t: number, max: number): { drawn: Drawn[]; hidden: number } {
  const all = story.flows.map((flow) => {
    const value = flow.values[t] ?? 0;
    return { flow, value, n: Math.abs(value) / metricRef(flow.metric) };
  });
  const top = Math.max(0.0001, ...all.map((d) => d.n));
  const lever = new Set(story.causes.filter((c) => c.kind === "lever").map((c) => c.id));
  const keep = all
    .filter((d) => (lever.has(d.flow.cause) ? d.n >= 0.05 : d.n >= Math.max(0.15, 0.12 * top)))
    .sort((a, b) => Number(lever.has(b.flow.cause)) - Number(lever.has(a.flow.cause)) || b.n - a.n)
    .slice(0, max);
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

export type HeadPush = { cause: Cause; metric: MetricId; goal: string; value: number; tone: "good" | "bad" };

/**
 * The map's story at quarter t in one line: the biggest push from outside the player's hands
 * (a shock, the economy's own drift) and the player's own biggest push, on the same goal where
 * the player has one. Built from the arrows the map draws (drawnAt), so the island view names
 * exactly what the map shows.
 */
export function headline(story: Story, t: number, max: number): { top: HeadPush | null; mine: HeadPush | null } {
  const { drawn } = drawnAt(story, t, max);
  const cause = (id: string) => story.causes.find((c) => c.id === id);
  const push = (d: Drawn): HeadPush | null => {
    const c = cause(d.flow.cause);
    const o = story.outcomes.find((x) => x.metric === d.flow.metric);
    if (!c || !o) return null;
    return { cause: c, metric: d.flow.metric, goal: o.label.toLowerCase(), value: d.value, tone: Math.sign(d.value) === o.good(t) ? "good" : "bad" };
  };
  const byPush = (a: Drawn, b: Drawn) => b.n - a.n;
  const outside = drawn.filter((d) => cause(d.flow.cause)?.kind !== "lever").sort(byPush);
  const levers = drawn.filter((d) => cause(d.flow.cause)?.kind === "lever").sort(byPush);
  const top = outside[0] ? push(outside[0]) : null;
  const mineD = (top && levers.find((d) => d.flow.metric === top.metric)) ?? levers[0];
  return { top, mine: mineD ? push(mineD) : null };
}

/** Largest push on any flow, any quarter shown: one scale for the whole strip of time, so arrows grow as effects build. */
export function maxPush(story: Story): number {
  let top = 0;
  for (const f of story.flows) for (let t = story.first; t <= story.end; t++) top = Math.max(top, Math.abs(f.values[t] ?? 0) / metricRef(f.metric));
  return Math.max(top, 0.5);
}
