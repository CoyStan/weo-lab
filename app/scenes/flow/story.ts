// What the flow island shows, derived from the game's own explanation logic
// (framework.ts channels(), explain.ts explain(), the drivers on each quarter).
// Pure: no React, no three.js.

import type { Channel } from "../../game/framework";
import { explain } from "../../game/explain";
import { SHOCKS } from "../../model/shocks";
import type { Policy, QuarterState, ShockKind } from "../../model/types";

export type Tone = "good" | "bad" | "warn" | "neutral";
export type LandmarkId = "town" | "hall" | "bank" | "port" | "market";

/** One landmark's plain state: "Prices 7.1% · rising +1.6 pp — food shock +2.0". */
export type LandmarkState = {
  id: LandmarkId;
  title: string;
  /** The figure, with its unit: "7.1%". */
  value: string;
  /** What the figure is: "inflation". */
  what: string;
  dir: "up" | "down" | "flat";
  /** "rising +1.6 pp" */
  move: string;
  /** "food shock +2.0" (the largest push this quarter), or "". */
  why: string;
  tone: Tone;
  /** Short phone form: "Prices ▲ 7.1%". */
  short: string;
};

export type FlowId = "credit" | "spending" | "public" | "taxes" | "imports" | "exports" | "capital";

/** How thick each flow runs: 1 = as at the start of the mission. */
export type Flows = Record<FlowId, number> & { capitalIn: boolean };

export type StageNode = "bank" | "banks" | "town" | "market" | "hall" | "port";

export type Stage = {
  node: StageNode;
  /** The channel's own link label: "Demand". */
  label: string;
  /** When it arrives, from the channel's chain: "next quarter". */
  when: string;
  /** Quarters after the decision (for timing the pulse). */
  lag: number;
  /** The forecast effect at that stage, in words: "−0.4 pp by 2026Q2", or "". */
  effect: string;
  tone: Tone;
};

/** A lever on its way through the economy. */
export type Pulse = { id: Channel["id"]; title: string; move: string; stages: Stage[] };

export type ShockProp = { kind: ShockKind; prop: "rain" | "tanker" | "ships-out" | "ships-in" | "storm" | "slump"; name: string; effect: string; tone: Tone };

const fmt = (v: number, d = 1) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : Math.abs(v).toFixed(d));
/** Signed with a true minus sign. */
export const signed = (v: number, d = 1) => {
  const s = fmt(v, d);
  if (Number(s) === 0) return (0).toFixed(d);
  return `${v > 0 ? "+" : "−"}${s}`;
};
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

const SHOCK_WORD: Record<ShockKind, string> = {
  "oil-spike": "oil shock",
  "global-recession": "world slump",
  "sudden-stop": "capital flight",
  "commodity-bust": "commodity bust",
  "supply-shock": "cost shock",
  "natural-disaster": "disaster",
  "banking-crisis": "bank crisis",
  pandemic: "pandemic",
  "food-price": "food shock",
  downgrade: "downgrade",
  "inflow-surge": "capital inflows",
};

/** The quarter the scene describes: the one just played, or the forecast for the next one (as the Macro framework does). */
export function focus(actual: QuarterState[], forecast: QuarterState[], clock: number) {
  const now = clock > 0 ? actual[clock] : forecast[1];
  const prev = clock > 0 ? actual[clock - 1] : actual[0];
  return { now, prev, forecastOnly: clock === 0 };
}

function reason(key: string, group: "infl" | "gap" | "debt", now: QuarterState): string {
  const shock = now.activeShocks[0];
  if (key === "shocks") return shock ? SHOCK_WORD[shock] : "shocks";
  const words: Record<string, string> = {
    expectations: "expectations",
    demand: "demand",
    currency: group === "debt" ? "currency on FX debt" : "the currency",
    oil: "oil prices",
    fading: "earlier swings fading",
    monetary: "interest rates",
    fiscal: "the budget",
    external: "trading partners",
    commodities: "commodity prices",
    confidence: "confidence",
    interestGrowth: "interest bill",
    primary: "budget deficit",
  };
  return words[key] ?? "other";
}

