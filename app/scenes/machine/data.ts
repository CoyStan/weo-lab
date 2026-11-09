"use client";

// Everything the economy machine draws, derived from the game state. The
// economics come from the existing explanation logic: drivers (what moved each
// gauge), channels() (which pipe a lever acts through, and with what lag) and
// the forecast with and without the player's moves (how much, and when).

import { useMemo } from "react";
import { SHOCKS } from "../../model/shocks";
import type { Policy, QuarterState, ShockKind } from "../../model/types";
import { channels, policyTouched, untouchedConfig, type Channel, type FrameworkInput } from "../../game/framework";
import { forecastFor, useGame } from "../../game/store";
import { useTurn } from "../../game/useTurn";

export type Tone = "good" | "bad" | "neutral";

export type Gauge = {
  value: number;
  delta: number;
  /** "▲", "▼" or "" (steady). */
  arrow: string;
  /** Plain words: "mostly the food shock". Empty when nothing moved it. */
  cause: string;
  causeValue: number;
  tone: Tone;
};

export type Stock = { value: number; delta: number; frac: number; text: string; tone: Tone };

export type ShockPlace = "prices" | "capital" | "exports" | "credit" | "demand";
export type ShockView = { kind: ShockKind; name: string; place: ShockPlace; /** Inflow (+) or leak (−). */ dir: 1 | -1; size: number; text: string };

export type LeverId = "rate" | "fiscal" | "fx";
export type LeverView = { id: LeverId; label: string; value: string; unlocked: boolean; changed: boolean; angle: number };

export type Stop = { name: string; when: string; text: string };
export type Move = {
  lever: LeverId;
  channel: Channel["id"];
  /** "Your rate move", "Your moves so far". */
  title: string;
  /** "8.50% → 10.50%" */
  change: string;
  stops: Stop[];
  /** Effect of the move on demand (output gap) and inflation, per quarter from the next one. */
  demand: number[];
  infl: number[];
  quarters: string[];
  scope: "turn" | "mission";
};

export type MachineView = {
  label: string;
  played: boolean;
  flows: { income: number; cons: number; inv: number; gov: number; taxes: number; saving: number; interest: number; exports: number; imports: number; capital: number; fxSales: number };
  stocks: { debt: Stock; reserves: Stock; money: Stock; credit: Stock };
  infl: Gauge & { target: number };
  growth: Gauge;
  gap: Gauge;
  shocks: ShockView[];
  levers: Record<LeverId, LeverView>;
  move: Move | null;
  rateNote: string;
  /** Depreciation this quarter, % (+ = weaker currency). */
  dE: number;
};

const PRICE_SHOCKS: ShockKind[] = ["food-price", "oil-spike", "supply-shock"];
const PLACE: Record<ShockKind, ShockPlace> = {
  "food-price": "prices",
  "oil-spike": "prices",
  "supply-shock": "prices",
  "sudden-stop": "capital",
  downgrade: "capital",
  "inflow-surge": "capital",
  "commodity-bust": "exports",
  "global-recession": "exports",
  "banking-crisis": "credit",
  "natural-disaster": "demand",
  pandemic: "demand",
};
/** The shock as a cause in a sentence: "mostly the food shock". */
const SHOCK_CAUSE: Record<ShockKind, string> = {
  "food-price": "the food shock",
  "oil-spike": "the oil spike",
  "supply-shock": "the cost shock",
  "sudden-stop": "the sudden stop",
  downgrade: "the downgrade",
  "inflow-surge": "the inflow surge",
  "commodity-bust": "the commodity bust",
  "global-recession": "the world recession",
  "banking-crisis": "the banking crisis",
  "natural-disaster": "the disaster",
  pandemic: "the pandemic",
};

