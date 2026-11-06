import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { decompose, DECOMP_METRICS } from "./decompose.ts";
import { buildEpisode, EPISODES, type WeoData } from "./economies.ts";
import { getMission } from "./missions.ts";
import type { ScenarioConfig } from "../model/types.ts";

const data = JSON.parse(readFileSync(new URL("../data/weo.json", import.meta.url), "utf8")) as WeoData;

function adds(full: ScenarioConfig, start: ScenarioConfig, horizon: number) {
  const d = decompose(full, start, horizon);
  for (const { key } of DECOMP_METRICS)
    for (let t = 0; t <= horizon; t++) {
      const sum = d.start[key] + d.components.reduce((a, c) => a + c.values[key][t], 0);
      assert.ok(Math.abs(sum - d.path[t][key]) < 1e-6, `${key} at ${t}: ${sum} vs ${d.path[t][key]}`);
    }
  return d;
}

test("the food shock pushes inflation up and the player's rate rise pulls it down; parts add up", () => {
  const m = getMission("first-quarter")!;
  const start = m.setup();
  const full = { ...start, decisions: [...start.decisions, { quarter: 1, changes: { manualRate: 11 } }] };
  const d = adds(full, start, m.quarters);
  const food = d.components.find((c) => c.id === "shock:known-food")!;
  const rates = d.components.find((c) => c.id === "rates")!;
  assert.ok(food.values.infl[3] > 1, "the food shock should add over a point to inflation");
  assert.ok(rates.values.infl[8] < -0.5, "the rate rise should take inflation down by 2027Q4");
  assert.ok(rates.values.growth[4] < 0, "and cost some growth");
});

test("Thailand: history, the sudden stop and every instrument add up", () => {
  const ep = EPISODES.find((e) => e.id === "thailand-1997")!;
  const { mission } = buildEpisode(data, ep);
  const start = mission.setup();
  const full = { ...start, decisions: [...start.decisions, { quarter: 1, changes: { fxRegime: "float" as const, imfProgram: 3, fiscalAdjustment: 0.5 } }] };
  const d = adds(full, start, mission.quarters);
  assert.deepEqual(d.components.map((c) => c.id), ["momentum", "history", "shock:surprise-stop", "budget", "currency", "support"]);
});
