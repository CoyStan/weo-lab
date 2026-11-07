// Impulse responses and expectations: does each archetype respond to standard
// shocks with magnitudes in the range the empirical literature reports?
//
// Each response is the difference between a shocked run and a no-shock run of
// the same archetype, with the model free to move the real exchange rate.
// Target ranges and where they come from:
//
// 1. Monetary policy, +100 bp for four quarters: output-gap trough −0.15 to
//    −0.6 pp in quarters 3–8, inflation trough −0.05 to −0.4 pp in quarters
//    4–10, and a floating currency appreciates on impact. Berg, Karam & Laxton
//    (2006), "A Practical Model-Based Approach to Monetary Policy Analysis",
//    IMF WP/06/80 and 06/81 (the QPM handbook calibrations); Christiano,
//    Eichenbaum & Evans (1999) and Coibion (2012) for the peak timing.
// 2. Fiscal, a permanent cut in spending of 1% of GDP: first-year output
//    multiplier 0.3–1.0 for emerging, commodity and frontier economies,
//    0.5–1.2 for advanced ones; tax-based adjustment costs less output.
//    Ilzetzki, Mendoza & Végh (2013), "How big (small?) are fiscal
//    multipliers?", JME 60(2); Batini, Eyraud, Forni & Weber (2014), IMF TNM
//    "Fiscal Multipliers"; Alesina, Favero & Giavazzi (2015) on tax vs spending.
// 3. Exchange-rate pass-through, a 10% step devaluation: the price level up
//    1.5–4% after four quarters in emerging and frontier economies (applied to
//    the commodity exporter too), 0.5–2% in advanced ones. Ha, Stocker &
//    Yilmazkuday (2020), "Inflation and exchange rate pass-through", JIMF 105;
//    Burstein & Gopinath (2014), Handbook of International Economics.
// 4. Oil, +30%: headline inflation up 0.2–1.0 pp within a year in oil
//    importers, with lower output and weaker budget and current account; the
//    budget and current account improve in an exporter. Kilian (2009, AER);
//    Blanchard & Galí (2007); IMF WEO April 2011 ch. 3; IMF (2015) "Global
//    implications of lower oil prices".
// 5. Risk premium, +200 bp: depreciation or reserve loss, a higher interest
//    bill and lower output (Uribe & Yue 2006, JIE; Akinci 2013, JIE).
// 6. Okun's law: 1 pp more slack raises unemployment by 0.3–0.6 pp (Ball,
//    Leigh & Loungani 2017, JMCB).
//
// Troughs are searched over the first three years. The frontier archetype pegs
// with two months of import cover, so its own baseline loses the peg in 2028;
// its responses are measured around a baseline that keeps the peg (an IMF
// programme of 6% of GDP a year, conditional on 1 pp/yr of consolidation),
// otherwise every shock would just move the date of the collapse.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { baselineConfig, clearExpectationsCache, simulate, solve, SOLVER } from "./economy.ts";
import { getPreset } from "./presets.ts";
import type { Decision, OneOffAction, QuarterState, ScenarioConfig, ScheduledShock } from "./types.ts";
import { MISSIONS } from "../game/missions.ts";
import { buildEpisode, EPISODES, TODAY, todayMission, type WeoData } from "../game/economies.ts";

type Archetype = { id: string; kind: "emerging" | "commodity" | "advanced" | "frontier"; importer: boolean; floats: boolean };
const ARCHETYPES: Archetype[] = [
  { id: "aurelia", kind: "emerging", importer: true, floats: true },
  { id: "boreas", kind: "commodity", importer: false, floats: false },
  { id: "castellan", kind: "advanced", importer: true, floats: true },
  { id: "dumara", kind: "frontier", importer: true, floats: false },
];

/** The no-shock run: the archetype's own policy, plus whatever keeps a peg alive over the horizon. */
function base(a: Archetype, extra: Decision[] = []): ScenarioConfig {
  const b = baselineConfig(a.id);
  const keepPeg: Decision[] = a.kind === "frontier" ? [{ quarter: 0, changes: { imfProgram: 6, fiscalAdjustment: 1 } }] : [];
  return { ...b, assumptions: { ...b.assumptions, rerConvention: "model" }, decisions: [...keepPeg, ...extra] };
}

