// The scenario desk: WEO-style "what if" analysis for teaching and discussion.
//
// Pick an economy, start from its baseline (for real countries, the path
// calibrated to the WEO projection), layer a scenario and optionally a policy
// response on top, and read the result as deviations from baseline, the way a
// WEO scenario box does. Everything here is pure, so node --test can run it.
//
// The numbers are illustrative: a small semi-structural model, not a forecast.

import { baselineConfig, policyAt, simulate } from "../model/economy.ts";
import { getPreset, PRESETS } from "../model/presets.ts";
import type { Policy, QuarterState, ScenarioConfig, ShockKind } from "../model/types.ts";
import { buildToday, TODAY, type WeoData } from "../game/economies.ts";

/** Quarters shown: five years, the horizon of a WEO scenario box. */
export const DESK_QUARTERS = 20;

// ---- Economies ---------------------------------------------------------------------

export type Economy = { id: string; name: string; group: "Stylised economies" | "Countries (WEO baseline)"; note: string };

export function economies(data: WeoData): Economy[] {
  const out: Economy[] = PRESETS.filter((p) => ["aurelia", "boreas", "castellan", "dumara"].includes(p.id)).map((p) => ({ id: p.id, name: `${p.name} (${p.archetype.toLowerCase()})`, group: "Stylised economies" as const, note: "A made-up economy with typical features of its kind." }));
  for (const spec of TODAY) {
    const c = data.countries[spec.iso];
    if (c) out.push({ id: `today:${spec.iso}`, name: c.name, group: "Countries (WEO baseline)", note: `Baseline calibrated to the ${/outlook|weo/i.test(data.vintage) ? data.vintage : `${data.vintage} WEO`} projection for growth, inflation, the budget balance and debt, starting from its own sector balances.` });
  }
  return out;
}

/** The baseline to compare against: no shocks, policy as it stands. */
export function baselineFor(data: WeoData, id: string): ScenarioConfig {
  if (id.startsWith("today:")) {
    const spec = TODAY.find((s) => s.iso === id.slice(6));
    if (spec) return { ...buildToday(data, spec, 1).reference, shocks: [], randomShocks: false };
  }
  return { ...baselineConfig(id.startsWith("today:") ? "aurelia" : id), shocks: [], randomShocks: false };
}

// ---- The scenario library --------------------------------------------------------------

export type Size = "mild" | "standard" | "severe";
export const SIZES: Record<Size, { label: string; scale: number }> = { mild: { label: "Mild", scale: 0.5 }, standard: { label: "Standard", scale: 1 }, severe: { label: "Severe", scale: 1.5 } };

export type Scenario = {
  id: string;
  title: string;
  /** One line under the title. */
  kicker: string;
  /** What is assumed, in plain words, at standard size. */
  assumes: string;
  /** How it reaches the economy: the channels to look for. */
  channels: string[];
  /** Questions to argue about before looking at the result. */
  questions: string[];
  apply: (config: ScenarioConfig, scale: number) => ScenarioConfig;
};

const shock = (kind: ShockKind, scale: number, quarter = 2) => (config: ScenarioConfig): ScenarioConfig => ({ ...config, shocks: [...config.shocks, { id: `desk-${kind}`, kind, quarter, magnitude: scale, source: "scheduled" as const }] });

const decide = (config: ScenarioConfig, quarter: number, changes: Partial<Policy>): ScenarioConfig => ({ ...config, decisions: [...config.decisions, { quarter, changes }] });

const policyIn = (config: ScenarioConfig, t: number): Policy => policyAt(getPreset(config.presetId).defaultPolicy, config.decisions, t);

