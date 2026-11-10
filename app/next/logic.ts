// The "next" play screen's brains, kept pure so node --test can run them.
//
// Three things the screen needs that the classic screen never computed:
//   1. Advisor plans: each advisor's best single move for the coming quarter,
//      found by trying a small menu of moves on the staff forecast.
//   2. The lever's journey: what the player's changes do to each goal, when the
//      effect peaks and where it stands at the goal date.
//   3. "Call it" questions: a prediction to make before the forecast is shown,
//      with the answer read off the model.

import { policyAt, quarterLabel, simulate } from "../model/economy.ts";
import { getPreset } from "../model/presets.ts";
import type { Policy, QuarterState, ScenarioConfig, ScheduledShock, SimEvent } from "../model/types.ts";
import { SHOCKS } from "../model/shocks.ts";
import { knownConfig, missionOutcome, policyForTurn, yearQuarters, yearValue, type AdvisorId, type LeverId, type MetricKey, type Mission, type Objective, type Outcome } from "../game/missions.ts";
import { affordable, ledger } from "../game/politics.ts";

export const trim = (v: number, d = 2) => v.toFixed(d).replace(/\.?0+$/, "");

/** Staff forecast with what is known before deciding for clock + 1 (same as the game store's forecastFor). */
export function forecastOf(config: ScenarioConfig, clock: number): QuarterState[] {
  return simulate(knownConfig(config, clock)).path;
}

export function withChanges(config: ScenarioConfig, quarter: number, changes: Partial<Policy>): ScenarioConfig {
  if (!Object.keys(changes).length) return config;
  const existing = config.decisions.find((d) => d.quarter === quarter);
  const decisions = existing ? config.decisions.map((d) => (d.quarter === quarter ? { ...d, changes: { ...d.changes, ...changes } } : d)) : [...config.decisions, { quarter, changes }];
  return { ...config, decisions };
}

// ---- Goals ---------------------------------------------------------------------

/** The metrics the mission judges, primary goals first, each once. */
export function goalMetrics(mission: Mission): MetricKey[] {
  const out: MetricKey[] = [];
  for (const bonus of [false, true]) for (const o of mission.objectives) if (Boolean(o.bonus) === bonus && !out.includes(o.metric)) out.push(o.metric);
  return out;
}

const holds = (o: Objective, v: number) => (o.op === "<=" ? v <= o.threshold + 1e-9 : v >= o.threshold - 1e-9);

/**
 * The figure an objective will be judged on, looking from `clock`: the end
 * value, the worst quarter still ahead (or already played), or the year's value.
 */
export function judged(o: Objective, mission: Mission, actual: QuarterState[], forecast: QuarterState[], clock: number): { value: number; t: number; ok: boolean } {
  const end = mission.quarters;
  const at = (t: number) => (t <= clock ? actual[t] : forecast[t])[o.metric];
  if (o.when === "year") {
    const qs = yearQuarters(o, mission);
    const value = yearValue(o, mission, actual, forecast, clock);
    return { value, t: qs[qs.length - 1] ?? end, ok: holds(o, value) };
  }
  if (o.when === "end") return { value: at(end), t: end, ok: holds(o, at(end)) };
  let worst = Math.max(1, o.from ?? 1);
  for (let t = worst; t <= end; t++) if (o.op === "<=" ? at(t) > at(worst) : at(t) < at(worst)) worst = t;
  return { value: at(worst), t: worst, ok: holds(o, at(worst)) };
}

/** How far outside its goal an objective lands, in the metric's own units (0 when met). */
function miss(o: Objective, mission: Mission, actual: QuarterState[], forecast: QuarterState[], clock: number): number {
  const j = judged(o, mission, actual, forecast, clock);
  return Math.max(0, o.op === "<=" ? j.value - o.threshold : o.threshold - j.value);
}

/** Rough size of "one unit that matters" for each metric, so misses can be added up. */
const SCALE: Record<MetricKey, number> = { growth: 1, infl: 1, rate: 1, debt: 3, ob: 1, pb: 1, ca: 1, reserves: 0.5, unemp: 1, spread: 100, cred: 10, gfn: 2 };

