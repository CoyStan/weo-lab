import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { simulate } from "../model/economy.ts";
import { buildEpisode, EPISODES, type WeoData } from "./economies.ts";
import { channels, diagnose, policyTouched, untouchedConfig, type FrameworkInput } from "./framework.ts";
import { getMission, knownConfig, policyForTurn } from "./missions.ts";
import type { ScenarioConfig } from "../model/types.ts";

const data = JSON.parse(readFileSync(new URL("../data/weo.json", import.meta.url), "utf8")) as WeoData;

function frame(config: ScenarioConfig, start: ScenarioConfig, clock: number, end: number): FrameworkInput {
  const forecast = simulate(knownConfig(config, clock)).path;
  const untouched = simulate(knownConfig(untouchedConfig(config, start), clock)).path;
  return { config, actual: simulate(config).path, forecast, untouched, clock, end, policy: policyForTurn(config, clock), policyStart: policyForTurn(config, clock), changedSinceStart: policyTouched(config, start) };
}

test("the food-price mission explains a supply shock and shows the rate working with a lag", () => {
  const m = getMission("first-quarter")!;
  const start = m.setup();
  const config = { ...start, decisions: [...start.decisions, { quarter: 1, changes: { manualRate: 11 } }] };
  const input = frame(config, start, 1, m.quarters);
  const notes = diagnose(input).map((n) => n.id);
  assert.ok(notes.includes("supply"), "a food shock should be flagged as supply-driven");
  assert.ok(notes.includes("rer"), "the constant real exchange rate convention should be explained");
  const rates = channels(input).find((c) => c.id === "rates")!;
  assert.equal(rates.status, "active");
  // The rate rise must show up in the end-of-mission forecast against the no-change path.
  assert.ok(input.forecast[m.quarters].infl < input.untouched[m.quarters].infl - 0.3);
});

test("Thailand: the peg is explained, and defending it with rates moves reserves and growth", () => {
  const ep = EPISODES.find((e) => e.id === "thailand-1997")!;
  const { mission } = buildEpisode(data, ep);
  const start = mission.setup();
  const input = frame(start, start, 1, mission.quarters);
  assert.ok(diagnose(input).some((n) => n.id === "peg"));
  const defended = { ...start, decisions: [...start.decisions, { quarter: 1, changes: { manualRate: 16 } }] };
  const a = simulate(start).path;
  const b = simulate(defended).path;
  assert.ok(b[4].reserves > a[4].reserves + 0.3, "higher rates should slow the reserve drain");
  assert.ok(b[6].growth < a[6].growth - 0.3, "and cost growth");
  const loosened = { ...start, decisions: [...start.decisions, { quarter: 1, changes: { fiscalAdjustment: -1 } }] };
  // Deep in the slump, the budget still moves output (there is no hard floor on the output gap).
  assert.ok(a[8].gap < -15, "1998 should be a deep slump");
  assert.ok(simulate(loosened).path[8].gap > a[8].gap + 0.3);
});