export const SCENARIOS: Scenario[] = [
  {
    id: "tight-money",
    title: "Tighter global financial conditions",
    kicker: "US rates stay higher for longer and investors pull back from risk.",
    assumes: "The US policy rate is 1 point higher throughout and risk premia on borrowers like this one rise by 150 basis points.",
    channels: ["Higher borrowing costs for the government", "Pressure on the currency, or on reserves if it is managed", "Weaker demand as financing tightens"],
    questions: ["Which matters more here: the cost of debt or the currency?", "Would you defend the exchange rate, or let it go?", "How does the answer change with more foreign-currency debt?"],
    apply: (c, k) => ({ ...c, assumptions: { ...c.assumptions, usRate: c.assumptions.usRate + 1 * k, riskPremium: c.assumptions.riskPremium + 150 * k } }),
  },
  {
    id: "oil",
    title: "Oil price spike",
    kicker: "A supply disruption sends oil up sharply for two years.",
    assumes: "Oil jumps 45% and fades over two years.",
    channels: ["Importers: higher inflation and lower real incomes", "Exporters: more export and budget revenue", "The central bank's choice: look through it or lean against it"],
    questions: ["Is this economy a winner or a loser from dearer oil?", "Should the central bank react to a price rise it cannot undo?", "What happens to the current account?"],
    apply: (c, k) => shock("oil-spike", k)(c),
  },
  {
    id: "world-slowdown",
    title: "Global slowdown",
    kicker: "World and trading-partner growth fall for a year.",
    assumes: "World and partner growth are 2.5 points lower for a year; risk premia rise and commodity prices soften.",
    channels: ["Exports fall with partner demand", "Automatic stabilisers widen the deficit", "Lower inflation gives the central bank room"],
    questions: ["How open is this economy, and so how exposed?", "Is there room in the budget to cushion it?", "Does debt rise because of the deficit or because growth is lower?"],
    apply: (c, k) => shock("global-recession", k)(c),
  },
  {
    id: "commodities",
    title: "Commodity price bust",
    kicker: "Non-oil commodity prices fall by a third for two years.",
    assumes: "Commodity export prices fall 35% for two years, then recover over a year.",
    channels: ["Export earnings and the current account", "Budget revenue from the commodity sector", "The exchange rate as a shock absorber"],
    questions: ["Does this economy export commodities at all?", "Float and take the inflation, or defend and spend reserves?", "Which buffer runs out first: reserves or fiscal space?"],
    apply: (c, k) => shock("commodity-bust", k)(c),
  },
  {
    id: "sudden-stop",
    title: "Sudden stop in capital flows",
    kicker: "Portfolio investors leave and the risk premium jumps.",
    assumes: "Capital leaves for two quarters and the risk premium jumps 350 basis points, fading over two years.",
    channels: ["A falling currency, or falling reserves", "Imported inflation", "Dearer public borrowing and tighter credit"],
    questions: ["What would you use first: rates, reserves or the exchange rate?", "When is an IMF programme worth its conditions?", "Why do countries with deep local markets suffer less?"],
    apply: (c, k) => shock("sudden-stop", k)(c),
  },
  {
    id: "food",
    title: "Food price surge",
    kicker: "A poor harvest lifts food prices for a year.",
    assumes: "Inflation is pushed up 2 points for a year; subsidies cost half a point of GDP.",
    channels: ["Headline inflation and expectations", "Real incomes and demand", "The budget, through subsidies"],
    questions: ["It will fade by itself: does policy need to do anything?", "What decides whether expectations stay anchored?", "Who in the economy bears the cost?"],
    apply: (c, k) => shock("food-price", k)(c),
  },
  {
    id: "fiscal-slippage",
    title: "Fiscal slippage",
    kicker: "The budget is loosened for two years, then held.",
    assumes: "The structural budget balance is loosened by three-quarters of a point of GDP a year for two years.",
    channels: ["More demand and growth in the short run", "A wider deficit and higher debt", "Higher spreads once debt passes the level markets watch"],
    questions: ["How long does the boost to growth last?", "At what debt level do markets start to charge for it?", "Does the central bank offset the stimulus?"],
    apply: (c, k) => {
      const base = policyIn(c, 2).fiscalAdjustment;
      return decide(decide(c, 2, { fiscalAdjustment: base - 0.75 * k }), 10, { fiscalAdjustment: base });
    },
  },
  {
    id: "consolidation",
    title: "Faster fiscal consolidation",
    kicker: "The budget is tightened by a point a year for two years.",
    assumes: "The structural budget balance improves by one point of GDP a year for two years, half through spending and half through taxes.",
    channels: ["Lower demand and growth at first (the multiplier)", "A falling deficit and, later, debt", "Lower spreads if markets believe it"],
    questions: ["Does the debt ratio fall in the first year, or rise?", "Cuts or taxes: which costs less growth?", "What could monetary policy do to help?"],
    apply: (c, k) => {
      const base = policyIn(c, 2).fiscalAdjustment;
      return decide(decide(c, 2, { fiscalAdjustment: base + 1 * k, adjustmentMix: 50 }), 10, { fiscalAdjustment: base });
    },
  },
  {
    id: "banks",
    title: "Banking crisis",
    kicker: "Banks fail, the state recapitalises them, and credit dries up.",
    assumes: "Recapitalisation adds 8% of GDP to public debt; a credit crunch drags demand for six quarters and spreads rise.",
    channels: ["A jump in public debt", "A credit crunch that cuts demand", "Lost credibility and higher spreads"],
    questions: ["Should the state have rescued the banks?", "Tighten to reassure markets, or support demand through the crunch?", "How much of the debt increase is permanent?"],
    apply: (c, k) => shock("banking-crisis", k)(c),
  },
  {
    id: "reforms",
    title: "A reform push",
    kicker: "Labour, product-market and trade reforms, with more public investment.",
    assumes: "Structural reforms at a moderate level from the start, and public investment a point of GDP higher.",
    channels: ["Higher potential growth, slowly", "Lower structural unemployment", "A budget cost now, a wider tax base later"],
    questions: ["How long before reforms show up in growth?", "Do they pay for themselves in the debt ratio?", "Why are they politically hard if they work?"],
    apply: (c, k) => {
      const p = policyIn(c, 1);
      const level = Math.max(1, Math.min(3, Math.round(2 * k)));
      return decide(c, 1, { laborReform: level, productivityReform: level, tradeOpenness: level, publicInvestment: p.publicInvestment + 1 * k });
    },
  },
];