export const fmt = (v: number, d = 1) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : v.toFixed(d)).replace("-", "−");
export const signed = (v: number, d = 1) => {
  const s = fmt(v, d);
  return v > 0 && s !== (0).toFixed(d) ? `+${s}` : s;
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const arrowOf = (d: number, eps = 0.05) => (d > eps ? "▲" : d < -eps ? "▼" : "");

function cause(parts: Record<string, number>, names: Record<string, string>, change: number): { cause: string; value: number } {
  const entries = Object.entries(parts).filter(([k, v]) => k !== "other" && Math.abs(v) >= 0.03);
  if (!entries.length) return { cause: "", value: 0 };
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const [k, v] = entries[0];
  const total = entries.reduce((s, [, x]) => s + Math.abs(x), 0);
  // Name the part that pushed the way the gauge moved; if the biggest part pushed against it, say so.
  const along = Math.sign(v) === Math.sign(change) || Math.abs(change) < 0.05;
  const share = Math.abs(v) / total;
  const second = entries[1];
  // Two causes of about the same size, pushing the same way: name both.
  if (along && second && Math.sign(second[1]) === Math.sign(v) && Math.abs(second[1]) >= 0.6 * Math.abs(v)) {
    return { cause: `${names[k] ?? k} and ${names[second[0]] ?? second[0]}`, value: v + second[1] };
  }
  const word = !along ? "held back by" : share > 0.6 ? "mostly" : "partly";
  return { cause: `${word} ${names[k] ?? k}`, value: v };
}

function stock(value: number, prev: number, max: number, text: string, good: 1 | -1 | 0): Stock {
  const delta = value - prev;
  const tone: Tone = good === 0 || Math.abs(delta) < 0.05 ? "neutral" : Math.sign(delta) === good ? "good" : "bad";
  return { value, delta, frac: clamp01(value / max), text, tone };
}

const LAG_FALLBACK: Record<string, string> = { Demand: "this quarter", Debt: "slowly, over years", "Primary balance": "this quarter" };
/** "Demand (next quarter)" → { name: "Demand", when: "next quarter" }. */
function parseStop(s: string): { name: string; when: string } {
  const m = s.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { name: m[1], when: m[2] } : { name: s, when: LAG_FALLBACK[s] ?? "" };
}

function leverAngle(id: LeverId, p: Policy, rate: number): number {
  // −70° (shut, loosest) … +70° (open, tightest). The handle turns with the lever.
  if (id === "rate") return -70 + 140 * clamp01(rate / 16);
  if (id === "fiscal") return -70 + 140 * clamp01((p.fiscalAdjustment + 2) / 5);
  return -70 + 140 * clamp01(p.fxIntervention / 100);
}

export function useMachine(): MachineView | null {
  const { mission, config, clock, actual, forecast, forecastStart, policy, policyStart, changed } = useTurn();
  const turns = useGame((s) => s.turns);
  const start = turns[0] ?? config;
  const touched = mission ? policyTouched(config, start) : false;
  const untouched = useMemo(() => (touched ? forecastFor(untouchedConfig(config, start), clock) : forecast), [touched, config, start, clock, forecast]);

  return useMemo(() => {
    if (!mission || !actual.length || !forecast.length) return null;
    const end = Math.min(mission.quarters, forecast.length - 1);
    // The quarter the machine shows: the one just played, or (before any) the one being decided.
    const now: QuarterState = clock > 0 ? actual[clock] : forecast[1];
    const prev: QuarterState = clock > 0 ? actual[clock - 1] : actual[0];
    const a = now.acct;
    const d = now.drivers;
    const input: FrameworkInput = { config, actual, forecast, untouched, clock, end, policy, policyStart, changedSinceStart: touched };
    const chans = channels(input);

    const shockKinds = now.activeShocks;
    const priceShock = shockKinds.find((k) => PRICE_SHOCKS.includes(k));
    const anyShock = shockKinds[0];
    const inflNames: Record<string, string> = { expectations: "expectations", demand: "demand", currency: "the currency", oil: "oil prices", shocks: priceShock ? SHOCK_CAUSE[priceShock] : "cost shocks" };
    const gapNames: Record<string, string> = { fading: "earlier swings fading", monetary: "interest rates", fiscal: "the budget", external: "trading partners", commodities: "commodity prices", currency: "the currency", confidence: "confidence", shocks: anyShock ? SHOCK_CAUSE[anyShock] : "shocks" };

    const target = policy.inflationTarget;
    const dInfl = now.infl - prev.infl;
    const ic = cause(d.infl, inflNames, dInfl);
    const away = Math.abs(now.infl - target) > Math.abs(prev.infl - target);
    const infl = { value: now.infl, delta: dInfl, arrow: arrowOf(dInfl), cause: ic.cause, causeValue: ic.value, tone: (Math.abs(dInfl) < 0.05 ? "neutral" : away ? "bad" : "good") as Tone, target };

    const dGrowth = now.growth - prev.growth;
    const dGap = now.gap - prev.gap;
    const gc = cause(d.gap, gapNames, dGap);
    const growth: Gauge = { value: now.growth, delta: dGrowth, arrow: arrowOf(dGrowth), cause: gc.cause, causeValue: gc.value, tone: Math.abs(dGrowth) < 0.05 ? "neutral" : dGrowth > 0 ? "good" : "bad" };
    const gap: Gauge = { value: now.gap, delta: dGap, arrow: arrowOf(dGap), cause: gc.cause, causeValue: gc.value, tone: Math.abs(dGap) < 0.05 ? "neutral" : Math.abs(now.gap) > Math.abs(prev.gap) ? "bad" : "good" };

    const taxes = Math.max(0, a.gov + now.pb);
    const flows = {
      income: 100,
      cons: a.cons,
      inv: a.inv,
      gov: a.gov,
      taxes,
      saving: a.saving,
      interest: now.interest,
      exports: a.exports,
      imports: a.imports,
      capital: a.fa + a.official,
      fxSales: -a.dReserves,
    };

    const pa = prev.acct;
    const stocks = {
      debt: stock(now.debt, prev.debt, 150, `${fmt(now.debt, 0)}% of GDP`, -1),
      reserves: stock(now.reserves, prev.reserves, 12, `${fmt(now.reserves)} months`, 1),
      money: stock(a.money, pa.money, 120, `${fmt(a.money, 0)}% of GDP`, 0),
      credit: stock(a.creditPrivate, pa.creditPrivate, 120, `${fmt(a.creditPrivate, 0)}% of GDP`, 0),
    };

    const shocks: ShockView[] = shockKinds.map((k) => {
      const place = PLACE[k];
      const size = place === "prices" ? d.infl.shocks + d.infl.oil : place === "capital" ? a.fa - pa.fa : place === "exports" ? d.gap.commodities + d.gap.external : place === "credit" ? a.creditPrivate - pa.creditPrivate : d.gap.shocks;
      const dir: 1 | -1 = k === "inflow-surge" || place === "prices" ? 1 : -1;
      const text = place === "prices" ? `${signed(size)} pp on prices` : place === "capital" ? (dir > 0 ? "money pouring in" : "money pulling out") : place === "exports" ? "exports drain away" : place === "credit" ? "credit leaks out" : "spending leaks out";
      return { kind: k, name: SHOCKS[k].name, place, dir, size, text };
    });

    const forecastNext = forecast[Math.min(clock + 1, forecast.length - 1)];
    const rateNow = forecastNext.rate;
    const unlocks = mission.unlocks as string[];
    const levers: Record<LeverId, LeverView> = {
      rate: { id: "rate", label: "Policy rate", value: `${fmt(policy.rateMode === "manual" ? policy.manualRate : rateNow, 2)}%${policy.rateMode === "rule" ? " (rule)" : ""}`, unlocked: unlocks.includes("rate") || unlocks.includes("rule"), changed: policy.manualRate !== policyStart.manualRate || policy.rateMode !== policyStart.rateMode || policy.ruleStrength !== policyStart.ruleStrength, angle: leverAngle("rate", policy, rateNow) },
      fiscal: { id: "fiscal", label: "Budget", value: `${signed(policy.fiscalAdjustment, 1)} pp`, unlocked: unlocks.includes("fiscal"), changed: policy.fiscalAdjustment !== policyStart.fiscalAdjustment || policy.publicInvestment !== policyStart.publicInvestment, angle: leverAngle("fiscal", policy, rateNow) },
      fx: { id: "fx", label: "FX sales", value: `${fmt(policy.fxIntervention, 0)}%`, unlocked: unlocks.includes("intervention"), changed: policy.fxIntervention !== policyStart.fxIntervention || policy.fxRegime !== policyStart.fxRegime, angle: leverAngle("fx", policy, rateNow) },
    };

    // The move to trace: this turn's change if there is one, else everything since the mission began.
    let move: Move | null = null;
    const base = changed ? forecastStart : touched ? untouched : null;
    if (base) {
      const lever: LeverId = levers.rate.changed || (!changed && policy.manualRate !== policyStart.manualRate) ? "rate" : levers.fiscal.changed ? "fiscal" : levers.fx.changed ? "fx" : "rate";
      const chanId: Channel["id"] = lever === "rate" ? "rates" : lever === "fiscal" ? "budget" : "currency";
      const chan = chans.find((c) => c.id === chanId)!;
      const qs: number[] = [];
      for (let q = clock + 1; q <= end; q++) qs.push(q);
      const demand = qs.map((q) => forecast[q].gap - base[q].gap);
      const inflE = qs.map((q) => forecast[q].infl - base[q].infl);
      const quarters = qs.map((q) => forecast[q].label);
      const startRate = base[Math.min(clock + 1, base.length - 1)].rate;
      const change = lever === "rate" ? `${fmt(startRate, 2)}% → ${fmt(rateNow, 2)}%` : lever === "fiscal" ? `${signed(policyStart.fiscalAdjustment)} → ${signed(policy.fiscalAdjustment)} pp of GDP` : `${fmt(policyStart.fxIntervention, 0)}% → ${fmt(policy.fxIntervention, 0)}% of pressure`;
      // Where the effect first shows, and how big it is a year on and at the end.
      const describe = (series: number[]) => {
        const first = series.findIndex((v) => Math.abs(v) >= 0.05);
        if (first < 0) return "too small to see yet";
        const yr = Math.min(series.length - 1, first + 3);
        const bits = [`${signed(series[first])} in ${quarters[first]}`];
        if (yr > first) bits.push(`${signed(series[yr])} by ${quarters[yr]}`);
        if (series.length - 1 > yr) bits.push(`${signed(series[series.length - 1])} by ${quarters[series.length - 1]}`);
        return bits.join(", ");
      };
      const stops: Stop[] = chan.chain.slice(1).map((s) => {
        const { name, when } = parseStop(s);
        const text = /demand/i.test(name) ? describe(demand) : /inflation|prices/i.test(name) ? describe(inflE) : "";
        return { name, when, text };
      });
      move = { lever, channel: chanId, title: changed ? `Your ${lever === "rate" ? "rate" : lever === "fiscal" ? "budget" : "FX"} move` : "Your moves so far", change, stops, demand, infl: inflE, quarters, scope: changed ? "turn" : "mission" };
    }

    return { label: now.label, played: clock > 0, flows, stocks, infl, growth, gap, shocks, levers, move, rateNote: chans[0].note, dE: now.dE };
  }, [mission, config, clock, actual, forecast, forecastStart, policy, policyStart, changed, touched, untouched]);
}
