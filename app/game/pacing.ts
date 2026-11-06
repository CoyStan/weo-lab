// Pacing: which quarters need a decision, and which can be skipped.
//
// Looking ahead, `attention` lists what calls for a decision before the coming
// quarter ends (a goal the forecast now misses, a known shock about to land, an
// election close by, a paused programme, reserves running low). An empty list
// is a quiet quarter. Looking back, `eventful` says whether the quarter just
// played is worth stopping a fast-forward for. Pure, so it can be tested.

import { quarterLabel } from "../model/economy.ts";
import { SHOCKS } from "../model/shocks.ts";
import type { Policy, QuarterState, ScenarioConfig, SimEvent } from "../model/types.ts";
import { GAME_METRICS } from "./metrics.ts";
import { isSurprise, type Mission, type ObjectiveStatus } from "./missions.ts";

export type Attention = { key: string; text: string; tone: "warn" | "info" };

export type AttentionInput = {
  mission: Mission;
  config: ScenarioConfig;
  clock: number;
  /** Status of each objective under the current forecast. */
  statuses: Record<string, ObjectiveStatus>;
  forecast: QuarterState[];
  actual: QuarterState[];
  policy: Policy;
  votes: number;
};

/** What needs a decision before the coming quarter ends. Empty means a quiet quarter. */
export function attention(input: AttentionInput): Attention[] {
  const { mission, config, clock, statuses, forecast, actual, policy, votes } = input;
  if (clock >= mission.quarters) return [];
  const out: Attention[] = [];
  const next = clock + 1;

  for (const o of mission.objectives) {
    if (o.bonus || statuses[o.id] !== "at-risk") continue;
    out.push({ key: `risk:${o.id}`, tone: "warn", text: `On the forecast you miss: ${o.label.charAt(0).toLowerCase()}${o.label.slice(1)}.` });
  }

  // Shocks everyone can see coming (surprises stay hidden until they hit).
  for (const s of config.shocks) {
    if (isSurprise(s) || s.quarter < next || s.quarter > next + 1) continue;
    out.push({ key: `shock:${s.id}`, tone: "warn", text: `${SHOCKS[s.kind].name} lands in ${quarterLabel(s.quarter)}: ${SHOCKS[s.kind].short.charAt(0).toLowerCase()}${SHOCKS[s.kind].short.slice(1)}.` });
  }

  for (const q of mission.politics.elections) {
    if (q < next || q > next + 1) continue;
    out.push({ key: `election:${q}`, tone: votes >= mission.politics.threshold ? "info" : "warn", text: `Election at the end of ${quarterLabel(q)}: you have ${votes} votes and need ${mission.politics.threshold}.` });
  }

  if (policy.imfProgram > 0 && policy.fiscalAdjustment < 0.5) {
    out.push({ key: "imf-paused", tone: "warn", text: "The IMF programme is paused: it needs at least +0.5 pp of tightening a year." });
  }

  const now = actual[clock];
  const ahead = forecast[Math.min(next + 1, forecast.length - 1)];
  if (now.regime !== "float" && ahead.reserves < 2 && ahead.reserves < now.reserves) {
    out.push({ key: "reserves", tone: "warn", text: `Reserves are heading below two months of imports (${ahead.reserves.toFixed(1)} by ${ahead.label}); the peg is at risk.` });
  }
  return out;
}

export type Recapish = {
  prev: QuarterState;
  now: QuarterState;
  events: SimEvent[];
  statuses: { id: string; before: ObjectiveStatus; after: ObjectiveStatus }[];
  election: unknown;
  crisis: boolean;
};

/** Reasons the quarter just played deserves a stop. Empty means it was quiet. */
export function eventful(r: Recapish, mission: Mission): string[] {
  const out: string[] = [];
  for (const e of r.events) {
    if (e.kind === "shock" || e.kind === "crisis" || e.kind === "regime" || e.kind === "program") out.push(e.title);
  }
  for (const s of r.statuses) {
    if (s.before === s.after) continue;
    const o = mission.objectives.find((x) => x.id === s.id);
    if (!o) continue;
    const word = s.after === "at-risk" ? "now at risk" : s.after === "on-track" ? "back on track" : s.after === "met" ? "met" : "missed";
    out.push(`${GAME_METRICS[o.metric].label} goal ${word}`);
  }
  if (r.election) out.push("Election");
  if (r.crisis) out.push("Trust collapsed");
  const d = (k: keyof QuarterState) => (r.now[k] as number) - (r.prev[k] as number);
  if (Math.abs(d("infl")) >= 1) out.push(`Inflation ${d("infl") > 0 ? "jumped" : "fell"} ${Math.abs(d("infl")).toFixed(1)} pp`);
  if (Math.abs(d("growth")) >= 1.5) out.push(`Growth ${d("growth") > 0 ? "jumped" : "fell"} ${Math.abs(d("growth")).toFixed(1)} pp`);
  if (d("reserves") <= -0.5) out.push(`Reserves fell ${Math.abs(d("reserves")).toFixed(1)} months`);
  if (d("spread") >= 100) out.push(`Spreads widened ${Math.round(d("spread"))} bp`);
  return Array.from(new Set(out));
}