// ---- Policy responses --------------------------------------------------------------------

export type Response = { id: string; title: string; plain: string; apply: (config: ScenarioConfig) => ScenarioConfig | null };

/** Responses start in the third quarter: policy reacts once the shock is visible. */
const REACT = 3;

export const RESPONSES: Response[] = [
  { id: "none", title: "No extra response", plain: "Policy stays on its baseline settings (the rate rule, if there is one, still reacts).", apply: (c) => c },
  {
    id: "tighten",
    title: "Tighten monetary policy",
    plain: "A tougher rate rule, or a policy rate 1.5 points higher.",
    apply: (c) => {
      const p = policyIn(c, REACT);
      if (p.fxRegime === "peg") return null;
      return decide(c, REACT, p.rateMode === "rule" ? { ruleStrength: Math.max(2.2, p.ruleStrength) } : { manualRate: p.manualRate + 1.5 });
    },
  },
  {
    id: "ease",
    title: "Ease monetary policy",
    plain: "A gentler rate rule, or a policy rate 1.5 points lower.",
    apply: (c) => {
      const p = policyIn(c, REACT);
      if (p.fxRegime === "peg") return null;
      return decide(c, REACT, p.rateMode === "rule" ? { ruleStrength: Math.min(0.8, p.ruleStrength) } : { manualRate: Math.max(0, p.manualRate - 1.5) });
    },
  },
  {
    id: "support",
    title: "Fiscal support",
    plain: "Loosen the budget by a point of GDP a year for a year, then return to plan.",
    apply: (c) => {
      const base = policyIn(c, REACT).fiscalAdjustment;
      return decide(decide(c, REACT, { fiscalAdjustment: base - 1 }), REACT + 4, { fiscalAdjustment: base });
    },
  },
  {
    id: "consolidate",
    title: "Fiscal tightening",
    plain: "Tighten the budget by a point of GDP a year for two years.",
    apply: (c) => {
      const base = policyIn(c, REACT).fiscalAdjustment;
      return decide(decide(c, REACT, { fiscalAdjustment: base + 1 }), REACT + 8, { fiscalAdjustment: base });
    },
  },
  {
    id: "defend",
    title: "Defend the currency with reserves",
    plain: "A managed float that meets all exchange-rate pressure by selling reserves.",
    apply: (c) => (policyIn(c, REACT).fxRegime === "peg" ? null : decide(c, REACT, { fxRegime: "managed", fxIntervention: 100 })),
  },
  {
    id: "float",
    title: "Let the currency float",
    plain: "No intervention: the exchange rate takes the adjustment.",
    apply: (c) => (policyIn(c, REACT).fxRegime === "float" ? null : decide(c, REACT, { fxRegime: "float" })),
  },
  {
    id: "imf",
    title: "An IMF programme",
    plain: "Financing of 3% of GDP a year, with at least half a point of fiscal tightening a year.",
    apply: (c) => {
      const p = policyIn(c, REACT);
      return p.imfProgram > 0 ? null : decide(c, REACT, { imfProgram: 3, fiscalAdjustment: Math.max(0.5, p.fiscalAdjustment) });
    },
  },
];

