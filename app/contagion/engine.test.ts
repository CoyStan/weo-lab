import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, canAct, COUNTRIES, countriesHit, createWorld, hexDistance, outcome, RULES, step, type World } from "./engine.ts";
import { autoQuarter, ORIGINS } from "./strategy.ts";

const data = JSON.parse(readFileSync(new URL("../data/weo.json", import.meta.url), "utf8"));

function play(origin: string, seed: number, smart: boolean): World {
  let w = createWorld(data, origin, seed);
  while (outcome(w).kind === "playing") {
    if (smart) w = autoQuarter(w);
    w = step(w);
  }
  return w;
}

test("every map country has WEO data and its own cell", () => {
  const cells = new Set<string>();
  for (const c of COUNTRIES) {
    assert.ok(data.countries[c.iso]?.series.gdp?.["2025"], `${c.iso} has GDP`);
    const key = c.hex.join(",");
    assert.ok(!cells.has(key), `${c.iso} cell is free`);
    cells.add(key);
  }
  assert.equal(hexDistance([2, 1], [2, 1]), 0);
  assert.equal(hexDistance([6, 1], [7, 1]), 1);
});

test("the world is deterministic and actions don't mutate it", () => {
  const a = play("ITA", 4, true);
  const b = play("ITA", 4, true);
  assert.deepEqual(a, b);
  const w = createWorld(data, "TUR", 1);
  const before = JSON.stringify(w);
  act(w, { kind: "creditLine", iso: "GRC" });
  step(w);
  assert.equal(JSON.stringify(w), before);
});

test("doing nothing loses from every origin", () => {
  const passiveWins = ORIGINS.filter((o) => [1, 2, 3].some((seed) => outcome(play(o, seed, false)).kind === "won"));
  assert.deepEqual(passiveWins, [], "the origin never heals on its own");
});

test("a careful fund can contain the crisis from every origin", () => {
  let wins = 0;
  let games = 0;
  for (const o of ORIGINS) {
    const results = [1, 2, 3, 4, 5, 6].map((seed) => outcome(play(o, seed, true)));
    assert.ok(results.some((r) => r.kind === "won"), `${o} is winnable`);
    wins += results.filter((r) => r.kind === "won").length;
    games += results.length;
  }
  assert.ok(wins / games > 0.7, `strategy won ${wins}/${games}`);
});

test("rules: staff, eligibility and costs", () => {
  let w = createWorld(data, "ARG", 1);
  assert.equal(canAct(w, { kind: "creditLine", iso: "ARG" }).ok, false, "too late for the origin");
  assert.equal(canAct(w, { kind: "programme", iso: "DEU" }).ok, false, "calm countries need no programme");
  assert.equal(canAct(w, { kind: "restructure", iso: "USA" }).ok, false, "no restructuring for reserve issuers");
  assert.ok(canAct(w, { kind: "programme", iso: "ARG" }).ok);
  const cap = w.capacity;
  w = act(w, { kind: "programme", iso: "ARG" });
  assert.ok(w.capacity < cap);
  assert.ok(w.countries.ARG.stress < 88, "a programme brings immediate relief");
  w = act(w, { kind: "assist", iso: "CHL" });
  w = act(w, { kind: "assist", iso: "BRA" });
  assert.equal(w.staffLeft, 0);
  assert.equal(canAct(w, { kind: "assist", iso: "COL" }).reason, "No staff left this quarter");
  w = step(w);
  assert.equal(w.staffLeft, w.staff);
  assert.equal(countriesHit(w) >= 0, true);
});

test("a fallen financial centre brings the G20 top-up", () => {
  const usa = createWorld(data, "USA", 1);
  const tha = createWorld(data, "THA", 1);
  assert.ok(usa.boosted && !tha.boosted);
  assert.ok(usa.capacity > tha.capacity && usa.staff > tha.staff);
});

test("every news item gets a headline, and every ending a title", async () => {
  const { headline, verdict, earnedBadges, deputyQuip } = await import("./flavour.ts");
  for (const o of ["USA", "GRC", "THA"]) {
    for (const smart of [false, true]) {
      const w = play(o, 2, smart);
      for (const n of w.news) {
        const h = headline(n, w.seed);
        assert.ok(h && !h.includes("{name}") && h.length > 10, `headline for ${n.kind}/${n.tag}`);
      }
      const r = outcome(w);
      assert.ok(verdict(w, r).title.length > 3);
      assert.ok(Array.isArray(earnedBadges(w, r, 0)));
      assert.ok(deputyQuip(w, null).length > 10);
    }
  }
});
