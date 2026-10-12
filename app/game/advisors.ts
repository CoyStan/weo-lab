// Three advisors with different priorities. Each reads the current quarter and
// the staff forecast and says one thing in plain language. They are allowed to
// disagree: that is how the trade-offs show.

import { quarterLabel } from "../model/economy.ts";
import type { Policy, QuarterState } from "../model/types.ts";
import { yearQuarters, yearValue, type AdvisorId, type MetricKey, type Mission, type Objective } from "./missions.ts";

export type Advisor = { id: AdvisorId; name: string; role: string; cares: string; portrait: string; accent: string };

export const ADVISORS: Record<AdvisorId, Advisor> = {
  governor: { id: "governor", name: "Governor Okafor", role: "Central bank", cares: "Inflation and credibility", portrait: "/advisors/governor.webp", accent: "#b57835" },
  minister: { id: "minister", name: "Minister Varga", role: "Finance ministry", cares: "Growth and jobs", portrait: "/advisors/minister.webp", accent: "#a9503c" },
  chief: { id: "chief", name: "Mission chief Sato", role: "IMF mission", cares: "Debt, reserves and market access", portrait: "/advisors/chief.webp", accent: "#39705b" },
};

export type Tone = "worried" | "calm" | "pleased";
export type Advice = { advisor: AdvisorId; tone: Tone; text: string };

const f = (v: number, d = 1) => v.toFixed(d).replace(/\.0$/, "");

export type AdviceContext = {
  mission: Mission;
  now: QuarterState;
  /** Staff forecast under the current settings (index = quarter). */
  forecast: QuarterState[];
  policy: Policy;
};

/** Which goals each advisor speaks for. */
const WATCHES: Record<AdvisorId, MetricKey[]> = {
  governor: ["infl", "cred", "rate"],
  minister: ["growth", "unemp"],
  chief: ["debt", "reserves", "spread", "ob", "pb", "gfn", "ca"],
};

type Risk = { objective: Objective; t: number; value: number };

/** The earliest quarter ahead in which the forecast misses a goal. */
export function firstRisk(mission: Mission, forecast: QuarterState[], fromT: number, metrics: MetricKey[], bonus = false): Risk | null {
  let best: Risk | null = null;
  for (const o of mission.objectives) {
    if (Boolean(o.bonus) !== bonus || !metrics.includes(o.metric)) continue;
    if (o.when === "year") {
      const qs = yearQuarters(o, mission);
      if (!qs.length || qs[qs.length - 1] < fromT) continue;
      const value = yearValue(o, mission, forecast, forecast, fromT - 1);
      const ok = o.op === "<=" ? value <= o.threshold : value >= o.threshold;
      if (!ok && (!best || qs[qs.length - 1] < best.t)) best = { objective: o, t: qs[qs.length - 1], value };
      continue;
    }
    const start = o.when === "end" ? mission.quarters : Math.max(fromT, o.from ?? 1);
    for (let t = start; t <= mission.quarters; t++) {
      const v = forecast[t][o.metric];
      const ok = o.op === "<=" ? v <= o.threshold : v >= o.threshold;
      if (!ok) {
        if (!best || t < best.t) best = { objective: o, t, value: v };
        break;
      }
    }
  }
  return best;
}

const UNITS: Partial<Record<MetricKey, string>> = { infl: "%", growth: "%", unemp: "%", debt: "% of GDP", ob: "% of GDP", reserves: " months of imports", spread: " bp", cred: "" };

/** What the forecast says about a goal, and what the advisor would do about it. */
function riskLine(id: AdvisorId, r: Risk): { fact: string; nudge: string } {
  const o = r.objective;
  const u = UNITS[o.metric] ?? "";
  // Spreads read best as whole basis points; everything else needs a decimal so near-misses don't look like hits.
  const d = o.metric === "spread" ? 0 : 1;
  const when = o.when === "year" ? `${o.year}` : quarterLabel(r.t);
  const goal = `${o.op === "<=" ? "at or below" : "at or above"} ${f(o.threshold, d)}${u}`;
  const value = `${f(r.value, d)}${u}`;
  switch (o.metric) {
    case "infl":
      return { fact: `On these settings inflation is ${value} in ${when}; the goal is ${goal}.`, nudge: "I'd tighten a little more." };
    case "cred":
      return { fact: `Credibility would end at ${value}; the goal is ${goal}.`, nudge: "Consistency is what earns it back." };
    case "growth":
      return { fact: `This plan takes growth to ${value} in ${when}; the goal is ${goal}.`, nudge: "Ease off a little." };
    case "unemp":
      return { fact: `Unemployment would reach ${value} in ${when}; the goal is ${goal}.`, nudge: "This is too much pain." };
    case "reserves":
      return { fact: `Reserves would fall to ${value} in ${when}; the floor is ${goal}.`, nudge: "Protect the buffer." };
    case "debt":
      return { fact: `Debt would be ${value} in ${when}; the goal is ${goal}.`, nudge: "The budget has to do more." };
    case "spread":
      return { fact: `Spreads would hit ${value} in ${when}; the limit is ${goal}.`, nudge: "Markets need a credible plan." };
    case "ob":
      return { fact: `The deficit would reach ${f(-r.value)}% of GDP in ${when}; the rule is a balance ${goal}.`, nudge: "Tighten before it gets there." };
    default:
      return { fact: `${id === "chief" ? "The external numbers" : "The forecast"} miss the goal in ${when}: ${value}.`, nudge: "" };
  }
}

