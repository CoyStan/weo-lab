// Campaign missions: short, goal-driven episodes on top of the scenario model.
//
// A mission picks an economy, a number of quarters, the levers the player may
// touch, the shocks that will hit (some announced, some surprises) and the
// objectives that decide the outcome. Everything here is pure so it can be
// tested with node --test.

import { baselineConfig, policyAt, quarterLabel as quarterLabelFor } from "../model/economy.ts";
import { getPreset } from "../model/presets.ts";
import type { Policy, QuarterState, ScenarioConfig, ScheduledShock, ShockKind, SimResult } from "../model/types.ts";
import { ledger, type PoliticsRules } from "./politics.ts";

/** Controls the player can be given. Several map to more than one policy field. */
export type LeverId =
  | "rate"
  | "rule"
  | "fiscal"
  | "mix"
  | "investment"
  | "fxRegime"
  | "intervention"
  | "controls"
  | "reforms"
  | "imf"
  | "devalue"
  | "restructure";

export type MetricKey = "growth" | "infl" | "rate" | "debt" | "ob" | "pb" | "ca" | "reserves" | "unemp" | "spread" | "cred" | "gfn";

export type Objective = {
  id: string;
  /** Plain-language goal shown to the player. */
  label: string;
  metric: MetricKey;
  op: "<=" | ">=";
  threshold: number;
  /** "end": judged at the mission's last quarter. "every": must hold each quarter from `from`. */
  when: "end" | "every";
  from?: number;
  /** Bonus objectives earn stars; they never fail the mission. */
  bonus?: boolean;
};

export type FailRule = { metric: MetricKey; op: "<" | ">"; threshold: number; message: string } | { event: string; message: string };

export type AdvisorId = "governor" | "minister" | "chief";

export type Mission = {
  id: string;
  number: number;
  title: string;
  presetId: string;
  /** One line under the title in the mission list. */
  kicker: string;
  /** Briefing paragraphs, written to the player. */
  briefing: string[];
  /** The lesson in one sentence, shown after a win. */
  lesson: string;
  /** A concrete nudge for players who are stuck. */
  hint: string;
  /** Last quarter of the mission (1..24). */
  quarters: number;
  unlocks: LeverId[];
  advisors: AdvisorId[];
  objectives: Objective[];
  fail: FailRule[];
  /** Builds the scenario. Shocks whose id starts with "surprise" stay hidden until they hit. */
  setup: () => ScenarioConfig;
  politics: PoliticsRules;
};

const shock = (id: string, kind: ShockKind, quarter: number, magnitude = 1): ScheduledShock => ({ id, kind, quarter, magnitude, source: "scheduled" });

