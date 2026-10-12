import assert from "node:assert/strict";
import { test } from "node:test";
import { simulate } from "../model/economy.ts";
import type { Policy, ScenarioConfig } from "../model/types.ts";
import { canAdopt, INSTITUTIONS, ledger } from "./politics.ts";
import { knownConfig, MISSIONS, missionOutcome, objectiveStatus, type Mission } from "./missions.ts";

type Plan = [quarter: number, changes: Partial<Policy>][];

function withPlan(mission: Mission, plan: Plan): ScenarioConfig {
  const base = mission.setup();
  return { ...base, decisions: [...base.decisions, ...plan.map(([quarter, changes]) => ({ quarter, changes }))] };
}

function play(mission: Mission, plan: Plan, config: ScenarioConfig = withPlan(mission, plan)) {
  const result = simulate(config);
  return missionOutcome(mission, result, result.path, mission.quarters, config);
}

/** Adopt every affordable institution as soon as possible, in the mission's order. */
function greedy(mission: Mission, start: ScenarioConfig): ScenarioConfig {
  let config: ScenarioConfig = { ...start, institutions: [] };
  for (let clock = 0; clock < mission.quarters; clock++) {
    const r = simulate(config);
    const l = ledger(mission.politics, config, r.path, r.events, clock);
    const balance = { votes: l.votes, trust: l.trust };
    for (const id of mission.politics.institutions) {
      if (!canAdopt(id, mission.politics, config, balance).ok) continue;
      config = { ...config, institutions: [...(config.institutions ?? []), { id, quarter: clock + 1 }] };
      balance.votes -= INSTITUTIONS[id].cost.votes ?? 0;
      balance.trust -= INSTITUTIONS[id].cost.trust ?? 0;
    }
  }
  return config;
}

/** One known-good plan per mission, and one that should earn every star. */
const WINS: Record<string, { win: Plan; threeStars: Plan }> = {
  "first-quarter": { win: [[1, { manualRate: 9.5 }]], threeStars: [[1, { manualRate: 10.5 }], [5, { manualRate: 8.5 }]] },
  "cost-shock": { win: [[1, { ruleStrength: 1.5 }]], threeStars: [[1, { ruleStrength: 1.8 }]] },
  "debt-mountain": { win: [[1, { fiscalAdjustment: 0.75, adjustmentMix: 100 }]], threeStars: [[1, { fiscalAdjustment: 1, adjustmentMix: 50 }]] },
  "commodity-bust": { win: [[1, { fiscalAdjustment: 1 }], [3, { fxRegime: "float" }]], threeStars: [[1, { fiscalAdjustment: 1 }], [3, { fxRegime: "float" }]] },
  "defend-peg": { win: [[1, { imfProgram: 4, fiscalAdjustment: 0.5 }]], threeStars: [[1, { imfProgram: 6, fiscalAdjustment: 1 }]] },
  "sudden-stop": { win: [[5, { fiscalAdjustment: 0.75, adjustmentMix: 100 }]], threeStars: [[5, { fiscalAdjustment: 1, imfProgram: 2 }]] },
};

test("every mission is lost by doing nothing", () => {
  for (const m of MISSIONS) assert.equal(play(m, []).kind, "lost", `${m.id} should not be won passively`);
});

test("buying every institution without touching the levers does not win", () => {
  for (const m of MISSIONS) assert.equal(play(m, [], greedy(m, m.setup())).kind, "lost", `${m.id} should not be won by institutions alone`);
});

test("the ledger is deterministic and elections bite", () => {
  const m = MISSIONS.find((x) => x.id === "debt-mountain")!;
  const config = greedy(m, withPlan(m, WINS[m.id].win));
  const r = simulate(config);
  const a = ledger(m.politics, config, r.path, r.events, m.quarters);
  const b = ledger(m.politics, config, r.path, r.events, m.quarters);
  assert.deepEqual(a, b);
  assert.ok(a.elections.some((e) => !e.won), "spending every vote on reforms should cost the election");
});

test("every mission can be won, and every star can be earned", () => {
  for (const m of MISSIONS) {
    const plans = WINS[m.id];
    assert.ok(plans, `no reference plans for ${m.id}`);
    assert.equal(play(m, plans.win).kind, "won", `${m.id} reference win`);
    const best = play(m, plans.threeStars);
    assert.equal(best.kind === "won" ? best.stars : 0, 3, `${m.id} three-star plan`);
  }
});