// ---- Advisor plans --------------------------------------------------------------

export type PlanEffect = { metric: MetricKey; objective: Objective; value: number; t: number; ok: boolean; base: number; baseOk: boolean };

export type Plan = {
  /** Advisors who back this plan (two can land on the same move). */
  advisors: AdvisorId[];
  /** "Raise the rate to 9.5%". */
  title: string;
  changes: Partial<Policy>;
  hold: boolean;
  /** Where each primary goal lands under the plan, next to where it lands if nothing changes. */
  effects: PlanEffect[];
};

/** Which goals each advisor fights for (as in advisors.ts). */
const WATCHES: Record<AdvisorId, MetricKey[]> = {
  governor: ["infl", "cred", "rate"],
  minister: ["growth", "unemp"],
  chief: ["debt", "reserves", "spread", "ob", "pb", "gfn", "ca"],
};

/** A tie-break taste for each advisor when every goal is met: lower inflation, more growth, less debt. */
const TASTE: Record<AdvisorId, (end: QuarterState, low: QuarterState) => number> = {
  governor: (end) => end.infl,
  minister: (_end, low) => -low.growth,
  chief: (end) => end.debt / 3 - end.reserves / 2,
};

type Move = { lever: LeverId; changes: Partial<Policy>; size: number };

/** The menu of single moves the unlocked levers allow from the current policy. */
export function moveMenu(policy: Policy, unlocked: Set<LeverId>): Move[] {
  const out: Move[] = [];
  const pegged = policy.fxRegime === "peg";
  if (unlocked.has("rate") && policy.rateMode === "manual" && !pegged) {
    for (const d of [-2, -1, -0.5, 0.5, 1, 2]) {
      const v = Math.min(20, Math.max(0, policy.manualRate + d));
      if (v !== policy.manualRate) out.push({ lever: "rate", changes: { manualRate: v }, size: Math.abs(d) });
    }
  }
  if (unlocked.has("rule") && policy.rateMode === "rule" && !pegged) {
    for (const v of [0.6, 1, 1.5, 2, 2.5]) if (Math.abs(v - policy.ruleStrength) > 0.05) out.push({ lever: "rule", changes: { ruleStrength: v }, size: Math.abs(v - policy.ruleStrength) * 2 });
  }
  if (unlocked.has("fiscal")) {
    for (const d of [-1, -0.5, 0.5, 1]) {
      const v = Math.min(3, Math.max(-2, policy.fiscalAdjustment + d));
      if (v !== policy.fiscalAdjustment) out.push({ lever: "fiscal", changes: { fiscalAdjustment: v }, size: Math.abs(d) * 2 });
    }
  }
  if (unlocked.has("investment")) {
    for (const d of [-0.5, 0.5, 1]) {
      const v = Math.min(8, Math.max(1, policy.publicInvestment + d));
      if (v !== policy.publicInvestment) out.push({ lever: "investment", changes: { publicInvestment: v }, size: Math.abs(d) * 2 });
    }
  }
  if (unlocked.has("fxRegime")) {
    if (policy.fxRegime !== "float") out.push({ lever: "fxRegime", changes: { fxRegime: "float" }, size: 2 });
    if (policy.fxRegime === "float") out.push({ lever: "fxRegime", changes: { fxRegime: "managed", fxIntervention: 50 }, size: 2 });
  }
  if (unlocked.has("intervention") && policy.fxRegime === "managed") {
    for (const v of [0, 50, 100]) if (Math.abs(v - policy.fxIntervention) >= 25) out.push({ lever: "intervention", changes: { fxIntervention: v }, size: 1 });
  }
  if (unlocked.has("controls") && !policy.capitalControls) out.push({ lever: "controls", changes: { capitalControls: true }, size: 2 });
  // A programme pays out only while the budget tightens by half a point a year or more.
  if (unlocked.has("imf") && policy.imfProgram === 0) {
    out.push({ lever: "imf", changes: { imfProgram: 2, fiscalAdjustment: Math.max(0.5, policy.fiscalAdjustment) }, size: 6 });
    out.push({ lever: "imf", changes: { imfProgram: 4, fiscalAdjustment: Math.max(0.5, policy.fiscalAdjustment) }, size: 7 });
    out.push({ lever: "imf", changes: { imfProgram: 6, fiscalAdjustment: Math.max(1, policy.fiscalAdjustment) }, size: 8 });
  }
  return out;
}