const run = (c: ScenarioConfig) => simulate(c).path;
const diff = (a: QuarterState[], b: QuarterState[], k: keyof QuarterState) => a.map((s, i) => (s[k] as number) - (b[i][k] as number));
const WINDOW = 12;
function trough(xs: number[]): { value: number; quarter: number } {
  let q = 1;
  for (let t = 1; t <= WINDOW; t++) if (xs[t] < xs[q]) q = t;
  return { value: xs[q], quarter: q };
}
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const year1 = (xs: number[]) => mean(xs.slice(1, 5));

type Responses = {
  gapTrough: { value: number; quarter: number };
  inflTrough: { value: number; quarter: number };
  fxImpact: number;
  okun: number;
  spendMultiplier: number;
  taxMultiplier: number;
  priceLevel4: number;
  oilInfl: number;
  oilGap: number;
  oilBudget: number;
  oilCa: number;
  riskDepreciation: number;
  riskReserves: number;
  riskInterest: number;
  riskGap: number;
};

function responses(a: Archetype): Responses {
  const preset = getPreset(a.id);
  const b0 = run(base(a));

  // 1. Monetary: +100 bp over the baseline rate for four quarters, then back to the usual setting.
  const hike: Decision[] = [1, 2, 3, 4].map((t) => ({ quarter: t, changes: { rateMode: "manual", manualRate: b0[t].rate + 1 } }));
  hike.push({ quarter: 5, changes: preset.defaultPolicy.rateMode === "manual" ? { manualRate: preset.defaultPolicy.manualRate } : { rateMode: "rule" } });
  const m = run(base(a, hike));
  const dGap = diff(m, b0, "gap");
  const gapTrough = trough(dGap);

  // 2. Fiscal: the structural primary balance up by 1% of GDP at once, for good.
  const fiscal = (mix: number) => {
    const ongoing = a.kind === "frontier" ? 1 : 0;
    const f = run(
      base(a, [
        { quarter: 1, changes: { fiscalAdjustment: ongoing + 4, adjustmentMix: mix } },
        { quarter: 2, changes: { fiscalAdjustment: ongoing } },
      ]),
    );
    const gdp = f.map((s, i) => (s.gdpLevel / b0[i].gdpLevel - 1) * 100);
    return -year1(gdp);
  };

  // 3. Pass-through: a 10% step devaluation under a managed float (or the peg).
  const managed: Decision[] = a.floats ? [{ quarter: 0, changes: { fxRegime: "managed", fxIntervention: 50 } }] : [];
  const e0 = run(base(a, managed));
  const devalue: OneOffAction = { id: "devalue", quarter: 1, kind: "devalue", value: 10 };
  const e1 = run({ ...base(a, managed), oneOffs: [devalue] });
  const dInflE = diff(e1, e0, "infl");

  // 4. Oil: +30% (the catalogue's oil spike scaled from 45% to 30%; it builds over two quarters and fades).
  const oil: ScheduledShock = { id: "oil", kind: "oil-spike", quarter: 1, magnitude: 30 / 45, source: "scheduled" };
  const o = run({ ...base(a), shocks: [oil] });

  // 5. Risk premium: +200 bp for good.
  const rb = base(a);
  const r = run({ ...rb, assumptions: { ...rb.assumptions, riskPremium: 200 } });

  return {
    gapTrough,
    inflTrough: trough(diff(m, b0, "infl")),
    fxImpact: diff(m, b0, "dE")[1],
    okun: diff(m, b0, "unemp")[gapTrough.quarter] / -gapTrough.value,
    spendMultiplier: fiscal(0),
    taxMultiplier: fiscal(100),
    priceLevel4: dInflE.slice(1, 5).reduce((s, x) => s + x / 4, 0),
    oilInfl: Math.max(...diff(o, b0, "infl").slice(1, 5)),
    oilGap: Math.min(...diff(o, b0, "gap").slice(1, 9)),
    oilBudget: year1(diff(o, b0, "ob")),
    oilCa: year1(diff(o, b0, "ca")),
    riskDepreciation: diff(r, b0, "dE")
      .slice(1, 9)
      .reduce((s, x) => s + x, 0),
    riskReserves: diff(r, b0, "reserves")[8],
    riskInterest: diff(r, b0, "interest")[8],
    riskGap: Math.min(...diff(r, b0, "gap").slice(1, WINDOW + 1)),
  };
}

