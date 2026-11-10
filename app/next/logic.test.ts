import assert from "node:assert/strict";
import { test } from "node:test";
import { simulate } from "../model/economy.ts";
import { MISSIONS, policyForTurn } from "../game/missions.ts";
import { advisorPlans, advisorRun, forecastOf, goalMetrics, journey, lagCall, moveMenu, moveName, planTitle, shockCall, versus, withChanges } from "./logic.ts";

const m1 = MISSIONS.find((m) => m.id === "first-quarter")!;

test("every mission gets advisor plans that are real moves on unlocked levers", () => {
  for (const m of MISSIONS) {
    const config = m.setup();
    const actual = simulate(config).path;
    const plans = advisorPlans(m, config, actual, 0);
    assert.ok(plans.length >= 1 && plans.length <= m.advisors.length, `${m.id}: ${plans.length} plans`);
    assert.deepEqual(plans.flatMap((p) => p.advisors).sort(), [...m.advisors].sort(), `${m.id}: every advisor backs exactly one plan`);
    const policy = policyForTurn(config, 0);
    const menu = moveMenu(policy, new Set(m.unlocks)).map((x) => JSON.stringify(x.changes));
    for (const p of plans) {
      // A plan is one menu move, or two on different levers.
      const single = menu.includes(JSON.stringify(p.changes));
      const pair = menu.some((a) => menu.some((b) => JSON.stringify({ ...JSON.parse(a), ...JSON.parse(b) }) === JSON.stringify(p.changes)));
      assert.ok(p.hold ? Object.keys(p.changes).length === 0 : single || pair, `${m.id}: plan "${p.title}" is not on the menu`);
      assert.ok(p.title.length > 3 && !/undefined|NaN/.test(p.title), `${m.id}: title "${p.title}"`);
      assert.ok(p.effects.length >= 1 && p.effects.every((e) => Number.isFinite(e.value)), `${m.id}: effects`);
    }
  }
});

test("in the first mission the governor wants a higher rate than the minister", () => {
  const config = m1.setup();
  const plans = advisorPlans(m1, config, simulate(config).path, 0);
  const rate = (who: string) => plans.find((p) => p.advisors.includes(who as never))!.changes.manualRate ?? 8.5;
  assert.ok(rate("governor") > 8.5, `the governor leans against the food shock (got ${rate("governor")})`);
  assert.ok(rate("governor") >= rate("minister"), "the minister never wants a higher rate than the governor");
});

test("advisors argue their own corner: in the first mission neither plan alone wins", () => {
  const verdicts = m1.advisors.map((a) => {
    const run = advisorRun(m1, a);
    while (!run.step());
    return run.result().outcome.kind;
  });
  assert.ok(verdicts.includes("lost"), "at least one advisor, followed blindly, loses: the player has to weigh them");
});

test("the lever's journey: a rate hike moves inflation late, not now", () => {
  const config = m1.setup();
  const base = forecastOf(config, 0);
  const hiked = forecastOf(withChanges(config, 1, { manualRate: 10.5 }), 0);
  const infl = journey("infl", hiked, base, 0, m1.quarters);
  assert.ok(Math.abs(infl.next) < 0.2, `little effect in the first quarter (${infl.next})`);
  assert.ok(infl.peak < -0.5 && infl.peakT >= 4, `the peak comes a year on (${infl.peak} at ${infl.peakT})`);
  assert.equal(infl.series.length, m1.quarters);
  const growth = journey("growth", hiked, base, 0, m1.quarters);
  assert.ok(growth.peakT <= infl.peakT, "growth feels it no later than inflation");
});