export const MISSIONS: Mission[] = [
  {
    id: "first-quarter",
    number: 1,
    title: "Your first rate decision",
    presetId: "aurelia",
    kicker: "One lever, one goal: bring inflation home without a recession.",
    briefing: [
      "Welcome to the central bank of Aurelia. A failed harvest has pushed food prices up, and inflation is running well above the 4% target.",
      "You set the policy rate each quarter. Raising it cools demand and, with a lag, inflation. Raise it too far and the economy stalls.",
      "Get inflation down to 4.5% or below by the end of 2027, and keep growth above 1.5% along the way.",
    ],
    lesson: "Monetary policy works with a lag: the rate you set today shows up in inflation two to four quarters later.",
    hint: "Raise the rate early, by about two points, then bring it back down once inflation turns. Rates take a few quarters to bite.",
    quarters: 8,
    unlocks: ["rate"],
    advisors: ["governor", "minister"],
    objectives: [
      { id: "infl-end", label: "Inflation at or below 4.5% by the end of 2027", metric: "infl", op: "<=", threshold: 4.5, when: "end" },
      { id: "growth-floor", label: "Growth stays above 1.5% every quarter", metric: "growth", op: ">=", threshold: 1.5, when: "every", from: 1 },
      { id: "infl-peak", label: "Inflation peaks at 8.6% or lower", metric: "infl", op: "<=", threshold: 8.6, when: "every", from: 1, bonus: true },
      { id: "growth-end", label: "Growth back to 3.5% or more by the end", metric: "growth", op: ">=", threshold: 3.5, when: "end", bonus: true },
    ],
    fail: [{ metric: "infl", op: ">", threshold: 12, message: "Inflation passed 12% and expectations came unanchored." }],
    politics: { start: { votes: 4, trust: 2 }, elections: [], threshold: 0, institutions: ["forward-guidance"] },
    setup: () => {
      const base = baselineConfig("aurelia");
      return {
        ...base,
        decisions: [{ quarter: 0, changes: { rateMode: "manual", manualRate: 8.5 } }],
        shocks: [shock("known-food", "food-price", 1, 1)],
      };
    },
  },
  {
    id: "cost-shock",
    number: 2,
    title: "A cost shock",
    presetId: "aurelia",
    kicker: "A policy rule, a surprise, and how hard to lean against it.",
    briefing: [
      "Aurelia's central bank sets rates with a policy rule: the rate moves automatically with inflation and the output gap.",
      "The previous board made the rule timid. It raises the rate by only 0.6 points for each point of excess inflation, so a real rate that barely moves.",
      "Costs are rising across the region. Bring inflation down to 4% by the end of 2028, and don't let growth fall below −0.5% in any quarter.",
    ],
    lesson: "A rule must move the rate by more than one point for each point of inflation, but against a supply shock, overreacting turns a price problem into a recession.",
    hint: "Make the rule react harder before the shock lands, somewhere around ×1.5 to ×1.8. Much harder than that and growth drops below zero.",
    quarters: 12,
    unlocks: ["rate", "rule"],
    advisors: ["governor", "minister"],
    objectives: [
      { id: "infl-end", label: "Inflation at or below 4% by the end of 2028", metric: "infl", op: "<=", threshold: 4, when: "end" },
      { id: "growth-floor", label: "Growth never below −0.5%", metric: "growth", op: ">=", threshold: -0.5, when: "every", from: 1 },
      { id: "cred", label: "Credibility at 59 or more at the end", metric: "cred", op: ">=", threshold: 59, when: "end", bonus: true },
      { id: "growth-end", label: "Growth at 3% or more at the end", metric: "growth", op: ">=", threshold: 3, when: "end", bonus: true },
    ],
    fail: [{ metric: "infl", op: ">", threshold: 12, message: "Inflation passed 12% and expectations came unanchored." }],
    politics: { start: { votes: 4, trust: 3 }, elections: [], threshold: 0, institutions: ["forward-guidance"] },
    setup: () => {
      const base = baselineConfig("aurelia");
      return { ...base, decisions: [{ quarter: 0, changes: { ruleStrength: 0.6 } }], shocks: [shock("surprise-supply", "supply-shock", 4, 1.5)] };
    },
  },
  {
    id: "debt-mountain",
    number: 3,
    title: "The debt mountain",
    presetId: "castellan",
    kicker: "Fiscal policy: turn debt around without wrecking the job market.",
    briefing: [
      "Castellan owes 108% of GDP, and on current policies that keeps creeping up.",
      "You now run the budget. Tightening (a higher primary balance) brings debt down over time but costs growth now. Spending cuts hurt growth more than tax rises; public investment helps growth later.",
      "Get debt below where it started by the end of 2029, and keep unemployment at or below 7%.",
    ],
    lesson: "Debt falls when the primary surplus beats the gap between interest rates and growth; phasing adjustment in keeps that growth alive.",
    hint: "Tighten by about one point of GDP a year from the start, split between cuts and taxes. That keeps growth above 0.5% while debt turns.",
    quarters: 16,
    unlocks: ["fiscal", "mix", "investment"],
    advisors: ["minister", "chief"],
    objectives: [
      { id: "debt-end", label: "Debt below 107% of GDP by the end of 2029", metric: "debt", op: "<=", threshold: 107, when: "end" },
      { id: "jobs", label: "Unemployment at or below 7% every quarter", metric: "unemp", op: "<=", threshold: 7, when: "every", from: 1 },
      { id: "growth-floor", label: "Growth never below 0.5%", metric: "growth", op: ">=", threshold: 0.5, when: "every", from: 1, bonus: true },
      { id: "debt-deep", label: "Debt at or below 105% at the end", metric: "debt", op: "<=", threshold: 105, when: "end", bonus: true },
    ],
    fail: [{ metric: "unemp", op: ">", threshold: 9, message: "Unemployment passed 9% and the government fell." }],
    politics: { start: { votes: 5, trust: 3 }, elections: [8, 16], threshold: 3, institutions: ["fiscal-rule", "tax-admin", "debt-office", "investment-agency", "safety-net"] },
    setup: () => baselineConfig("castellan"),
  },
  {
    id: "commodity-bust",
    number: 4,
    title: "When the price falls",
    presetId: "boreas",
    kicker: "The exchange rate as a shock absorber, and what buffers are for.",
    briefing: [
      "Boreas lives off its commodity exports and runs a managed float: the central bank sells reserves to slow any fall in the currency.",
      "Analysts warn that commodity prices are due for a correction. When it comes, export revenue and tax receipts drop together.",
      "Keep reserves at six and a half months of imports or more, and the budget deficit no wider than 5% of GDP, through 2028.",
    ],
    lesson: "A flexible exchange rate absorbs a terms-of-trade shock that reserves alone can only delay.",
    hint: "Build a buffer before the bust: tighten the budget by a point straight away. When prices fall, let the currency float instead of spending reserves.",
    quarters: 12,
    unlocks: ["rate", "rule", "fxRegime", "intervention", "fiscal"],
    advisors: ["governor", "minister", "chief"],
    objectives: [
      { id: "reserves", label: "Reserves at 6.5 months of imports or more every quarter", metric: "reserves", op: ">=", threshold: 6.5, when: "every", from: 1 },
      { id: "deficit", label: "Deficit no wider than 5% of GDP every quarter", metric: "ob", op: ">=", threshold: -5, when: "every", from: 1 },
      { id: "growth", label: "Growth never below −1%", metric: "growth", op: ">=", threshold: -1, when: "every", from: 1, bonus: true },
      { id: "debt", label: "Debt at or below 47% of GDP at the end", metric: "debt", op: "<=", threshold: 47, when: "end", bonus: true },
    ],
    fail: [{ metric: "reserves", op: "<", threshold: 4, message: "Reserves fell below four months of imports and the central bank lost its buffer." }],
    politics: { start: { votes: 5, trust: 3 }, elections: [8], threshold: 3, institutions: ["swap-line", "macroprudential", "fiscal-rule", "tax-admin", "safety-net"] },
    setup: () => ({ ...baselineConfig("boreas"), shocks: [shock("surprise-bust", "commodity-bust", 3, 1.2)] }),
  },
  {
    id: "defend-peg",
    number: 5,
    title: "Holding the line",
    presetId: "dumara",
    kicker: "A peg, thin reserves and an IMF programme with conditions.",
    briefing: [
      "Dumara pegs its currency, and reserves cover just two months of imports. Left alone, they run out in 2028 and the peg breaks.",
      "An IMF programme can lend reserves, but it only disburses while you tighten the budget by at least half a point of GDP a year. You can also devalue once, or float.",
      "Rebuild reserves to three months of imports by the end of 2028 and keep spreads at or below 750 basis points.",
    ],
    lesson: "Programme financing buys time; the fiscal adjustment that unlocks it is what restores confidence.",
    hint: "Ask for an IMF programme of around 6% of GDP a year, and tighten the budget by a point so it keeps paying out.",
    quarters: 12,
    unlocks: ["rate", "fiscal", "mix", "fxRegime", "intervention", "imf", "devalue"],
    advisors: ["governor", "minister", "chief"],
    objectives: [
      { id: "reserves-end", label: "Reserves at 3 months of imports or more by the end of 2028", metric: "reserves", op: ">=", threshold: 3, when: "end" },
      { id: "spread", label: "Spread at or below 750 bp every quarter", metric: "spread", op: "<=", threshold: 750, when: "every", from: 1 },
      { id: "debt", label: "Debt at or below 85% of GDP at the end", metric: "debt", op: "<=", threshold: 85, when: "end", bonus: true },
      { id: "reserves-deep", label: "Reserves at 5 months or more at the end", metric: "reserves", op: ">=", threshold: 5, when: "end", bonus: true },
    ],
    fail: [
      { event: "Peg abandoned", message: "Reserves ran out and the peg broke." },
      { metric: "reserves", op: "<", threshold: 0.8, message: "Reserves fell below a month of imports." },
    ],
    politics: { start: { votes: 5, trust: 2 }, elections: [8], threshold: 2, institutions: ["swap-line", "fiscal-rule", "tax-admin", "debt-office", "cb-independence", "safety-net"] },
    setup: () => baselineConfig("dumara"),
  },
  {
    id: "sudden-stop",
    number: 6,
    title: "Sudden stop",
    presetId: "aurelia",
    kicker: "Everything unlocked. Capital leaves, and every tool has a cost.",
    briefing: [
      "Aurelia again, and this time the real exchange rate can move. Global investors are skittish.",
      "Every lever is yours: rates, the rule, the budget, the exchange-rate regime, intervention, capital flow measures and reforms.",
      "Through 2029, keep debt at or below 72% of GDP, inflation at or below 6%, and reserves above 2.5 months of imports.",
    ],
    lesson: "In a sudden stop, every tool trades one risk for another; the best mix shares the burden across rates, reserves and the exchange rate.",
    hint: "When capital leaves, share the burden: tighten the budget by about a point and take a small IMF programme, rather than burning reserves on the currency.",
    quarters: 16,
    unlocks: ["rate", "rule", "fiscal", "mix", "investment", "fxRegime", "intervention", "controls", "reforms", "imf"],
    advisors: ["governor", "minister", "chief"],
    objectives: [
      { id: "debt", label: "Debt at or below 72% of GDP every quarter", metric: "debt", op: "<=", threshold: 72, when: "every", from: 1 },
      { id: "infl", label: "Inflation at or below 6% every quarter", metric: "infl", op: "<=", threshold: 6, when: "every", from: 1 },
      { id: "reserves", label: "Reserves above 2.5 months every quarter", metric: "reserves", op: ">=", threshold: 2.5, when: "every", from: 1 },
      { id: "spread", label: "Spread peaks at 760 bp or lower", metric: "spread", op: "<=", threshold: 760, when: "every", from: 1, bonus: true },
      { id: "growth", label: "Growth at 2.5% or more at the end", metric: "growth", op: ">=", threshold: 2.5, when: "end", bonus: true },
    ],
    fail: [{ metric: "spread", op: ">", threshold: 1000, message: "Spreads passed 1,000 bp and the sovereign lost market access." }],
    politics: { start: { votes: 5, trust: 3 }, elections: [8, 16], threshold: 3, institutions: ["cb-independence", "inflation-targeting", "forward-guidance", "fiscal-rule", "tax-admin", "debt-office", "investment-agency", "safety-net", "swap-line", "macroprudential"] },
    setup: () => {
      const base = baselineConfig("aurelia");
      return { ...base, assumptions: { ...base.assumptions, rerConvention: "model" }, shocks: [shock("surprise-stop", "sudden-stop", 5, 2), shock("surprise-downgrade", "downgrade", 7, 1)] };
    },
  },
];