test("missions are internally consistent", () => {
  const ids = new Set<string>();
  for (const m of MISSIONS) {
    assert.ok(!ids.has(m.id), `duplicate mission ${m.id}`);
    ids.add(m.id);
    assert.ok(m.quarters >= 4 && m.quarters <= 24);
    assert.ok(m.objectives.some((o) => !o.bonus), `${m.id} has no primary objective`);
    assert.ok(m.objectives.filter((o) => o.bonus).length >= 2, `${m.id} needs two bonus objectives for three stars`);
    assert.ok(m.unlocks.length > 0);
  }
});

test("surprise shocks stay out of the forecast until they hit", () => {
  const m = MISSIONS.find((x) => x.id === "cost-shock")!;
  const config = m.setup();
  assert.equal(knownConfig(config, 0).shocks.length, 0);
  assert.equal(knownConfig(config, 3).shocks.length, 1, "revealed when deciding for the quarter it hits");
});

test("objective status looks ahead with the forecast and back with the outturn", () => {
  const m = MISSIONS[0];
  const result = simulate(m.setup());
  const end = m.objectives.find((o) => o.id === "infl-end")!;
  assert.equal(objectiveStatus(end, m, result.path, result.path, 2), "at-risk");
  assert.equal(objectiveStatus(end, m, result.path, result.path, m.quarters), "failed");
});

test("advisors speak for every mission, and flag a goal the forecast misses", async () => {
  const { advise } = await import("./advisors.ts");
  const { policyForTurn } = await import("./missions.ts");
  for (const m of MISSIONS) {
    const config = m.setup();
    const forecast = simulate(knownConfig(config, 0)).path;
    const advice = advise({ mission: m, now: forecast[0], forecast, policy: policyForTurn(config, 0) });
    assert.equal(advice.length, m.advisors.length, `${m.id} advisors`);
    for (const a of advice) assert.ok(a.text.length > 20 && !a.text.includes("NaN") && !a.text.includes("undefined"), `${m.id}: ${a.text}`);
  }
  const first = MISSIONS[0];
  const config = first.setup();
  const forecast = simulate(knownConfig(config, 0)).path;
  const governor = advise({ mission: first, now: forecast[0], forecast, policy: policyForTurn(config, 0) }).find((a) => a.advisor === "governor")!;
  assert.equal(governor.tone, "worried", "doing nothing misses the inflation goal, so the governor should say so");
  assert.match(governor.text, /4\.5%/);
});

test("shock responses only use unlocked levers", async () => {
  const { responsesFor } = await import("./responses.ts");
  const { policyForTurn } = await import("./missions.ts");
  for (const m of MISSIONS) {
    const config = m.setup();
    const policy = policyForTurn(config, 0);
    for (const kind of ["oil-spike", "supply-shock", "commodity-bust", "sudden-stop", "downgrade", "food-price"] as const) {
      for (const r of responsesFor(kind, { policy, unlocked: new Set(m.unlocks) })) {
        const keys = Object.keys(r.changes);
        if (keys.includes("manualRate") || keys.includes("rateMode")) assert.ok(m.unlocks.includes("rate"), `${m.id} ${kind} ${r.id} uses the rate`);
        if (keys.includes("ruleStrength")) assert.ok(m.unlocks.includes("rule"), `${m.id} ${kind} ${r.id} uses the rule`);
        if (keys.includes("fiscalAdjustment")) assert.ok(m.unlocks.includes("fiscal"), `${m.id} ${kind} ${r.id} uses the budget`);
        if (keys.includes("fxRegime")) assert.ok(m.unlocks.includes("fxRegime"), `${m.id} ${kind} ${r.id} uses the regime`);
        if (keys.includes("capitalControls")) assert.ok(m.unlocks.includes("controls"), `${m.id} ${kind} ${r.id} uses controls`);
        if (keys.includes("imfProgram")) assert.ok(m.unlocks.includes("imf"), `${m.id} ${kind} ${r.id} uses the IMF`);
      }
    }
  }
});