/** The biggest push on a variable this quarter, as "food shock +2.0". */
function topWhy(group: "infl" | "growth" | "debt", now: QuarterState): string {
  const { parts } = explain(group, now);
  const top = parts.find((p) => p.key !== "other");
  if (!top || Math.abs(top.value) < 0.05) return "";
  return `${reason(top.key, group === "growth" ? "gap" : group, now)} ${signed(top.value)}`;
}

const dirOf = (d: number, eps = 0.05) => (Math.abs(d) < eps ? "flat" : d > 0 ? "up" : "down");
const ARROW = { up: "▲", down: "▼", flat: "•" } as const;

export function landmarks(now: QuarterState, prev: QuarterState, policy: Policy, neutralReal: number): LandmarkState[] {
  const dInfl = now.infl - prev.infl;
  const dGap = now.gap - prev.gap;
  const dDebt = now.debt - prev.debt;
  const dRate = now.rate - prev.rate;
  const dCa = now.ca - prev.ca;
  const target = policy.inflationTarget;
  const stance = now.realRate - neutralReal > 0.5 ? "tight" : now.realRate - neutralReal < -0.5 ? "loose" : "neutral";

  const prices: LandmarkState = {
    id: "market",
    title: "Prices",
    value: `${now.infl.toFixed(1)}%`,
    what: "inflation",
    dir: dirOf(dInfl),
    move: dirOf(dInfl) === "flat" ? "steady" : `${dInfl > 0 ? "rising" : "easing"} ${signed(dInfl)} pp`,
    why: topWhy("infl", now),
    tone: now.infl > target + 1.5 && dInfl >= -0.05 ? "bad" : now.infl > target + 1.5 ? "warn" : Math.abs(now.infl - target) <= 1.5 ? "good" : "warn",
    short: "",
  };
  const town: LandmarkState = {
    id: "town",
    title: "Households and firms",
    value: `${signed(now.gap)}%`,
    what: "output vs capacity",
    dir: dirOf(dGap),
    move: dirOf(dGap) === "flat" ? "steady" : `${dGap > 0 ? "picking up" : "cooling"} ${signed(dGap)} pp`,
    why: topWhy("growth", now),
    tone: now.gap < -2.5 ? "bad" : now.gap < -1 || now.gap > 2 ? "warn" : "neutral",
    short: "",
  };
  const hall: LandmarkState = {
    id: "hall",
    title: "Government",
    value: `${now.debt.toFixed(0)}%`,
    what: "debt / GDP",
    dir: dirOf(dDebt),
    move: dirOf(dDebt) === "flat" ? "steady" : `${dDebt > 0 ? "rising" : "falling"} ${signed(dDebt)} pp`,
    why: topWhy("debt", now),
    tone: dDebt > 0.5 && now.debt > 70 ? "bad" : dDebt > 0.05 ? "warn" : dDebt < -0.05 ? "good" : "neutral",
    short: "",
  };
  const bank: LandmarkState = {
    id: "bank",
    title: "Central bank and banks",
    value: `${now.rate.toFixed(1)}%`,
    what: "policy rate",
    dir: dirOf(dRate),
    move: dirOf(dRate) === "flat" ? "unchanged" : `${dRate > 0 ? "up" : "down"} ${signed(dRate)} pp`,
    why: `real rate ${now.realRate.toFixed(1)}%, ${stance}`,
    tone: "neutral",
    short: "",
  };
  const reservesWord = `reserves ${now.reserves.toFixed(1)} mo`;
  const port: LandmarkState = {
    id: "port",
    title: "Port · rest of the world",
    value: `${signed(now.ca)}%`,
    what: "current account / GDP",
    dir: dirOf(dCa),
    move: Math.abs(now.dE) >= 0.2 ? `currency ${now.dE > 0 ? "weaker" : "stronger"} ${fmt(now.dE)}%` : dirOf(dCa) === "flat" ? "steady" : `${dCa > 0 ? "improving" : "worsening"} ${signed(dCa)} pp`,
    why: now.acct.fa < -0.5 ? `capital leaving ${fmt(now.acct.fa)}% · ${reservesWord}` : reservesWord,
    tone: now.reserves < 3 ? "bad" : now.acct.fa < -1 ? "warn" : "neutral",
    short: "",
  };
  const all = [bank, hall, prices, town, port];
  const SHORT: Record<LandmarkId, string> = { bank: "Rate", hall: "Debt", market: "Prices", town: "Output", port: "Current acct" };
  for (const l of all) l.short = l.dir === "flat" ? `${SHORT[l.id]} ${l.value}` : `${SHORT[l.id]} ${ARROW[l.dir]} ${l.value}`;
  return all;
}