/** A plain verb phrase for a set of changes, relative to the policy in force. */
export function planTitle(policy: Policy, changes: Partial<Policy>): string {
  const parts: string[] = [];
  if (changes.manualRate !== undefined) parts.push(`${changes.manualRate > policy.manualRate ? "Raise" : "Cut"} the rate to ${trim(changes.manualRate)}%`);
  if (changes.ruleStrength !== undefined) parts.push(`Make the rate rule ${changes.ruleStrength > policy.ruleStrength ? "tougher" : "gentler"} (×${changes.ruleStrength.toFixed(1)})`);
  if (changes.imfProgram !== undefined && changes.imfProgram > policy.imfProgram) parts.push(`Call the IMF (${trim(changes.imfProgram)}% of GDP a year)`);
  if (changes.fiscalAdjustment !== undefined && changes.fiscalAdjustment !== policy.fiscalAdjustment) {
    const v = changes.fiscalAdjustment;
    if (changes.imfProgram !== undefined) parts.push(`tighten the budget ${trim(v)} pp a year`);
    else if (v === 0) parts.push("Stop changing the budget");
    else parts.push(`${v > 0 ? "Tighten" : "Loosen"} the budget by ${trim(Math.abs(v))} pp of GDP a year`);
  }
  if (changes.publicInvestment !== undefined) parts.push(`${changes.publicInvestment > policy.publicInvestment ? "Raise" : "Cut"} public investment to ${trim(changes.publicInvestment)}% of GDP`);
  if (changes.fxRegime !== undefined) parts.push(changes.fxRegime === "float" ? "Let the currency float" : changes.fxRegime === "managed" ? "Manage the currency" : "Peg the currency");
  if (changes.fxIntervention !== undefined && changes.fxRegime === undefined) parts.push(changes.fxIntervention === 0 ? "Stop selling reserves" : `Meet ${Math.round(changes.fxIntervention)}% of currency pressure from reserves`);
  if (changes.capitalControls !== undefined) parts.push(changes.capitalControls ? "Slow money leaving (capital flow measures)" : "Lift capital flow measures");
  if (!parts.length) return "Hold steady";
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function effectsOf(mission: Mission, actual: QuarterState[], path: QuarterState[], base: QuarterState[], clock: number): PlanEffect[] {
  const seen = new Set<string>();
  const out: PlanEffect[] = [];
  for (const o of mission.objectives) {
    if (o.bonus || seen.has(o.id)) continue;
    seen.add(o.id);
    const j = judged(o, mission, actual, path, clock);
    const b = judged(o, mission, actual, base, clock);
    out.push({ metric: o.metric, objective: o, value: j.value, t: j.t, ok: j.ok, base: b.value, baseOk: b.ok });
  }
  return out;
}

/**
 * Each advisor's best move for the quarter being decided, judged on the staff
 * forecast. Everyone wants the mission won; each weighs their own goals three
 * times as much and breaks ties their own way. `config` is the scenario at the
 * start of the turn.
 */
export function advisorPlans(mission: Mission, config: ScenarioConfig, actual: QuarterState[], clock: number): Plan[] {
  const quarter = clock + 1;
  const policy = policyForTurn(config, clock);
  const end = mission.quarters;
  const base = forecastOf(config, clock);
  type Candidate = { move: Move | null; path: QuarterState[]; events: SimEvent[]; lostVote: boolean };
  // An election lost on the forecast ends the mission, whatever the goals say.
  const losesVote = (c: ScenarioConfig, path: QuarterState[], events: SimEvent[]) => ledger(mission.politics, c, path, events, end).elections.some((e) => e.quarter > clock && !e.won);
  const held = simulate(knownConfig(config, clock));
  const candidates: Candidate[] = [{ move: null, path: base, events: held.events, lostVote: losesVote(config, held.path, held.events) }];
  for (const move of moveMenu(policy, new Set(mission.unlocks))) {
    const next = withChanges(config, quarter, move.changes);
    const result = simulate(knownConfig(next, clock));
    if (!affordable(mission.politics, next, result.path, result.events, end).ok) continue;
    candidates.push({ move, path: result.path, events: result.events, lostVote: losesVote(next, result.path, result.events) });
  }
  const lowOf = (path: QuarterState[]) => {
    let low = path[Math.min(quarter, end)];
    for (let t = quarter; t <= end; t++) if (path[t].growth < low.growth) low = path[t];
    return low;
  };
  const score = (advisor: AdvisorId, c: Candidate) => {
    let s = 0;
    for (const o of mission.objectives) {
      const m = miss(o, mission, actual, c.path, clock) / SCALE[o.metric];
      const mine = WATCHES[advisor].includes(o.metric);
      s += m * (o.bonus ? (mine ? 1 : 0.2) : mine ? 6 : 2);
    }
    for (const rule of mission.fail) {
      if ("event" in rule) {
        if (c.events.some((e) => e.title === rule.event && e.quarter <= end)) s += 40;
        continue;
      }
      for (let t = quarter; t <= end; t++) {
        const v = c.path[t][rule.metric];
        if (rule.op === "<" ? v < rule.threshold : v > rule.threshold) s += 20;
      }
    }
    if (c.lostVote) s += 40;
    // Room to spare on their own goals: everyone likes a little, the mission chief likes a lot
    // ("build buffers before the shock"), which is what makes that advice differ in calm quarters.
    const cap = advisor === "chief" ? 4 : 1;
    for (const o of mission.objectives) {
      if (o.bonus || !WATCHES[advisor].includes(o.metric)) continue;
      const j = judged(o, mission, actual, c.path, clock);
      const room = (o.op === "<=" ? o.threshold - j.value : j.value - o.threshold) / SCALE[o.metric];
      s -= 0.4 * Math.min(cap, Math.max(0, room));
    }
    s += 0.06 * TASTE[advisor](c.path[end], lowOf(c.path));
    // Smaller moves win ties; a programme or a regime change needs a goal at stake.
    s += 0.05 * (c.move?.size ?? 0);
    return s;
  };
  const plans: Plan[] = [];
  for (const advisor of mission.advisors) {
    let best = candidates[0];
    let bestScore = score(advisor, best);
    for (const c of candidates.slice(1)) {
      const sc = score(advisor, c);
      if (sc < bestScore - 1e-6) {
        best = c;
        bestScore = sc;
      }
    }
    const changes = best.move?.changes ?? {};
    const key = JSON.stringify(changes);
    const same = plans.find((p) => JSON.stringify(p.changes) === key);
    if (same) same.advisors.push(advisor);
    else plans.push({ advisors: [advisor], title: planTitle(policy, changes), changes, hold: !best.move, effects: effectsOf(mission, actual, best.path, base, clock) });
  }
  return plans;
}

// ---- The lever's journey ---------------------------------------------------------

export type Journey = {
  metric: MetricKey;
  /** Effect in each quarter from clock + 1 to the mission's end (path minus baseline). */
  series: number[];
  from: number;
  /** Effect in the quarter being decided. */
  next: number;
  /** The largest effect and when it comes. */
  peak: number;
  peakT: number;
  /** Effect at the mission's end. */
  end: number;
};

/** What the player's changes do to a metric over time: the forecast minus the same forecast without them. */
export function journey(metric: MetricKey, forecast: QuarterState[], base: QuarterState[], clock: number, end: number): Journey {
  const from = clock + 1;
  const series: number[] = [];
  let peakT = from;
  for (let t = from; t <= end; t++) {
    const d = forecast[t][metric] - base[t][metric];
    series.push(d);
    if (Math.abs(d) > Math.abs(series[peakT - from])) peakT = t;
  }
  return { metric, series, from, next: series[0] ?? 0, peak: series[peakT - from] ?? 0, peakT, end: series[series.length - 1] ?? 0 };
}

// ---- Call it ------------------------------------------------------------------------

export type Call = {
  id: string;
  kind: "shock" | "lag";
  prompt: string;
  options: { id: string; label: string }[];
  answer: string;
  /** One sentence shown after answering, right or wrong. */
  reveal: string;
};

const NOUN: Partial<Record<MetricKey, string>> = { infl: "inflation", growth: "growth", debt: "public debt", reserves: "reserves", unemp: "unemployment", spread: "the bond spread", ca: "the current account", cred: "credibility", ob: "the budget balance", pb: "the primary balance", gfn: "financing needs" };
const UNIT: Partial<Record<MetricKey, string>> = { infl: "%", growth: "%", debt: "% of GDP", reserves: " months", unemp: "%", spread: " bp", ca: "% of GDP", ob: "% of GDP", pb: "% of GDP", gfn: "% of GDP" };
const BAND: Record<MetricKey, number> = { growth: 0.4, infl: 0.4, rate: 0.25, debt: 1, ob: 0.3, pb: 0.3, ca: 0.4, reserves: 0.3, unemp: 0.3, spread: 30, cred: 3, gfn: 0.5 };

/**
 * When a shock lands: "if you change nothing, where is inflation in a year?"
 * The answer is the staff forecast under the policy in force.
 */
export function shockCall(mission: Mission, config: ScenarioConfig, actual: QuarterState[], clock: number, shock: ScheduledShock): Call | null {
  const metric = goalMetrics(mission)[0];
  if (!metric || !NOUN[metric]) return null;
  const end = mission.quarters;
  const t = Math.min(end, clock + 4);
  if (t - clock < 2) return null;
  const hold = forecastOf(config, clock);
  const now = actual[clock][metric];
  const then = hold[t][metric];
  const band = BAND[metric];
  const answer = then > now + band ? "higher" : then < now - band ? "lower" : "same";
  const unit = UNIT[metric] ?? "";
  const digits = metric === "spread" ? 0 : 1;
  const name = SHOCKS[shock.kind].name.toLowerCase();
  const peakT = (() => {
    let p = clock + 1;
    for (let q = clock + 1; q <= t; q++) if (Math.abs(hold[q][metric] - now) > Math.abs(hold[p][metric] - now)) p = q;
    return p;
  })();
  const path = `${NOUN[metric]} goes from ${now.toFixed(digits)}${unit} today to ${hold[peakT][metric].toFixed(digits)}${unit} in ${quarterLabel(peakT)}${peakT === t ? "" : `, and is at ${then.toFixed(digits)}${unit} by ${quarterLabel(t)}`}`;
  return {
    id: `shock:${shock.id}`,
    kind: "shock",
    prompt: `The ${name} hits. If you change nothing, where will ${NOUN[metric]} be a year from now, compared with today's ${now.toFixed(digits)}${unit}?`,
    options: [
      { id: "higher", label: "Clearly higher" },
      { id: "same", label: "About the same" },
      { id: "lower", label: "Clearly lower" },
    ],
    answer,
    reveal: `On the staff forecast with policy unchanged, ${path}.`,
  };
}

/**
 * After the player moves a lever: "when does this hit hardest?" The answer is
 * the quarter where the forecast with the move is furthest from the forecast without it.
 */
export function lagCall(mission: Mission, forecast: QuarterState[], base: QuarterState[], clock: number, moveName: string): Call | null {
  const end = mission.quarters;
  if (end - clock < 5) return null;
  let best: Journey | null = null;
  for (const metric of goalMetrics(mission)) {
    if (!NOUN[metric]) continue;
    const j = journey(metric, forecast, base, clock, end);
    if (Math.abs(j.peak) / SCALE[metric] < 0.15) continue;
    if (!best || Math.abs(j.peak) / SCALE[metric] > Math.abs(best.peak) / SCALE[best.metric]) best = j;
  }
  if (!best) return null;
  const ahead = best.peakT - clock;
  const answer = ahead <= 1 ? "now" : ahead <= 3 ? "soon" : "later";
  const digits = best.metric === "spread" ? 0 : 1;
  const unit = best.metric === "spread" ? " bp" : best.metric === "reserves" ? " months" : " pp";
  const sign = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(Math.abs(v) < 0.1 && digits === 1 ? 2 : digits)}${unit}`;
  return {
    id: `lag:${best.metric}`,
    kind: "lag",
    prompt: `${moveName}. When will ${NOUN[best.metric]} feel it most?`,
    options: [
      { id: "now", label: "Right away, this quarter" },
      { id: "soon", label: "In about half a year" },
      { id: "later", label: "A year or more from now" },
    ],
    answer,
    reveal: `It moves ${NOUN[best.metric]} by ${sign(best.next)} this quarter and by ${sign(best.peak)} at its strongest, in ${quarterLabel(best.peakT)}: ${ahead} quarter${ahead === 1 ? "" : "s"} from now.`,
  };
}

/** A short name for what changed this turn ("Your rate hike to 10.5%"), for prompts and captions. */
export function moveName(before: Policy, after: Policy): string {
  const changes: Partial<Policy> = {};
  for (const k of Object.keys(after) as (keyof Policy)[]) if (after[k] !== before[k]) (changes as Record<string, unknown>)[k] = after[k];
  if (!Object.keys(changes).length) return "You held policy";
  const keys = Object.keys(changes);
  if (keys.length === 1 && changes.manualRate !== undefined) return `You ${changes.manualRate > before.manualRate ? "raised" : "cut"} the rate to ${trim(changes.manualRate)}%`;
  if (keys.length === 1 && changes.fiscalAdjustment !== undefined) return `You ${changes.fiscalAdjustment > before.fiscalAdjustment ? "tightened" : "loosened"} the budget`;
  if (keys.length === 1 && changes.fxRegime !== undefined) return changes.fxRegime === "float" ? "You floated the currency" : "You changed the currency regime";
  return "You changed policy";
}

/** The policy in force in quarter t under a config. */
export function policyIn(config: ScenarioConfig, t: number): Policy {
  return policyAt(getPreset(config.presetId).defaultPolicy, config.decisions, t);
}

// ---- Whose advice was right? ---------------------------------------------------------

export type AdvisorRun = {
  advisor: AdvisorId;
  /** The whole path under the advisor's plans (the outturn up to where it ended, the forecast after). */
  path: QuarterState[];
  outcome: Outcome;
  /** The quarter the run ended in (the mission's last, or where it was lost). */
  endedAt: number;
  /** What the advisor did, in order ("2026Q1: Raise the rate to 9.5%"). */
  moves: { quarter: number; title: string }[];
};

/**
 * Replays the mission backing one advisor's plan every quarter, a quarter per
 * step() so a screen can stay responsive. The advisor sees what the player
 * saw: the staff forecast, with surprises only once they hit. (It does not
 * adopt institutions, and the confidence crisis that follows a collapse in
 * trust is left out.)
 */
export function advisorRun(mission: Mission, advisor: AdvisorId): { step: () => boolean; result: () => AdvisorRun } {
  let config = mission.setup();
  let clock = 0;
  let outcome: Outcome = { kind: "playing" };
  const moves: { quarter: number; title: string }[] = [];
  const end = mission.quarters;
  return {
    step() {
      if (outcome.kind !== "playing" || clock >= end) return true;
      const actual = simulate(config).path;
      const plan = advisorPlans(mission, config, actual, clock).find((p) => p.advisors.includes(advisor));
      if (plan && !plan.hold) {
        config = withChanges(config, clock + 1, plan.changes);
        moves.push({ quarter: clock + 1, title: plan.title });
      }
      clock += 1;
      outcome = missionOutcome(mission, simulate(config), forecastOf(config, clock), clock, config);
      return outcome.kind !== "playing" || clock >= end;
    },
    result() {
      const truth = simulate(config).path;
      const forecast = forecastOf(config, clock);
      return { advisor, path: truth.map((s, t) => (t <= clock ? s : forecast[t] ?? s)), outcome, endedAt: clock, moves };
    },
  };
}
