import type { Constraint, SimResult } from "./types.ts";

export type ScoreStatus = "good" | "warn" | "bad";

export type ScoreLine = { key: string; label: string; value: string; status: ScoreStatus; note: string };

export type Assessment = {
  /** 0–100 composite. */
  score: number;
  rating: "Sustainable" | "Watch" | "Fragile" | "Crisis";
  lines: ScoreLine[];
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Headline assessment of a scenario against its reference path. */
export function assess(scenario: SimResult, reference: SimResult, constraints: Constraint[], inflationTarget: number): Assessment {
  const s = scenario.path.slice(1);
  const r = reference.path.slice(1);
  const last = s[s.length - 1];
  const first = scenario.path[0];
  const lines: ScoreLine[] = [];
  let score = 0;

  // Growth versus the reference path.
  const growthDiff = mean(s.map((q) => q.growth)) - mean(r.map((q) => q.growth));
  const growthStatus: ScoreStatus = growthDiff > 0.2 ? "good" : growthDiff > -0.5 ? "warn" : "bad";
  lines.push({ key: "growth", label: "Growth vs reference", value: `${growthDiff >= 0 ? "+" : ""}${growthDiff.toFixed(1)} pp`, status: growthStatus, note: "Average real growth over the horizon, scenario minus reference." });
  score += growthStatus === "good" ? 20 : growthStatus === "warn" ? 12 : 4;

  // Inflation near target.
  const inTarget = s.filter((q) => Math.abs(q.infl - inflationTarget) <= 1.5).length;
  const inflShare = inTarget / s.length;
  const inflStatus: ScoreStatus = inflShare >= 0.6 ? "good" : inflShare >= 0.3 ? "warn" : "bad";
  lines.push({ key: "infl", label: "Inflation near target", value: `${inTarget} of ${s.length} quarters`, status: inflStatus, note: `Within 1.5 points of the ${inflationTarget}% target.` });
  score += Math.round(20 * inflShare);

  // Debt trajectory.
  const debtChange = last.debt - first.debt;
  const debtStatus: ScoreStatus = debtChange <= 0 && last.spread < 500 ? "good" : debtChange <= 8 ? "warn" : "bad";
  lines.push({ key: "debt", label: "Debt trajectory", value: `${first.debt.toFixed(0)} → ${last.debt.toFixed(0)}% GDP`, status: debtStatus, note: debtChange <= 0 ? "Debt ends the horizon no higher than it started." : "Debt keeps rising over the horizon." });
  score += debtStatus === "good" ? 20 : debtStatus === "warn" ? 10 : 0;

  // External buffer.
  const minReserves = Math.min(...s.map((q) => q.reserves));
  const resStatus: ScoreStatus = minReserves >= 3 ? "good" : minReserves >= 1.5 ? "warn" : "bad";
  lines.push({ key: "reserves", label: "Reserve cover", value: `min ${minReserves.toFixed(1)} months`, status: resStatus, note: "Lowest import cover reached over the horizon; three months is the usual floor." });
  score += resStatus === "good" ? 15 : resStatus === "warn" ? 8 : 0;

  // Market access.
  const maxSpread = Math.max(...s.map((q) => q.spread));
  const spreadStatus: ScoreStatus = maxSpread < 500 ? "good" : maxSpread < 900 ? "warn" : "bad";
  lines.push({ key: "spread", label: "Market access", value: `peak ${Math.round(maxSpread)} bp`, status: spreadStatus, note: "Highest sovereign spread over the horizon." });
  score += spreadStatus === "good" ? 10 : spreadStatus === "warn" ? 5 : 0;

  // User constraints.
  const checks = constraints.reduce((n, c) => n + Math.max(0, 24 - Math.max(1, c.fromQuarter) + 1), 0);
  const held = checks - scenario.breaches.length;
  if (constraints.length) {
    const share = checks ? held / checks : 1;
    const cStatus: ScoreStatus = share >= 0.95 ? "good" : share >= 0.7 ? "warn" : "bad";
    lines.push({ key: "constraints", label: "Constraints held", value: `${held} of ${checks} checks`, status: cStatus, note: `${constraints.length} constraint${constraints.length === 1 ? "" : "s"} evaluated each quarter.` });
    score += Math.round(15 * share);
  } else {
    lines.push({ key: "constraints", label: "Constraints held", value: "none set", status: "warn", note: "Add constraints to test the scenario against programme targets or fiscal rules." });
    score += 8;
  }

  const rating = score >= 75 ? "Sustainable" : score >= 55 ? "Watch" : score >= 35 ? "Fragile" : "Crisis";
  return { score, rating, lines };
}