/** Flow thickness against the mission's first quarter, amplified so a few percent shows. */
export function flows(now: QuarterState, start: QuarterState): Flows {
  const rel = (v: number, v0: number, k: number) => clamp(1 + k * (v / Math.max(0.1, Math.abs(v0)) - 1), 0.3, 2.2);
  const revenue = (s: QuarterState) => s.acct.gov + s.pb;
  return {
    credit: rel(now.acct.inv, start.acct.inv, 3),
    spending: clamp(1 + 0.18 * now.gap, 0.3, 2.2),
    public: rel(now.acct.gov, start.acct.gov, 3),
    taxes: rel(revenue(now), revenue(start), 3),
    imports: rel(now.acct.imports, start.acct.imports, 5),
    exports: rel(now.acct.exports, start.acct.exports, 5),
    capital: clamp(Math.abs(now.acct.fa) / 3, 0.3, 2.2),
    capitalIn: now.acct.fa >= 0,
  };
}

/** "next quarter" → 1, "2–4 quarters" → 3, none → 0. */
function parseLag(link: string): { label: string; when: string; lag: number } {
  const m = link.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { label: link, when: "now", lag: 0 };
  const when = m[2];
  const nums = (when.match(/\d+/g) ?? []).map(Number);
  const lag = /next/.test(when) ? 1 : nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 1;
  return { label: m[1], when, lag };
}

/** Which landmark each link of a channel's chain sits at. */
const ROUTES: Partial<Record<Channel["id"], StageNode[]>> = {
  rates: ["bank", "banks", "town", "market"],
  budget: ["hall", "hall", "market", "hall"],
  currency: ["port", "port", "port", "market"],
};

type Paths = { forecast: QuarterState[]; before: QuarterState[]; clock: number; /** Earlier moves still travelling (compared with no change since the start). */ earlier?: boolean };

const at = (p: QuarterState[], i: number) => p[Math.min(Math.max(i, 0), p.length - 1)];

/**
 * The lever the player moved this turn, as stages along its channel, with the
 * forecast effect of this turn's change (forecast vs. the forecast at the turn's start).
 */