/** The responses that make sense for this economy (a peg has no rate of its own, a float cannot float again). */
export function responsesFor(config: ScenarioConfig): Response[] {
  return RESPONSES.filter((r) => r.apply(config) !== null);
}

// ---- Running and comparing ------------------------------------------------------------------

export type Slot = { scenario: string; size: Size; response: string };

export function slotConfig(base: ScenarioConfig, slot: Slot): ScenarioConfig {
  const sc = SCENARIOS.find((s) => s.id === slot.scenario) ?? SCENARIOS[0];
  const shocked = sc.apply(base, SIZES[slot.size].scale);
  const r = RESPONSES.find((x) => x.id === slot.response) ?? RESPONSES[0];
  return r.apply(shocked) ?? shocked;
}

export function slotLabel(slot: Slot): string {
  const sc = SCENARIOS.find((s) => s.id === slot.scenario) ?? SCENARIOS[0];
  const r = RESPONSES.find((x) => x.id === slot.response) ?? RESPONSES[0];
  return `${sc.title}${slot.size === "standard" ? "" : ` (${SIZES[slot.size].label.toLowerCase()})`}${r.id === "none" ? "" : ` + ${r.title.charAt(0).toLowerCase()}${r.title.slice(1)}`}`;
}

export type DeskMetric = "growth" | "infl" | "rate" | "unemp" | "ob" | "debt" | "ca" | "reserves" | "spread" | "rer";

/** The WEO-style indicator list: how each is shown and how a year is formed from its quarters. */
export const DESK_METRICS: { key: DeskMetric; label: string; unit: string; digits: number; agg: "mean" | "end"; diff: string }[] = [
  { key: "growth", label: "Real GDP growth", unit: "%", digits: 1, agg: "mean", diff: "pp" },
  { key: "infl", label: "Inflation", unit: "%", digits: 1, agg: "mean", diff: "pp" },
  { key: "rate", label: "Policy rate", unit: "%", digits: 1, agg: "mean", diff: "pp" },
  { key: "unemp", label: "Unemployment", unit: "%", digits: 1, agg: "mean", diff: "pp" },
  { key: "ob", label: "Budget balance", unit: "% of GDP", digits: 1, agg: "mean", diff: "pp" },
  { key: "debt", label: "Public debt", unit: "% of GDP", digits: 1, agg: "end", diff: "pp" },
  { key: "ca", label: "Current account", unit: "% of GDP", digits: 1, agg: "mean", diff: "pp" },
  { key: "reserves", label: "Reserves", unit: "months of imports", digits: 1, agg: "end", diff: "months" },
  { key: "spread", label: "Sovereign spread", unit: "bp", digits: 0, agg: "mean", diff: "bp" },
  { key: "rer", label: "Real exchange rate", unit: "index, up = weaker", digits: 1, agg: "end", diff: "%" },
];

export type Run = { config: ScenarioConfig; path: QuarterState[] };

export function run(config: ScenarioConfig): Run {
  return { config, path: simulate(config).path.slice(0, DESK_QUARTERS + 1) };
}

const moving = (c: ScenarioConfig): ScenarioConfig => ({ ...c, assumptions: { ...c.assumptions, rerConvention: "model" } });

/**
 * A scenario layered on the baseline, as WEO scenario boxes are built. The
 * baseline keeps the WEO convention of a constant real exchange rate, so a
 * country's baseline is its WEO projection. The scenario's effect is measured
 * with the exchange rate free to move (scenario against baseline, both that
 * way), and that difference is added to the baseline.
 */