const ALL = new Map(ARCHETYPES.map((a) => [a.id, responses(a)]));
const within = (x: number, lo: number, hi: number, what: string) => assert.ok(x >= lo - 1e-9 && x <= hi + 1e-9, `${what}: ${x.toFixed(3)} outside [${lo}, ${hi}]`);

test("monetary policy: a 100 bp hike for a year lowers output and inflation with realistic lags, and a float appreciates on impact", () => {
  for (const a of ARCHETYPES) {
    const r = ALL.get(a.id)!;
    within(r.gapTrough.value, -0.6, -0.15, `${a.id} output-gap trough`);
    within(r.gapTrough.quarter, 3, 8, `${a.id} output-gap trough quarter`);
    within(r.inflTrough.value, -0.4, -0.05, `${a.id} inflation trough`);
    within(r.inflTrough.quarter, 4, 10, `${a.id} inflation trough quarter`);
    if (a.floats) assert.ok(r.fxImpact < 0, `${a.id} should appreciate on impact, dE ${r.fxImpact}`);
  }
});

test("fiscal policy: first-year multipliers of a spending cut are in the literature's range, and tax-based adjustment costs less", () => {
  for (const a of ARCHETYPES) {
    const r = ALL.get(a.id)!;
    if (a.kind === "advanced") within(r.spendMultiplier, 0.5, 1.2, `${a.id} spending multiplier`);
    else within(r.spendMultiplier, 0.3, 1.0, `${a.id} spending multiplier`);
    assert.ok(r.taxMultiplier > 0 && r.taxMultiplier < r.spendMultiplier, `${a.id}: tax ${r.taxMultiplier} vs spending ${r.spendMultiplier}`);
  }
});

test("exchange-rate pass-through: a 10% devaluation lifts the price level by a realistic amount within a year", () => {
  for (const a of ARCHETYPES) {
    const r = ALL.get(a.id)!;
    if (a.kind === "advanced") within(r.priceLevel4, 0.5, 2, `${a.id} price level after 4 quarters`);
    else within(r.priceLevel4, 1.5, 4, `${a.id} price level after 4 quarters`);
  }
});

test("oil: +30% raises importers' inflation 0.2–1 pp and costs them output; an exporter's budget and current account gain", () => {
  for (const a of ARCHETYPES) {
    const r = ALL.get(a.id)!;
    if (a.importer) {
      within(r.oilInfl, 0.2, 1.0, `${a.id} inflation within a year`);
      assert.ok(r.oilGap < 0, `${a.id} output gap ${r.oilGap}`);
      assert.ok(r.oilBudget < 0 && r.oilCa < 0, `${a.id} budget ${r.oilBudget}, current account ${r.oilCa}`);
    } else {
      assert.ok(r.oilBudget > 0 && r.oilCa > 0, `${a.id} budget ${r.oilBudget}, current account ${r.oilCa}`);
    }
  }
});

test("risk premium: +200 bp means depreciation or reserve loss, a higher interest bill and lower output", () => {
  for (const a of ARCHETYPES) {
    const r = ALL.get(a.id)!;
    assert.ok(r.riskDepreciation > 0.5 || r.riskReserves < -0.1, `${a.id}: depreciation ${r.riskDepreciation}, reserves ${r.riskReserves}`);
    assert.ok(r.riskInterest > 0, `${a.id} interest bill ${r.riskInterest}`);
    assert.ok(r.riskGap < 0, `${a.id} output ${r.riskGap}`);
  }
});

test("Okun's law: a point of slack raises unemployment by 0.3–0.6 pp", () => {
  for (const a of ARCHETYPES) within(ALL.get(a.id)!.okun, 0.3, 0.6, `${a.id} Okun coefficient`);
});