export function pulseFor(chans: Channel[], policy: Policy, policyStart: Policy, paths: Paths): Pulse | null {
  const { forecast, before, clock } = paths;
  const q = clock + 1; // the quarter being decided
  const rateMoved = policy.rateMode !== policyStart.rateMode || policy.manualRate !== policyStart.manualRate || policy.ruleStrength !== policyStart.ruleStrength || policy.inflationTarget !== policyStart.inflationTarget;
  const budgetMoved = policy.fiscalAdjustment !== policyStart.fiscalAdjustment || policy.publicInvestment !== policyStart.publicInvestment || policy.adjustmentMix !== policyStart.adjustmentMix;
  const fxMoved = policy.fxRegime !== policyStart.fxRegime || policy.fxIntervention !== policyStart.fxIntervention || policy.capitalControls !== policyStart.capitalControls;
  const id: Channel["id"] | null = rateMoved ? "rates" : budgetMoved ? "budget" : fxMoved ? "currency" : null;
  if (!id) return null;
  const chan = chans.find((c) => c.id === id);
  const route = ROUTES[id];
  if (!chan || !route) return null;
  const diff = (k: keyof QuarterState, i: number) => (at(forecast, i)[k] as number) - (at(before, i)[k] as number);
  const tone = (v: number, goodSign: 1 | -1 | 0): Tone => (Math.abs(v) < 0.05 || goodSign === 0 ? "neutral" : Math.sign(v) === goodSign ? "good" : "bad");

  const stages: Stage[] = chan.chain.map((link, i) => {
    const { label, when, lag } = parseLag(link);
    return { node: route[i] ?? route[route.length - 1], label, when, lag, effect: "", tone: "neutral" as Tone };
  });

  if (id === "rates") {
    const dRate = diff("rate", q);
    stages[0].effect = `${signed(dRate)} pp → ${at(forecast, q).rate.toFixed(1)}%`;
    stages[1].label = "Loans";
    stages[1].effect = dRate > 0 ? "dearer" : dRate < 0 ? "cheaper" : "unchanged";
    const iD = q + Math.round(stages[2].lag);
    const dGap = diff("gap", iD);
    stages[2].effect = `${signed(dGap)} pp by ${at(forecast, iD).label}`;
    stages[2].tone = "neutral";
    const iP = q + Math.round(stages[3].lag);
    const dInfl = diff("infl", iP);
    stages[3].effect = `${signed(dInfl)} pp by ${at(forecast, iP).label}`;
    stages[3].tone = tone(dInfl, -1);
    return { id, title: paths.earlier ? "Your rate moves so far" : "Your rate", move: `${signed(dRate)} pp`, stages };
  }
  if (id === "budget") {
    const dPb = diff("pb", q);
    stages[0].effect = `${signed(policy.fiscalAdjustment - policyStart.fiscalAdjustment, 2)} pp/yr`;
    stages[1].effect = `${signed(dPb)} pp`;
    stages[1].when = "now";
    stages[2].when = "this quarter";
    stages[2].lag = 0.5;
    stages[2].effect = `${signed(diff("gap", q))} pp`;
    stages[3].when = "over years";
    stages[3].lag = 4;
    const iEnd = forecast.length - 1;
    stages[3].effect = `${signed(diff("debt", Math.min(q + 8, iEnd)))} pp by ${at(forecast, q + 8).label}`;
    stages[3].tone = tone(diff("debt", q + 8), -1);
    return { id, title: paths.earlier ? "Your budget moves so far" : "Your budget", move: stages[0].effect, stages };
  }
  // Currency regime or intervention.
  stages[2].effect = `reserves ${signed(diff("reserves", q + 2))} mo`;
  stages[3].effect = `inflation ${signed(diff("infl", q + 3))} pp`;
  return { id, title: "Your currency policy", move: "changed", stages };
}

const PROP: Record<ShockKind, ShockProp["prop"]> = {
  "food-price": "rain",
  "supply-shock": "rain",
  "oil-spike": "tanker",
  "sudden-stop": "ships-out",
  downgrade: "ships-out",
  "banking-crisis": "ships-out",
  "inflow-surge": "ships-in",
  "natural-disaster": "storm",
  pandemic: "storm",
  "global-recession": "slump",
  "commodity-bust": "slump",
};

/** Shocks that arrive physically, each with its push this quarter. */
export function shockProps(now: QuarterState): ShockProp[] {
  const d = now.drivers;
  return now.activeShocks.slice(0, 3).map((kind) => {
    const prop = PROP[kind];
    let effect = "";
    if (prop === "rain") effect = `inflation ${signed(d.infl.shocks)} pp`;
    else if (prop === "tanker") effect = `inflation ${signed(d.infl.oil)} pp`;
    else if (prop === "ships-out" || prop === "ships-in") effect = `capital ${signed(now.acct.fa)}% GDP`;
    else if (prop === "storm") effect = `output ${signed(d.gap.shocks)} pp`;
    else effect = `output ${signed(d.gap.external + d.gap.commodities)} pp`;
    return { kind, prop, name: SHOCKS[kind].name, effect, tone: SHOCKS[kind].severity === "good" ? "good" : "bad" };
  });
}

/** One sentence per landmark plus the lever, for screen readers. */
export function describe(lms: LandmarkState[], pulse: Pulse | null, shocks: ShockProp[], quarter: string, forecastOnly: boolean): string {
  const head = `${forecastOnly ? "Forecast for" : "Quarter"} ${quarter}.`;
  const marks = lms.map((l) => `${l.title}: ${l.what} ${l.value}, ${l.move}${l.why ? `, mostly ${l.why}` : ""}.`).join(" ");
  const sh = shocks.map((s) => `${s.name}: ${s.effect}.`).join(" ");
  const lever = pulse ? `${pulse.title} ${pulse.move} travels: ${pulse.stages.map((s) => `${s.label} ${s.when}${s.effect ? ` ${s.effect}` : ""}`).join(", then ")}.` : "";
  return [head, sh, marks, lever].filter(Boolean).join(" ");
}
