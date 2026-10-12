import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { simulate } from "../model/economy.ts";
import type { Decision, OneOffAction, ScenarioConfig } from "../model/types.ts";
import { annual } from "./calibrate.ts";
import { buildEpisode, EPISODES, TODAY, todayMission, type WeoData } from "./economies.ts";
import { missionOutcome } from "./missions.ts";
import { affordable } from "./politics.ts";

const data = JSON.parse(readFileSync(new URL("../data/weo.json", import.meta.url), "utf8")) as WeoData;

test("each episode's calibrated history reproduces the WEO data", () => {
  for (const ep of EPISODES) {
    const { history } = buildEpisode(data, ep);
    const path = simulate(history).path;
    const c = data.countries[ep.iso].series;
    for (let y = ep.startYear; y < ep.startYear + ep.quarters / 4; y++) {
      const a = annual(path, y, ep.startYear);
      for (const [key, got, tol] of [["growth", a.growth, 0.1], ["infl", a.infl, 0.1], ["balance", a.balance, 0.1], ["debt", a.debt, 0.2]] as const) {
        const want = c[key][String(y)];
        if (want !== undefined) assert.ok(Math.abs(got - want) <= tol, `${ep.id} ${y} ${key}: model ${got.toFixed(2)} vs data ${want}`);
      }
    }
  }
});

test("each country's baseline reproduces the WEO projection", () => {
  for (const spec of TODAY) {
    const m = todayMission(data, spec, 1);
    const path = simulate(m.comparison!.config).path;
    const c = data.countries[spec.iso].series;
    for (const y of [2026, 2027, 2028]) {
      const a = annual(path, y, 2026);
      assert.ok(Math.abs(a.growth - c.growth[String(y)]) < 0.1, `${spec.iso} ${y} growth`);
      assert.ok(Math.abs(a.infl - c.infl[String(y)]) < 0.1, `${spec.iso} ${y} inflation`);
    }
  }
});

const q = (quarter: number, changes: Decision["changes"]): Decision => ({ quarter, changes });
/** One plan per episode that economists have argued would have done better. */
const ALTERNATIVES: Record<string, { decisions: Decision[]; oneOffs?: Omit<OneOffAction, "id">[] }> = {
  "thailand-1997": { decisions: [q(1, { fxRegime: "float", imfProgram: 3, fiscalAdjustment: 0.5 })] },
  "korea-1997": { decisions: [q(2, { fxRegime: "float" }), q(3, { imfProgram: 4, fiscalAdjustment: 0.5 })] },
  "argentina-2001": { decisions: [q(1, { fxRegime: "float", manualRate: 15, imfProgram: 4, fiscalAdjustment: 0.5 })], oneOffs: [{ quarter: 2, kind: "restructure", value: 30 }] },
  "iceland-2008": { decisions: [q(4, { rateMode: "manual", manualRate: 12, capitalControls: true, imfProgram: 6, fiscalAdjustment: 0.5 }), q(6, { manualRate: 8 }), q(8, { manualRate: 5 })] },
  "greece-2010": { decisions: [q(2, { imfProgram: 8, fiscalAdjustment: 1 })], oneOffs: [{ quarter: 2, kind: "restructure", value: 50 }] },
};

test("history and doing nothing both lose; a known alternative wins", () => {
  for (const ep of EPISODES) {
    const { mission, history } = buildEpisode(data, ep);
    const run = (config: ScenarioConfig) => {
      const r = simulate(config);
      return missionOutcome(mission, r, r.path, mission.quarters, config).kind;
    };
    assert.equal(run(history), "lost", `${ep.id}: repeating history should not beat history`);
    assert.equal(run(mission.setup()), "lost", `${ep.id}: keeping the pre-crisis policy should lose`);
    const alt = ALTERNATIVES[ep.id];
    const base = mission.setup();
    const config = { ...base, decisions: [...base.decisions, ...alt.decisions], oneOffs: (alt.oneOffs ?? []).map((o, i) => ({ ...o, id: `alt-${i}` })) };
    assert.equal(run(config), "won", `${ep.id}: the alternative plan should win`);
    const r = simulate(config);
    assert.ok(affordable(mission.politics, config, r.path, r.events, mission.quarters).ok, `${ep.id}: the alternative plan must be affordable in Votes and Trust`);
  }
});

test("matching the WEO projection is not enough to win today", () => {
  for (const spec of TODAY.filter((c) => ["USA", "BRA", "DEU", "IND"].includes(c.iso))) {
    const m = todayMission(data, spec, 3);
    const config = m.setup();
    const r = simulate(config);
    assert.equal(missionOutcome(m, r, r.path, m.quarters, config).kind, "lost", `${spec.iso}: doing nothing should not beat the projection`);
  }
});