export function layered(base: Run, scenario: ScenarioConfig): Run {
  const b = simulate(moving(base.config)).path;
  const s = simulate(moving(scenario)).path;
  const path = base.path.map((state, t) => {
    const out = { ...state };
    for (const m of DESK_METRICS) out[m.key] = m.key === "rer" ? state.rer * (s[t].rer / b[t].rer) : state[m.key] + (s[t][m.key] - b[t][m.key]);
    return out;
  });
  return { config: scenario, path };
}

export function years(config: ScenarioConfig): number[] {
  const start = config.startYear ?? 2026;
  return Array.from({ length: DESK_QUARTERS / 4 }, (_, i) => start + i);
}

/** One value per year: the average of its quarters, or the year-end level for stocks. */
export function annual(path: QuarterState[], key: DeskMetric, agg: "mean" | "end"): number[] {
  const out: number[] = [];
  for (let y = 0; y < DESK_QUARTERS / 4; y++) {
    const qs = path.slice(1 + 4 * y, 5 + 4 * y);
    if (!qs.length) break;
    out.push(agg === "end" ? qs[qs.length - 1][key] : qs.reduce((a, s) => a + s[key], 0) / qs.length);
  }
  return out;
}

/** Scenario minus baseline, quarter by quarter (the real exchange rate in percent, the rest in the metric's own units). */
export function deviation(base: QuarterState[], path: QuarterState[], key: DeskMetric): number[] {
  return path.map((s, t) => (key === "rer" ? (s.rer / base[t].rer - 1) * 100 : s[key] - base[t][key]));
}

export type Finding = { key: DeskMetric; label: string; peak: number; t: number; end: number; unit: string };

/** How much one of these moves counts as "a lot", so deviations in different units can be ranked. */
const WEIGHT: Record<DeskMetric, number> = { growth: 1, infl: 1, rate: 1, unemp: 1, ob: 1, debt: 3, ca: 1, reserves: 0.7, spread: 100, rer: 5 };

/** The largest deviations from baseline, biggest first: "what the model says" in a few lines. */
export function findings(base: QuarterState[], path: QuarterState[], n = 4): Finding[] {
  const out: (Finding & { score: number })[] = [];
  for (const m of DESK_METRICS) {
    const d = deviation(base, path, m.key);
    let t = 1;
    for (let i = 1; i < d.length; i++) if (Math.abs(d[i]) > Math.abs(d[t])) t = i;
    out.push({ key: m.key, label: m.label, peak: d[t], t, end: d[d.length - 1], unit: m.diff, score: Math.abs(d[t]) / WEIGHT[m.key] });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .filter((f) => f.score >= 0.1)
    .map(({ score: _score, ...f }) => f);
}

const num = (v: number, digits: number) => (Math.abs(v) < 0.5 * Math.pow(10, -digits) ? (0).toFixed(digits) : v.toFixed(digits));

/** The annual table as CSV: baseline levels, then each scenario's levels and deviations. */
export function toCsv(economy: string, base: Run, runs: { label: string; run: Run }[]): string {
  const ys = years(base.config);
  const rows: string[] = [`"WEO Scenario Lab, scenario desk: ${economy}. Illustrative model results, not a forecast."`, ["Indicator", "Unit", "Path", ...ys.map(String)].join(",")];
  for (const m of DESK_METRICS) {
    const b = annual(base.path, m.key, m.agg);
    rows.push([`"${m.label}"`, `"${m.unit}"`, "Baseline", ...b.map((v) => num(v, m.digits))].join(","));
    for (const r of runs) {
      const a = annual(r.run.path, m.key, m.agg);
      rows.push([`"${m.label}"`, `"${m.unit}"`, `"${r.label}"`, ...a.map((v) => num(v, m.digits))].join(","));
      rows.push([`"${m.label}"`, `"${m.key === "rer" ? "% difference" : `difference, ${m.diff}`}"`, `"${r.label} vs baseline"`, ...a.map((v, i) => num(m.key === "rer" ? (v / b[i] - 1) * 100 : v - b[i], m.digits === 0 ? 0 : 2))].join(","));
    }
  }
  return rows.join("\n");
}