export function advise({ mission, now, forecast, policy }: AdviceContext): Advice[] {
  const end = Math.min(mission.quarters, forecast.length - 1);
  const ahead = forecast.slice(now.t + 1, end + 1);
  const atEnd = forecast[end];
  const endLabel = quarterLabel(end);
  const out: Advice[] = [];

  for (const id of mission.advisors) {
    const risk = now.t < mission.quarters ? firstRisk(mission, forecast, now.t + 1, WATCHES[id]) : null;
    if (risk) {
      const line = riskLine(id, risk);
      out.push({ advisor: id, tone: "worried", text: `${line.fact} ${line.nudge}`.trim() });
      continue;
    }
    const bonusRisk = now.t < mission.quarters ? firstRisk(mission, forecast, now.t + 1, WATCHES[id], true) : null;
    if (bonusRisk) {
      out.push({ advisor: id, tone: "calm", text: `The main goals look safe. For an extra star: ${riskLine(id, bonusRisk).fact}` });
      continue;
    }
    if (id === "governor") out.push(governor(now, atEnd, endLabel, policy));
    if (id === "minister") out.push(minister(now, ahead, policy));
    if (id === "chief") out.push(chief(now, atEnd, endLabel, ahead));
  }
  return out;
}

function governor(now: QuarterState, atEnd: QuarterState, endLabel: string, policy: Policy): Advice {
  const target = policy.inflationTarget;
  const a = (tone: Tone, text: string): Advice => ({ advisor: "governor", tone, text });
  if (now.infl > target + 3) {
    return a("worried", `Inflation is ${f(now.infl)}%, far above our ${f(target)}% target. ${atEnd.infl > target + 1 ? `On these settings it is still ${f(atEnd.infl)}% in ${endLabel}. We need to lean harder.` : "The forecast has it easing, but expectations are fragile."}`);
  }
  if (atEnd.infl > target + 1) return a("worried", `The forecast has inflation at ${f(atEnd.infl)}% in ${endLabel}, above the ${f(target)}% target. A higher real rate would bring it down faster.`);
  if (now.infl > target + 1) return a("calm", `Inflation is ${f(now.infl)}% today, but the forecast brings it to ${f(atEnd.infl)}% by ${endLabel}. Policy works with a lag; give it time.`);
  if (now.cred < 45) return a("worried", `Our credibility is thin at ${f(now.cred, 0)} out of 100. Until it recovers, every price shock leaks into expectations.`);
  if (now.infl < target - 1.5 && now.realRate > 2) return a("calm", `Inflation is ${f(now.infl)}%, under target, and the real rate is ${f(now.realRate)}%. There is room to ease.`);
  if (now.realRate > 5) return a("calm", `A real rate of ${f(now.realRate)}% is very tight. Inflation is under control; don't hold it there longer than needed.`);
  return a("pleased", `Inflation is ${f(now.infl)}% against a ${f(target)}% target, and the forecast stays close. Steady hands.`);
}

function minister(now: QuarterState, ahead: QuarterState[], policy: Policy): Advice {
  const a = (tone: Tone, text: string): Advice => ({ advisor: "minister", tone, text });
  const low = ahead.reduce<QuarterState | null>((m, s) => (!m || s.growth < m.growth ? s : m), null);
  if (now.growth < 0) return a("worried", `The economy is shrinking: growth is ${f(now.growth)}%. Every quarter like this costs jobs.`);
  if (low && low.growth < 0.5) return a("worried", `On this plan growth drops to ${f(low.growth)}% in ${low.label}. I'd rather we didn't find out what that does to unemployment.`);
  if (now.unemp > now.nairu + 1) return a("worried", `Unemployment is ${f(now.unemp)}%. People need work more than they need a perfect forecast.`);
  if (policy.fiscalAdjustment >= 1.5) return a("worried", `Tightening by ${f(policy.fiscalAdjustment, 2)} points of GDP a year is a lot. Spending cuts at that pace will bite.`);
  if (now.growth > 3) return a("pleased", `Growth of ${f(now.growth)}% is keeping people in work. Let's not choke it.`);
  return a("calm", `Growth is ${f(now.growth)}% and unemployment ${f(now.unemp)}%. Manageable, but I'm watching it.`);
}

function chief(now: QuarterState, atEnd: QuarterState, endLabel: string, ahead: QuarterState[]): Advice {
  const a = (tone: Tone, text: string): Advice => ({ advisor: "chief", tone, text });
  const minRes = ahead.reduce((m, s) => Math.min(m, s.reserves), now.reserves);
  if (now.reserves < 3) return a("worried", `Reserves cover ${f(now.reserves)} months of imports. Below three is a red line for us.`);
  if (minRes < 3 && minRes < now.reserves - 0.3) return a("worried", `On current policies reserves fall to ${f(minRes)} months of imports. That is where pegs break.`);
  if (now.spread > 600) return a("worried", `Markets charge ${f(now.spread, 0)} basis points over the safe rate. They need to see a credible plan.`);
  if (atEnd.debt > now.debt + 2 && now.debt > 55) return a("worried", `Debt is ${f(now.debt)}% of GDP and heading to ${f(atEnd.debt)}% by ${endLabel}. That path needs to turn.`);
  if (now.ob < -5) return a("worried", `A deficit of ${f(-now.ob)}% of GDP is hard to finance for long.`);
  if (atEnd.debt < now.debt - 0.5) return a("pleased", `Debt is on a declining path, ${f(now.debt)}% now and ${f(atEnd.debt)}% by ${endLabel}. That is what markets want to see.`);
  return a("calm", `Reserves at ${f(now.reserves)} months and a ${f(now.spread, 0)} bp spread. The external position is manageable.`);
}
