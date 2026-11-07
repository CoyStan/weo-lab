import assert from "node:assert/strict";
import { test } from "node:test";
import { baselineConfig, simulate } from "./economy.ts";
import { getPreset } from "./presets.ts";
import { debtFan, stressConfig, stressTests, summarise, THRESHOLDS, type StressId } from "./dsa.ts";

// Relative assertions only (worse than the baseline, about 10 pp on impact), so
// the tests survive retuning of the model's parameters.

const PRESETS = ["aurelia", "boreas", "castellan", "dumara"];
const SINGLE: StressId[] = ["growth", "interest", "primary", "exchange"];

test("stress tests are deterministic", () => {
  const c = baselineConfig("aurelia");
  assert.deepEqual(stressTests(c, 3), stressTests(c, 3));
  assert.deepEqual(debtFan(c, 3, 30), debtFan(c, 3, 30));
});

test("history before the stress starts is left alone", () => {
  const c = baselineConfig("dumara");
  const base = simulate(c).path;
  for (const id of ["growth", "interest", "primary", "exchange", "combined", "contingent"] as StressId[]) {
    const p = simulate(stressConfig(c, 5, id)).path;
    // Equal up to the expectations solver's tolerance (shocks are news, so the final pass weighs drift slightly differently).
    for (let t = 0; t <= 4; t++) assert.ok(Math.abs(p[t].debt - base[t].debt) < 1e-6, `${id}: quarter ${t} changed by ${p[t].debt - base[t].debt}`);
  }
});

for (const id of PRESETS) {
  for (const from of [1, 6]) {
    test(`${id} from quarter ${from}: every shock raises peak debt above the baseline`, () => {
      const st = stressTests(baselineConfig(id), from);
      const base = st.scenarios.find((s) => s.id === "baseline")!;
      const fxDebt = getPreset(id).params.fxDebtShare;
      assert.equal(st.scenarios.length, 7);
      for (const s of st.scenarios) {
        assert.equal(s.debt.length, st.to - st.from + 2, `${s.id}: path length`);
        assert.ok([...s.debt, ...s.gfn, ...s.ob, ...s.interest].every(Number.isFinite), `${s.id}: non-finite path`);
        if (s.id === "baseline") continue;
        if (s.id === "exchange" && fxDebt < 0.05) {
          // No foreign-currency debt: a depreciation has (almost) nothing to revalue, as in the IMF's results for such advanced economies.
          assert.ok(s.peakDebt > base.peakDebt - 1, `exchange: ${s.peakDebt.toFixed(1)} well below baseline ${base.peakDebt.toFixed(1)}`);
          continue;
        }
        assert.ok(s.peakDebt > base.peakDebt + 0.1, `${s.id}: peak debt ${s.peakDebt.toFixed(1)} not above baseline ${base.peakDebt.toFixed(1)}`);
        assert.ok(s.peakGfn >= base.peakGfn - 0.05, `${s.id}: peak GFN ${s.peakGfn.toFixed(1)} below baseline ${base.peakGfn.toFixed(1)}`);
      }
    });

    test(`${id} from quarter ${from}: the combined shock is worse than each of its half-size parts`, () => {
      const c = baselineConfig(id);
      const st = stressTests(c, from);
      const combined = st.scenarios.find((s) => s.id === "combined")!;
      for (const k of SINGLE) {
        const half = summarise(k, simulate(stressConfig(c, from, k, 0.5)).path, st.from, st.to, st.thresholds);
        assert.ok(combined.peakDebt > half.peakDebt, `combined ${combined.peakDebt.toFixed(1)} not above half-size ${k} ${half.peakDebt.toFixed(1)}`);
      }
    });

    test(`${id} from quarter ${from}: the contingent liability adds about 10 pp of GDP on impact`, () => {
      const st = stressTests(baselineConfig(id), from);
      const base = st.scenarios.find((s) => s.id === "baseline")!;
      const cl = st.scenarios.find((s) => s.id === "contingent")!;
      // Index 1 is quarter `from`, the impact quarter.
      const jump = cl.debt[1] - base.debt[1];
      assert.ok(Math.abs(jump - 10) < 2, `impact ${jump.toFixed(2)} pp`);
    });
  }
}

test("thresholds and flags follow the archetype", () => {
  const em = stressTests(baselineConfig("aurelia"), 1);
  const ae = stressTests(baselineConfig("castellan"), 1);
  assert.equal(em.archetype, "EM");
  assert.equal(ae.archetype, "AE");
  assert.deepEqual(em.thresholds, THRESHOLDS.EM);
  assert.deepEqual(ae.thresholds, THRESHOLDS.AE);
  for (const st of [em, ae]) {
    for (const s of st.scenarios) {
      assert.equal(s.debtFlag, s.peakDebt > st.thresholds.debt);
      assert.equal(s.gfnFlag, s.peakGfn > st.thresholds.gfn);
    }
  }
});

test("the debt fan is ordered and starts from the last outturn", () => {
  for (const id of PRESETS) {
    const c = baselineConfig(id);
    const fan = debtFan(c, 4, 60);
    const start = simulate(c).path[3].debt;
    assert.ok(Math.abs(fan.p10[0] - start) < 1e-6 && Math.abs(fan.p90[0] - start) < 1e-6, `${id}: fan does not start at the outturn`);
    for (let i = 0; i < fan.p50.length; i++) {
      assert.ok(fan.p10[i] <= fan.p50[i] + 1e-9 && fan.p50[i] <= fan.p90[i] + 1e-9, `${id}: percentiles out of order at ${i}`);
    }
    assert.ok(fan.p90.at(-1)! - fan.p10.at(-1)! > 1, `${id}: the fan has no width`);
    assert.ok(fan.width2y > 0, `${id}: no two-year fan width`);
    assert.ok(fan.probRising >= 0 && fan.probRising <= 1);
  }
});

test("stress tests and the fan for one config take under 1.5 s", () => {
  const c = baselineConfig("dumara");
  const t0 = performance.now();
  stressTests(c, 1);
  debtFan(c, 1, 100);
  const ms = performance.now() - t0;
  assert.ok(ms < 1500, `took ${ms.toFixed(0)} ms`);
});
