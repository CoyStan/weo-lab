import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { WeoData } from "../game/economies.ts";
import { annual, baselineFor, DESK_METRICS, DESK_QUARTERS, deviation, economies, findings, layered, responsesFor, RESPONSES, run, SCENARIOS, SIZES, slotConfig, slotLabel, toCsv, years } from "./logic.ts";

const data = JSON.parse(readFileSync(new URL("../data/weo.json", import.meta.url), "utf8")) as WeoData;
const SAMPLE = ["aurelia", "boreas", "castellan", "dumara", "today:USA", "today:BRA", "today:DEU"];

test("the desk lists stylised economies and WEO countries, each with a baseline", () => {
  const list = economies(data);
  assert.ok(list.filter((e) => e.group === "Stylised economies").length === 4);
  assert.ok(list.filter((e) => e.group === "Countries (WEO baseline)").length >= 10);
  for (const id of SAMPLE) {
    assert.ok(list.some((e) => e.id === id), `${id} is listed`);
    const base = run(baselineFor(data, id));
    assert.equal(base.path.length, DESK_QUARTERS + 1);
    assert.equal(base.config.shocks.length, 0, "a baseline has no shocks");
  }
});

test("every scenario, at every size, with every response, gives a finite path in every sampled economy", () => {
  for (const id of SAMPLE) {
    const base = baselineFor(data, id);
    for (const sc of SCENARIOS) {
      for (const size of Object.keys(SIZES) as (keyof typeof SIZES)[]) {
        for (const r of size === "standard" ? responsesFor(base) : [RESPONSES[0]]) {
          const path = layered(run(base), slotConfig(base, { scenario: sc.id, size, response: r.id })).path;
          for (const m of DESK_METRICS) assert.ok(path.every((s) => Number.isFinite(s[m.key])), `${id} ${sc.id} ${size} ${r.id}: ${m.key}`);
        }
      }
    }
  }
});

test("scenarios move the economy the way their story says", () => {
  const A = run(baselineFor(data, "aurelia"));
  const dev = (id: string, scenario: string, key: (typeof DESK_METRICS)[number]["key"], response = "none") => {
    const base = run(baselineFor(data, id));
    return deviation(base.path, layered(base, slotConfig(base.config, { scenario, size: "standard", response })).path, key);
  };
  assert.ok(Math.max(...dev("aurelia", "oil", "infl")) > 0.2, "dearer oil raises inflation for an importer");
  assert.ok(Math.max(...dev("boreas", "oil", "ob")) > 0.2, "and improves an exporter's budget");
  assert.ok(Math.max(...dev("aurelia", "tight-money", "spread")) > 100, "tighter conditions raise the spread");
  assert.ok(Math.min(...dev("castellan", "world-slowdown", "growth")) < -0.5, "a global slowdown cuts growth");
  assert.ok(dev("castellan", "fiscal-slippage", "debt")[DESK_QUARTERS] > 1, "slippage raises debt");
  assert.ok(Math.max(...dev("castellan", "fiscal-slippage", "growth")) > 0.1, "after lifting growth for a while");
  assert.ok(dev("aurelia", "consolidation", "debt")[DESK_QUARTERS] < -1, "consolidation lowers debt in the end");
  assert.ok(dev("aurelia", "banks", "debt")[4] > 6, "a bank rescue lands on public debt");
  assert.ok(dev("dumara", "reforms", "growth")[DESK_QUARTERS] > 0, "reforms raise growth by the end");
  // A response changes the outcome: defending the currency in a sudden stop saves inflation and costs reserves.
  assert.ok(Math.max(...dev("aurelia", "sudden-stop", "infl", "defend")) < Math.max(...dev("aurelia", "sudden-stop", "infl")), "defending the currency limits imported inflation");
  assert.ok(Math.min(...dev("aurelia", "sudden-stop", "reserves", "defend")) < -0.5, "and spends reserves");
  // A bigger shock moves things more.
  const mild = layered(A, slotConfig(A.config, { scenario: "oil", size: "mild", response: "none" })).path;
  const severe = layered(A, slotConfig(A.config, { scenario: "oil", size: "severe", response: "none" })).path;
  assert.ok(Math.max(...deviation(A.path, severe, "infl")) > Math.max(...deviation(A.path, mild, "infl")));
});

test("responses on offer fit the regime", () => {
  const ids = (id: string) => responsesFor(baselineFor(data, id)).map((r) => r.id);
  assert.ok(!ids("dumara").includes("tighten") && !ids("dumara").includes("defend"), "a peg has no rate or float to manage");
  assert.ok(ids("dumara").includes("float") && ids("dumara").includes("imf"));
  assert.ok(!ids("aurelia").includes("float") && ids("aurelia").includes("defend"), "a float cannot float again");
});

test("annual figures, findings and the CSV agree with the paths", () => {
  const base = run(baselineFor(data, "aurelia"));
  const slot = { scenario: "oil", size: "standard" as const, response: "tighten" };
  const sc = layered(base, slotConfig(base.config, slot));
  assert.deepEqual(layered(base, base.config).path.map((x) => x.infl), base.path.map((x) => x.infl), "no scenario leaves the baseline as it is");
  assert.equal(years(base.config).length, DESK_QUARTERS / 4);
  const g = annual(base.path, "growth", "mean");
  assert.ok(Math.abs(g[0] - (base.path[1].growth + base.path[2].growth + base.path[3].growth + base.path[4].growth) / 4) < 1e-12);
  assert.equal(annual(base.path, "debt", "end")[0], base.path[4].debt);
  const f = findings(base.path, sc.path);
  assert.ok(f.length >= 1 && f.length <= 4);
  for (const x of f) assert.ok(Math.abs(x.peak - deviation(base.path, sc.path, x.key)[x.t]) < 1e-12);
  assert.equal(findings(base.path, base.path).length, 0, "no scenario, nothing to report");
  const csv = toCsv("Aurelia", base, [{ label: slotLabel(slot), run: sc }]).split("\n");
  assert.equal(csv.length, 2 + DESK_METRICS.length * 3);
  assert.match(csv[0], /not a forecast/);
  assert.equal(csv[1].split(",").length, 3 + DESK_QUARTERS / 4);
  assert.equal(slotLabel(slot), "Oil price spike + tighten monetary policy");
});
