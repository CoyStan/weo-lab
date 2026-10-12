import assert from "node:assert/strict";
import { test } from "node:test";
import { CONSTRAINT_TEMPLATES, evaluateConstraints } from "./constraints.ts";
import { baselineConfig, HORIZON, policyAt, quarterLabel, simulate } from "./economy.ts";
import { PRESETS } from "./presets.ts";
import { assess } from "./score.ts";
import { generateRandomShocks } from "./shocks.ts";
import type { QuarterState, ScenarioConfig } from "./types.ts";

const NUMERIC_KEYS: (keyof QuarterState)[] = ["gap", "growth", "infl", "rate", "rer", "debt", "pb", "ob", "ca", "reserves", "unemp", "spread", "cred", "gfn"];

function finite(path: QuarterState[]) {
  for (const s of path) for (const k of NUMERIC_KEYS) assert.ok(Number.isFinite(s[k] as number), `${k} is not finite at ${s.label}`);
}

const last = (c: ScenarioConfig) => simulate(c).path[HORIZON];

test("quarter labels follow the WEO horizon", () => {
  assert.equal(quarterLabel(0), "2025Q4");
  assert.equal(quarterLabel(1), "2026Q1");
  assert.equal(quarterLabel(24), "2031Q4");
});

test("every preset baseline runs the full horizon with finite, bounded values", () => {
  for (const preset of PRESETS) {
    const result = simulate(baselineConfig(preset.id));
    assert.equal(result.path.length, HORIZON + 1);
    finite(result.path);
    for (const s of result.path.slice(1)) {
      assert.ok(Math.abs(s.gap) < 10, `${preset.id} gap ${s.gap} at ${s.label}`);
      assert.ok(s.infl > -3 && s.infl < 40, `${preset.id} inflation ${s.infl} at ${s.label}`);
      assert.ok(s.debt >= 0 && s.debt < 250, `${preset.id} debt ${s.debt} at ${s.label}`);
    }
  }
});

test("baselines are quiet: no shocks, and the floaters keep their real exchange rate flat", () => {
  for (const preset of PRESETS) {
    const result = simulate(baselineConfig(preset.id));
    assert.equal(result.shocks.length, 0);
    assert.equal(result.events.filter((e) => e.kind === "shock").length, 0);
    if (preset.defaultRegime === "float") for (const s of result.path) assert.ok(Math.abs(s.rer - 100) < 1e-6, `${preset.id} RER moved to ${s.rer}`);
  }
});

test("Aurelia's inflation-targeting rule pulls inflation toward the 4% target", () => {
  const end = last(baselineConfig("aurelia"));
  assert.ok(end.infl < 5.5 && end.infl > 2.5, `end inflation ${end.infl}`);
  assert.ok(Math.abs(end.infl - 4) < 1.2, `end inflation ${end.infl} not near target`);
});

test("fiscal consolidation lowers the debt ratio relative to the baseline, at a cost to growth early on", () => {
  const base = simulate(baselineConfig("aurelia"));
  const tightened = simulate({ ...baselineConfig("aurelia"), decisions: [{ quarter: 1, changes: { fiscalAdjustment: 1.0 } }] });
  assert.ok(tightened.path[HORIZON].debt < base.path[HORIZON].debt - 5, `debt ${tightened.path[HORIZON].debt} vs ${base.path[HORIZON].debt}`);
  assert.ok(tightened.path[8].growth < base.path[8].growth, "growth should dip during the adjustment");
});

test("an oil spike raises inflation for an importer and helps an exporter's budget", () => {
  const shock = { id: "s", kind: "oil-spike" as const, quarter: 4, magnitude: 1, source: "scheduled" as const };
  const aurelia = simulate({ ...baselineConfig("aurelia"), shocks: [shock] });
  const aureliaBase = simulate(baselineConfig("aurelia"));
  assert.ok(aurelia.path[5].infl > aureliaBase.path[5].infl + 0.4, `importer inflation should rise: ${aurelia.path[5].infl} vs ${aureliaBase.path[5].infl}`);
  assert.ok(aurelia.path[6].ca < aureliaBase.path[6].ca, "importer current account should worsen");
  const boreas = simulate({ ...baselineConfig("boreas"), shocks: [shock] });
  const boreasBase = simulate(baselineConfig("boreas"));
  assert.ok(boreas.path[6].pb > boreasBase.path[6].pb, "exporter primary balance should improve");
});

test("a sudden stop depreciates a floating currency when the model moves the RER", () => {
  const cfg: ScenarioConfig = {
    ...baselineConfig("aurelia"),
    assumptions: { ...baselineConfig("aurelia").assumptions, rerConvention: "model" },
    shocks: [{ id: "s", kind: "sudden-stop", quarter: 4, magnitude: 1, source: "scheduled" }],
  };
  const r = simulate(cfg);
  assert.ok(r.path[6].rer > 103, `RER ${r.path[6].rer}`);
  assert.ok(r.path[6].spread > r.path[3].spread + 100, "spread should jump");
});

test("Dumara's peg breaks in the baseline once reserves are exhausted, and an IMF programme with adjustment delays it", () => {
  const base = simulate(baselineConfig("dumara"));
  const breakEvent = base.events.find((e) => e.title === "Peg abandoned");
  assert.ok(breakEvent, "baseline peg should break");
  const program = simulate({ ...baselineConfig("dumara"), decisions: [{ quarter: 1, changes: { imfProgram: 3, fiscalAdjustment: 1.5 } }] });
  const programBreak = program.events.find((e) => e.title === "Peg abandoned");
  assert.ok(!programBreak || programBreak.quarter > breakEvent.quarter + 4, "programme should delay or avoid the break");
  assert.ok(program.path[8].reserves > base.path[8].reserves, "reserves should be higher with disbursements");
});