test("call-it questions have one right answer among their options and a finite reveal", () => {
  for (const m of MISSIONS) {
    const config = m.setup();
    const actual = simulate(config).path;
    for (const s of config.shocks) {
      const clock = Math.max(0, s.quarter - 1);
      const call = shockCall(m, config, actual, clock, s);
      if (!call) continue;
      assert.ok(call.options.some((o) => o.id === call.answer), `${m.id}: answer ${call.answer}`);
      assert.ok(!/NaN|undefined/.test(call.prompt + call.reveal), `${m.id}: ${call.prompt} / ${call.reveal}`);
    }
  }
  const config = m1.setup();
  const base = forecastOf(config, 0);
  const hiked = forecastOf(withChanges(config, 1, { manualRate: 10.5 }), 0);
  const lag = lagCall(m1, hiked, base, 0, "You raised the rate to 10.5%")!;
  assert.ok(lag, "a two-point hike is worth a question");
  assert.equal(lag.answer, "later", lag.reveal);
  assert.match(lag.reveal, /still growing/, "the effect on inflation has not peaked by the end of the mission");
  const infl = journey("infl", hiked, base, 0, m1.quarters);
  assert.ok(infl.halfT >= 3 && infl.halfT < m1.quarters, `half the effect arrives mid-mission, not in its last quarter (${infl.halfT})`);
  assert.ok(Math.abs(infl.series[infl.halfT - 1]) >= Math.abs(infl.peak) / 2, "by then at least half is felt");
  assert.equal(lagCall(m1, base, base, 0, "You held policy"), null, "no move, no question");
});

test("goal metrics come primary first, and plan titles read as sentences", () => {
  assert.deepEqual(goalMetrics(m1), ["infl", "growth"]);
  const policy = policyForTurn(m1.setup(), 0);
  assert.equal(planTitle(policy, { manualRate: 9.5 }), "Raise the rate to 9.5%");
  assert.equal(planTitle(policy, { manualRate: 8 }), "Cut the rate to 8%");
  assert.equal(planTitle(policy, {}), "Hold steady");
  assert.equal(planTitle(policy, { fiscalAdjustment: 0.5 }), "Tighten the budget by 0.5 pp of GDP a year");
});

test("replaying a mission on one advisor's plans ends in a verdict", () => {
  for (const m of MISSIONS) {
    for (const advisor of m.advisors) {
      const run = advisorRun(m, advisor);
      let steps = 0;
      while (!run.step()) steps++;
      const r = run.result();
      assert.ok(steps < m.quarters, `${m.id}/${advisor}: stops by the last quarter`);
      assert.notEqual(r.outcome.kind, "playing", `${m.id}/${advisor}: a verdict`);
      assert.equal(r.path.length, simulate(m.setup()).path.length);
      assert.ok(r.path.every((s) => Number.isFinite(s.infl) && Number.isFinite(s.debt)), `${m.id}/${advisor}: finite path`);
      assert.ok(r.endedAt >= 1 && r.endedAt <= m.quarters);
    }
  }
});

test("in the commodity mission some advisor finds a plan that survives the bust", () => {
  const m = MISSIONS.find((x) => x.id === "commodity-bust")!;
  const won = m.advisors.map((a) => {
    const run = advisorRun(m, a);
    while (!run.step());
    return run.result().outcome.kind === "won";
  });
  assert.ok(won.some(Boolean), "with bigger budget steps on the menu, at least one advisor gets through");
});

test("differences from not moving are worded as differences, and moves are named plainly", () => {
  assert.equal(versus(-0.07, 1, " pp"), "0.07 pp lower");
  assert.equal(versus(1.04, 1, " pp"), "1.0 pp higher");
  assert.equal(versus(0.001, 1, " pp"), "no different");
  assert.equal(versus(-42, 0, " bp"), "42 bp lower");
  const policy = policyForTurn(m1.setup(), 0);
  assert.equal(moveName(policy, policy), "You held policy");
  assert.equal(moveName(policy, { ...policy, manualRate: 10.5 }), "You raised the rate to 10.5%");
  assert.equal(moveName({ ...policy, fxRegime: "peg" }, { ...policy, fxRegime: "peg", manualRate: 13 }), "You raised the rate floor to 13%");
  assert.match(moveName(policy, { ...policy, imfProgram: 4, fiscalAdjustment: 0.5 }), /^Your move: call the IMF/);
  // A setting that is not in force is not part of the move.
  const ruled = { ...policy, rateMode: "rule" as const };
  assert.equal(moveName(ruled, { ...ruled, manualRate: 20, ruleStrength: 2 }), "Your move: make the rate rule tougher (×2.0)");
});