test("impulse responses by archetype (table)", () => {
  const f = (x: number) => x.toFixed(2);
  console.log(
    "archetype | gap trough (q) | infl trough (q) | FX impact | spend mult | tax mult | price level 4q | oil infl | oil gap | oil budget | oil CA | risk dE 8q | risk reserves | risk interest | risk gap | Okun",
  );
  for (const a of ARCHETYPES) {
    const r = ALL.get(a.id)!;
    console.log(
      [
        a.id,
        `${f(r.gapTrough.value)} (${r.gapTrough.quarter})`,
        `${f(r.inflTrough.value)} (${r.inflTrough.quarter})`,
        f(r.fxImpact),
        f(r.spendMultiplier),
        f(r.taxMultiplier),
        f(r.priceLevel4),
        f(r.oilInfl),
        f(r.oilGap),
        f(r.oilBudget),
        f(r.oilCa),
        f(r.riskDepreciation),
        f(r.riskReserves),
        f(r.riskInterest),
        f(r.riskGap),
        f(r.okun),
      ].join(" | "),
    );
  }
});

// ---- Expectations ------------------------------------------------------------

const data = JSON.parse(readFileSync(new URL("../data/weo.json", import.meta.url), "utf8")) as WeoData;

test("the expectations solver converges for every preset, mission, episode and country", () => {
  const configs: [string, ScenarioConfig][] = [];
  for (const a of ARCHETYPES) configs.push([a.id, baselineConfig(a.id)]);
  for (const m of MISSIONS) configs.push([m.id, m.setup()]);
  for (const ep of EPISODES) {
    const { mission, history } = buildEpisode(data, ep);
    configs.push([`${ep.id} history`, history], [`${ep.id} start`, mission.setup()]);
  }
  for (const spec of TODAY) configs.push([spec.iso, todayMission(data, spec, 1).setup()]);
  for (const [name, config] of configs) {
    const s = solve(config);
    assert.ok(s.converged && s.residual < 1e-4, `${name}: residual ${s.residual} after ${s.iterations} iterations`);
    assert.ok(s.iterations <= SOLVER.maxIterations);
  }
});

test("the solution is deterministic, cached or not", () => {
  const m = MISSIONS.find((x) => x.id === "sudden-stop")!;
  const config = m.setup();
  clearExpectationsCache();
  const a = simulate(config);
  const b = simulate(config);
  clearExpectationsCache();
  const c = simulate(config);
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});

test("a credible pre-announced rate path moves inflation before the first hike (the expectations channel)", () => {
  const b = baselineConfig("aurelia");
  const b0 = simulate(b).path;
  // Announced at the start: +2 points from quarter 4 to quarter 7, then back to the rule.
  const path: Decision[] = [4, 5, 6, 7].map((t) => ({ quarter: t, changes: { rateMode: "manual", manualRate: b0[t].rate + 2 } }));
  path.push({ quarter: 8, changes: { rateMode: "rule" } });
  const announced = { ...b, decisions: path };
  const forward = diff(simulate(announced).path, b0, "infl");

  const saved = SOLVER.maxIterations;
  SOLVER.maxIterations = 1; // the old, backward-looking expectations
  let backward: number[];
  try {
    backward = diff(simulate(announced).path, simulate(b).path, "infl");
  } finally {
    SOLVER.maxIterations = saved;
  }
  console.log(
    `announced hike from quarter 4, inflation vs baseline: forward ${forward
      .slice(1, 9)
      .map((x) => x.toFixed(3))
      .join(" ")}; backward ${backward
      .slice(1, 9)
      .map((x) => x.toFixed(3))
      .join(" ")}`,
  );
  for (const t of [1, 2, 3]) {
    assert.ok(forward[t] < 0, `forward-looking: inflation should already fall in quarter ${t}, got ${forward[t]}`);
    assert.ok(Math.abs(backward[t]) < 1e-12, `backward-looking: nothing moves before the hike, got ${backward[t]} in quarter ${t}`);
  }
  assert.ok(forward[3] < -0.03, `by quarter 3 the announced hike should be lowering inflation, got ${forward[3]}`);
  const first = (xs: number[]) => xs.findIndex((x, t) => t > 0 && x < -0.05);
  assert.ok(first(forward) < first(backward), `inflation should turn earlier: quarter ${first(forward)} vs ${first(backward)}`);
});