export function getMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

// ---- What the player can see ------------------------------------------------

export const isSurprise = (s: ScheduledShock) => s.id.startsWith("surprise");

/**
 * The scenario as the staff would forecast it before deciding for quarter
 * `clock + 1`: every shock that has already hit, plus announced ones.
 */
export function knownConfig(config: ScenarioConfig, clock: number): ScenarioConfig {
  return { ...config, randomShocks: false, shocks: config.shocks.filter((s) => !isSurprise(s) || s.quarter <= clock + 1) };
}

/** Policy that will apply in the quarter being decided. */
export function policyForTurn(config: ScenarioConfig, clock: number): Policy {
  return policyAt(getPreset(config.presetId).defaultPolicy, config.decisions, clock + 1);
}

// ---- Objectives and outcomes -------------------------------------------------

export type ObjectiveStatus = "met" | "failed" | "on-track" | "at-risk";

const holds = (o: Objective, v: number) => (o.op === "<=" ? v <= o.threshold + 1e-9 : v >= o.threshold - 1e-9);

/**
 * Status of one objective at the end of quarter `clock`. Actual quarters come
 * from `actual`; quarters still ahead are judged on the staff `forecast`.
 */
export function objectiveStatus(o: Objective, mission: Mission, actual: QuarterState[], forecast: QuarterState[], clock: number): ObjectiveStatus {
  const end = mission.quarters;
  if (o.when === "end") {
    if (clock >= end) return holds(o, actual[end][o.metric]) ? "met" : "failed";
    return holds(o, forecast[end][o.metric]) ? "on-track" : "at-risk";
  }
  const from = Math.max(1, o.from ?? 1);
  for (let t = from; t <= Math.min(clock, end); t++) if (!holds(o, actual[t][o.metric])) return "failed";
  if (clock >= end) return "met";
  for (let t = Math.max(from, clock + 1); t <= end; t++) if (!holds(o, forecast[t][o.metric])) return "at-risk";
  return "on-track";
}

