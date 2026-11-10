import assert from "node:assert/strict";
import { test } from "node:test";
import { simulate } from "../model/economy.ts";
import { MISSIONS, policyForTurn } from "../game/missions.ts";
import { advisorPlans, forecastOf, goalMetrics, journey, lagCall, moveMenu, planTitle, shockCall, withChanges } from "./logic.ts";

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
      assert.ok(p.hold ? Object.keys(p.changes).length === 0 : menu.includes(JSON.stringify(p.changes)), `${m.id}: plan "${p.title}" is not on the menu`);
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

test("advisor plans never make the forecast lose the mission when holding would not", () => {
  for (const m of MISSIONS) {
    const config = m.setup();
    const plans = advisorPlans(m, config, simulate(config).path, 0);
    for (const p of plans) {
      const worse = p.effects.filter((e) => e.baseOk && !e.ok);
      const better = p.effects.filter((e) => !e.baseOk && e.ok);
      assert.ok(worse.length <= better.length + 1, `${m.id}: "${p.title}" breaks ${worse.length} goals and fixes ${better.length}`);
    }
  }
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