test("a debt restructuring cuts the stock and raises spreads for a while", () => {
  const r = simulate({ ...baselineConfig("dumara"), oneOffs: [{ id: "r", quarter: 3, kind: "restructure", value: 30 }] });
  const base = simulate(baselineConfig("dumara"));
  assert.ok(r.path[3].debt < base.path[3].debt * 0.75, "debt should fall by roughly the haircut");
  assert.ok(r.path[4].spread > base.path[4].spread + 100, "spreads should widen after default");
  assert.ok(r.path[3].cred < base.path[3].cred - 10, "credibility should drop");
});

test("decisions apply from their quarter onward and later ones override", () => {
  const defaults = PRESETS[0].defaultPolicy;
  const decisions = [
    { quarter: 3, changes: { manualRate: 10 } },
    { quarter: 6, changes: { manualRate: 7, rateMode: "manual" as const } },
  ];
  assert.equal(policyAt(defaults, decisions, 2).manualRate, defaults.manualRate);
  assert.equal(policyAt(defaults, decisions, 4).manualRate, 10);
  assert.equal(policyAt(defaults, decisions, 7).manualRate, 7);
  assert.equal(policyAt(defaults, decisions, 7).rateMode, "manual");
});

test("manual tightening lowers inflation relative to the rule path", () => {
  const base = simulate(baselineConfig("aurelia"));
  const tight = simulate({ ...baselineConfig("aurelia"), decisions: [{ quarter: 1, changes: { rateMode: "manual", manualRate: 12 } }] });
  assert.ok(tight.path[8].infl < base.path[8].infl - 0.3, `inflation ${tight.path[8].infl} vs ${base.path[8].infl}`);
  assert.ok(tight.path[8].gap < base.path[8].gap, "tightening opens a negative gap");
});

test("random shocks are reproducible for a seed and bounded in number", () => {
  const a = generateRandomShocks(42, HORIZON);
  const b = generateRandomShocks(42, HORIZON);
  assert.deepEqual(a, b);
  assert.ok(a.length <= 4);
  for (const s of a) assert.ok(s.quarter >= 1 && s.quarter <= HORIZON);
  let any = 0;
  for (let seed = 1; seed < 40; seed++) any += generateRandomShocks(seed, HORIZON).length;
  assert.ok(any > 0, "some seeds should draw shocks");
});

test("constraints flag breaches only from their start quarter", () => {
  const path = simulate(baselineConfig("dumara")).path;
  const breaches = evaluateConstraints(path, [{ id: "c", variable: "reserves", op: ">=", threshold: 3, fromQuarter: 5 }]);
  assert.ok(breaches.length > 0);
  assert.ok(breaches.every((b) => b.quarter >= 5));
  const templates = CONSTRAINT_TEMPLATES.flatMap((t) => t.constraints);
  assert.ok(templates.length >= 8);
});

test("the assessment rewards a consolidating scenario over a crisis one", () => {
  const good = simulate({ ...baselineConfig("aurelia"), decisions: [{ quarter: 1, changes: { fiscalAdjustment: 0.75, productivityReform: 2 } }] });
  const ref = simulate(baselineConfig("aurelia"));
  const crisis = simulate({ ...baselineConfig("dumara"), shocks: [{ id: "s", kind: "sudden-stop", quarter: 2, magnitude: 1.5, source: "scheduled" }] });
  const crisisRef = simulate(baselineConfig("dumara"));
  const a = assess(good, ref, [], 4);
  const b = assess(crisis, crisisRef, [], 5);
  assert.ok(a.score > b.score, `${a.score} should beat ${b.score}`);
  assert.equal(a.lines.length, 6);
});

test("the risk fan brackets the median and widens with the horizon", async () => {
  const { simulateFan } = await import("./fan.ts");
  const fan = simulateFan(baselineConfig("aurelia"), 40);
  for (let t = 0; t <= HORIZON; t++) {
    assert.ok(fan.debt.p10[t] <= fan.debt.p50[t] + 1e-9 && fan.debt.p50[t] <= fan.debt.p90[t] + 1e-9);
  }
  const width = (t: number) => fan.debt.p90[t] - fan.debt.p10[t];
  assert.ok(width(0) < 1e-9, "no uncertainty at the starting point");
  assert.ok(width(HORIZON) > width(4), "uncertainty should grow");
});

test("drivers add up to each quarter's change, with little left unexplained", () => {
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const stressed: ScenarioConfig = {
    ...baselineConfig("aurelia"),
    shocks: [
      { id: "a", kind: "oil-spike", quarter: 3, magnitude: 1.2, source: "scheduled" },
      { id: "b", kind: "sudden-stop", quarter: 6, magnitude: 1, source: "scheduled" },
    ],
  };
  for (const config of [stressed, ...PRESETS.map((p) => baselineConfig(p.id))]) {
    const { path } = simulate(config);
    for (let t = 1; t < path.length; t++) {
      const s = path[t];
      const p = path[t - 1];
      assert.ok(Math.abs(sum(s.drivers.infl) - (s.infl - p.infl)) < 1e-9, `inflation drivers at ${s.label}`);
      assert.ok(Math.abs(sum(s.drivers.gap) - (s.gap - p.gap)) < 1e-9, `gap drivers at ${s.label}`);
      assert.ok(Math.abs(sum(s.drivers.debt) - (s.debt - p.debt)) < 1e-9, `debt drivers at ${s.label}`);
      assert.ok(Math.abs(s.drivers.infl.other) < 0.01, `unexplained inflation ${s.drivers.infl.other} at ${s.label}`);
      assert.ok(Math.abs(s.drivers.gap.other) < 0.01, `unexplained gap ${s.drivers.gap.other} at ${s.label}`);
    }
  }
});
