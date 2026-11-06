import assert from "node:assert/strict";
import { test } from "node:test";
import { simulate } from "../model/economy.ts";
import { getMission, knownConfig, MISSIONS, objectiveStatus, policyForTurn, type Mission, type ObjectiveStatus } from "./missions.ts";
import { attention, eventful } from "./pacing.ts";
import { ledger } from "./politics.ts";
import type { ScenarioConfig } from "../model/types.ts";

function look(mission: Mission, config: ScenarioConfig, clock: number) {
  const actual = simulate(config);
  const forecast = simulate(knownConfig(config, clock)).path;
  const statuses: Record<string, ObjectiveStatus> = {};
  for (const o of mission.objectives) statuses[o.id] = objectiveStatus(o, mission, actual.path, forecast, clock);
  const votes = ledger(mission.politics, config, actual.path, actual.events, clock).votes;
  return { actual, forecast, statuses, items: attention({ mission, config, clock, statuses, forecast, actual: actual.path, policy: policyForTurn(config, clock), votes }) };
}

/** Where a fast-forward from `from` would stop, mirroring the store's run. */
function stopsFrom(mission: Mission, config: ScenarioConfig, from: number): number {
  const start = look(mission, config, from).items.map((a) => a.key);
  for (let c = from; c < mission.quarters; c++) {
    const before = look(mission, config, c);
    const after = look(mission, config, c + 1);
    const prev = after.actual.path[c];
    const now = after.actual.path[c + 1];
    const events = after.actual.events.filter((e) => e.quarter === c + 1);
    const reasons = eventful({ prev, now, events, statuses: mission.objectives.map((o) => ({ id: o.id, before: before.statuses[o.id], after: after.statuses[o.id] })), election: mission.politics.elections.includes(c + 1) ? {} : null, crisis: false }, mission);
    const fresh = after.items.filter((a) => !start.includes(a.key));
    if (reasons.length || fresh.length || c + 1 - from >= 8) return c + 1;
  }
  return mission.quarters;
}

test("a quiet quarter has nothing on the agenda; elections and known shocks show up ahead of time", () => {
  const m = getMission("debt-mountain")!;
  const election = m.politics.elections[0];
  const { items } = look(m, m.setup(), election - 1);
  assert.ok(items.some((a) => a.key === `election:${election}`), "an election next quarter should be on the agenda");
});

test("eventful flags shocks and stays quiet otherwise", () => {
  const m = getMission("first-quarter")!;
  const r = simulate(m.setup());
  const base = { prev: r.path[4], now: r.path[4], events: [], statuses: [], election: null, crisis: false };
  assert.deepEqual(eventful(base, m), []);
  assert.ok(eventful({ ...base, events: [{ quarter: 5, kind: "shock", title: "Oil spike", detail: "", severity: "bad" }] }, m).includes("Oil spike"));
});

test("skipping ahead covers several quarters at a time, not one", () => {
  for (const m of MISSIONS) {
    const config = m.setup();
    const stops: number[] = [];
    let c = 0;
    while (c < m.quarters) {
      c = stopsFrom(m, config, c);
      stops.push(c);
    }
    // Doing nothing, a mission should need clearly fewer stops than quarters.
    assert.ok(stops.length < m.quarters, `${m.id}: stops at ${stops.join(",")}`);
  }
});