/** First quarter an objective breaks on a path, if any (for charts and recaps). */
export function firstBreach(o: Objective, path: QuarterState[], fromT: number, toT: number): number | null {
  const start = o.when === "end" ? toT : Math.max(fromT, o.from ?? 1);
  for (let t = start; t <= toT; t++) if (!holds(o, path[t][o.metric])) return t;
  return null;
}

export type Outcome =
  | { kind: "playing" }
  | { kind: "won"; stars: number; bonusMet: string[] }
  | { kind: "lost"; reason: string; objectiveId?: string };

export function missionOutcome(mission: Mission, actual: SimResult, forecast: QuarterState[], clock: number, config?: ScenarioConfig): Outcome {
  if (config) {
    const lost = ledger(mission.politics, config, actual.path, actual.events, Math.min(clock, mission.quarters)).elections.find((e) => !e.won);
    if (lost) return { kind: "lost", reason: `You lost the election in ${quarterLabelFor(lost.quarter)} with ${lost.votes} votes; you needed ${mission.politics.threshold}.` };
  }
  for (const rule of mission.fail) {
    if ("event" in rule) {
      if (actual.events.some((e) => e.title === rule.event && e.quarter <= clock)) return { kind: "lost", reason: rule.message };
    } else {
      for (let t = 1; t <= Math.min(clock, mission.quarters); t++) {
        const v = actual.path[t][rule.metric];
        if (rule.op === "<" ? v < rule.threshold : v > rule.threshold) return { kind: "lost", reason: rule.message };
      }
    }
  }
  for (const o of mission.objectives) {
    if (o.bonus) continue;
    if (objectiveStatus(o, mission, actual.path, forecast, clock) === "failed") return { kind: "lost", reason: `Missed: ${o.label.charAt(0).toLowerCase()}${o.label.slice(1)}.`, objectiveId: o.id };
  }
  if (clock < mission.quarters) return { kind: "playing" };
  const bonusMet = mission.objectives.filter((o) => o.bonus && objectiveStatus(o, mission, actual.path, forecast, clock) === "met").map((o) => o.id);
  return { kind: "won", stars: Math.min(3, 1 + bonusMet.length), bonusMet };
}
