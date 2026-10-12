// Real economies: countries today (WEO projections as the line to beat) and
// historical episodes (what actually happened as the line to beat). Built from
// the WEO snapshot in app/data/weo.json; see scripts/fetch-weo.mjs.
//
// The model stays stylised: each country borrows the structure of one of the
// four archetypes, starts from its real numbers, and is calibrated so that
// unchanged (or historical) policy reproduces the data. Policy rates, reserves
// and spreads are not in the WEO series used here; those starting values are
// estimates, and the game says so.

import { baselineConfig } from "../model/economy.ts";
import { getPreset, registerPreset, type Preset } from "../model/presets.ts";
import { mulberry32 } from "../model/random.ts";
import type { Decision, FxRegime, OneOffAction, ScenarioConfig, ScheduledShock, ShockKind } from "../model/types.ts";
import { calibrate, type YearTarget } from "./calibrate.ts";
import type { AdvisorId, LeverId, Mission, Objective } from "./missions.ts";
import type { PoliticsRules } from "./politics.ts";

export type Series = Record<string, number>;
export type WeoCountry = { name: string; series: Record<"growth" | "infl" | "debt" | "balance" | "ca" | "unemp", Series> };
export type WeoData = { vintage: string; fetched: string; url: string; countries: Record<string, WeoCountry> };

export type Archetype = "advanced" | "emerging" | "commodity" | "frontier";
const ARCHETYPE_PRESET: Record<Archetype, string> = { advanced: "castellan", emerging: "aurelia", commodity: "boreas", frontier: "dumara" };

type Overrides = { reserves?: number; spread?: number; cred?: number; iEff?: number; rate?: number; fxDebtShare?: number; debtThreshold?: number };

const v = (c: WeoCountry, key: keyof WeoCountry["series"], year: number) => c.series[key][String(year)];
const avg = (xs: (number | undefined)[]) => {
  const ok = xs.filter((x): x is number => x !== undefined);
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : undefined;
};

/** A preset that starts from a country's data in `year`. */
function buildPreset(id: string, c: WeoCountry, year: number, archetype: Archetype, regime: FxRegime, target: number, potential: number, o: Overrides, blurb: string): Preset {
  const base = getPreset(ARCHETYPE_PRESET[archetype]);
  const infl = v(c, "infl", year) ?? base.initial.infl;
  const growth = v(c, "growth", year) ?? base.initial.growth;
  const debt = v(c, "debt", year) ?? base.initial.debt;
  const balance = v(c, "balance", year) ?? base.initial.structPB;
  const ca = v(c, "ca", year) ?? base.initial.ca;
  const unemp = v(c, "unemp", year) ?? base.initial.unemp;
  const iEff = o.iEff ?? base.initial.iEff;
  const params = { ...base.params, nairu: unemp, ...(o.fxDebtShare !== undefined ? { fxDebtShare: o.fxDebtShare } : {}), ...(o.debtThreshold !== undefined ? { debtThreshold: o.debtThreshold } : {}) };
  const spread = o.spread ?? base.initial.spread;
  params.spreadBase = spread;
  const rate = o.rate ?? Math.max(params.elb, Math.round((params.neutralRealRate + infl) * 4) / 4);
  const primary = balance + (iEff / 100) * debt;
  return {
    id,
    name: c.name,
    tagline: blurb,
    description: blurb,
    archetype: base.archetype,
    initial: { gap: 0, infl, rate, debt, structPB: primary, iEff, ca, reserves: o.reserves ?? base.initial.reserves, unemp, spread, cred: o.cred ?? base.initial.cred, growth },
    params,
    defaultPolicy: {
      ...base.defaultPolicy,
      inflationTarget: target,
      fxRegime: regime,
      fxIntervention: regime === "managed" ? 50 : regime === "peg" ? 100 : 0,
      rateMode: regime === "peg" ? "manual" : "rule",
      manualRate: rate,
      ruleStrength: 1.5,
      fiscalAdjustment: 0,
      imfProgram: 0,
      capitalControls: false,
    },
    potentialGrowth: potential,
    defaultRegime: regime,
  };
}

// ---- Countries today ---------------------------------------------------------

export type CountrySpec = { iso: string; archetype: Archetype; regime: FxRegime; target: number; euro?: boolean; note?: string; reserves?: number };

export const TODAY: CountrySpec[] = [
  { iso: "USA", archetype: "advanced", regime: "float", target: 2 },
  { iso: "JPN", archetype: "advanced", regime: "float", target: 2 },
  { iso: "GBR", archetype: "advanced", regime: "float", target: 2 },
  { iso: "KOR", archetype: "advanced", regime: "float", target: 2 },
  { iso: "DEU", archetype: "advanced", regime: "peg", target: 2, euro: true, reserves: 30 },
  { iso: "ITA", archetype: "advanced", regime: "peg", target: 2, euro: true, reserves: 30 },
  { iso: "GRC", archetype: "advanced", regime: "peg", target: 2, euro: true, reserves: 30 },
  { iso: "POL", archetype: "emerging", regime: "float", target: 2.5 },
  { iso: "BRA", archetype: "emerging", regime: "float", target: 3 },
  { iso: "MEX", archetype: "emerging", regime: "float", target: 3 },
  { iso: "IND", archetype: "emerging", regime: "managed", target: 4 },
  { iso: "IDN", archetype: "emerging", regime: "managed", target: 2.5 },
  { iso: "PHL", archetype: "emerging", regime: "float", target: 3 },
  { iso: "THA", archetype: "emerging", regime: "managed", target: 2 },
  { iso: "TUR", archetype: "emerging", regime: "float", target: 5 },
  { iso: "ZAF", archetype: "commodity", regime: "float", target: 4.5 },
  { iso: "CHL", archetype: "commodity", regime: "float", target: 3 },
  { iso: "COL", archetype: "commodity", regime: "float", target: 3 },
  { iso: "EGY", archetype: "frontier", regime: "managed", target: 7 },
  { iso: "PAK", archetype: "frontier", regime: "managed", target: 6 },
  { iso: "ARG", archetype: "frontier", regime: "managed", target: 10, note: "Argentina has no formal inflation target; 10% stands in for a disinflation goal." },
];

const TODAY_YEARS = [2026, 2027, 2028, 2029, 2030, 2031];
const TODAY_QUARTERS = 12;

export function todayPresetId(iso: string) {
  return `today-${iso}`;
}

/** Register a country's preset and build its WEO-calibrated baseline. */
export function buildToday(data: WeoData, spec: CountrySpec, seed: number): { config: ScenarioConfig; reference: ScenarioConfig } {
  const c = data.countries[spec.iso];
  const potential = avg([v(c, "growth", 2029), v(c, "growth", 2030), v(c, "growth", 2031)]) ?? 2;
  const preset = buildPreset(todayPresetId(spec.iso), c, 2025, spec.archetype, spec.regime, spec.target, potential, { reserves: spec.reserves }, `${c.name}, from the IMF's ${data.vintage} data`);
  registerPreset(preset);
  const base: ScenarioConfig = { ...baselineConfig(preset.id), startYear: 2026 };
  const targets: YearTarget[] = TODAY_YEARS.map((year) => ({ year, growth: v(c, "growth", year), infl: v(c, "infl", year), balance: v(c, "balance", year), debt: v(c, "debt", year) }));
  // The WEO projection is public, so its residuals are visible to the forecast.
  const reference = calibrate(base, targets);
  const shocks = todaySurprises(seed);
  return { config: { ...reference, shocks, seed }, reference };
}

/** Two moderate surprises per run, drawn from a seed so a run can be replayed. */
const TODAY_SHOCKS: ShockKind[] = ["oil-spike", "global-recession", "sudden-stop", "commodity-bust", "food-price", "downgrade", "inflow-surge", "supply-shock"];

export function todaySurprises(seed: number): ScheduledShock[] {
  const rand = mulberry32(seed);
  const picks: ScheduledShock[] = [];
  const used = new Set<ShockKind>();
  while (picks.length < 2) {
    const kind = TODAY_SHOCKS[Math.floor(rand() * TODAY_SHOCKS.length)];
    if (used.has(kind)) continue;
    used.add(kind);
    const quarter = 2 + Math.floor(rand() * (TODAY_QUARTERS - 3));
    picks.push({ id: `surprise-today-${picks.length}`, kind, quarter, magnitude: 0.5 + rand() * 0.25, source: "scheduled" });
  }
  return picks.sort((a, b) => a.quarter - b.quarter);
}

export function todayMission(data: WeoData, spec: CountrySpec, seed: number): Mission {
  const c = data.countries[spec.iso];
  const { config, reference } = buildToday(data, spec, seed);
  const debt28 = v(c, "debt", 2028) ?? 60;
  const growth28 = v(c, "growth", 2028) ?? 2;
  const unlocks: LeverId[] = spec.euro ? ["fiscal", "mix", "investment", "reforms", "imf"] : ["rate", "rule", "fiscal", "mix", "investment", "fxRegime", "intervention", "controls", "reforms", "imf"];
  // Beat the projection, not just match it: unchanged policy reproduces the WEO path exactly.
  const debtGoal = debt28 - 1;
  const infl28 = v(c, "infl", 2028) ?? spec.target;
  // Close to target, or a full point better than the projection where the target is out of reach.
  const inflGoal = Math.max(spec.target + 0.5, infl28 - 1);
  const objectives: Objective[] = [
    { id: "debt", label: `Debt at least a point below the WEO projection for 2028 (${debtGoal.toFixed(1)}% of GDP or less)`, metric: "debt", op: "<=", threshold: debtGoal, when: "end" },
    {
      id: "infl",
      label: inflGoal > spec.target + 0.5 ? `Inflation at least a point below the WEO projection by the end of 2028 (${inflGoal.toFixed(1)}% or less)` : `Inflation within half a point of the ${spec.target}% target by the end of 2028`,
      metric: "infl",
      op: "<=",
      threshold: inflGoal,
      when: "end",
    },
    { id: "growth", label: `Growth in 2028 above the WEO projection (${growth28.toFixed(1)}%)`, metric: "growth", op: ">=", threshold: growth28 + 0.2, when: "year", year: 2028, bonus: true },
    { id: "jobs", label: "Never let growth fall below zero", metric: "growth", op: ">=", threshold: 0, when: "every", from: 1, bonus: true },
  ];
  return {
    id: `today-${spec.iso}`,
    number: 0,
    title: `${c.name} today`,
    presetId: todayPresetId(spec.iso),
    kicker: `Start from ${c.name}'s 2025 numbers and try to beat the IMF projection.`,
    briefing: [
      `You take over economic policy in ${c.name} at the start of 2026. The numbers you start from, and the path the forecast shows if nothing changes, come from the IMF's ${data.vintage}.`,
      spec.euro ? `${c.name} is in the euro area: the European Central Bank sets interest rates and the exchange rate floats for the whole area, so your tools are the budget, reforms and outside support.` : `Policy rates, reserves and bond spreads are not in the WEO series this game uses, so those starting values are the model's estimates.`,
      "Two surprises are drawn for this run. Beat the projection: bring debt in below it and inflation close to target by the end of 2028.",
      ...(spec.note ? [spec.note] : []),
    ],
    lesson: "Projections are a starting point, not a destiny: the same economy looks very different under different choices and different luck.",
    hint: "Watch the dashed forecast against the WEO line on each goal card. Small, early moves usually beat large, late ones.",
    quarters: TODAY_QUARTERS,
    unlocks,
    advisors: ["governor", "minister", "chief"] as AdvisorId[],
    objectives,
    fail: [{ metric: "spread", op: ">", threshold: 1200, message: "Spreads passed 1,200 bp and the government lost market access." }],
    politics: { start: { votes: 6, trust: 3 }, elections: [8], threshold: 2, institutions: spec.euro ? ["fiscal-rule", "tax-admin", "debt-office", "investment-agency", "safety-net"] : ["cb-independence", "inflation-targeting", "forward-guidance", "fiscal-rule", "tax-admin", "debt-office", "investment-agency", "safety-net", "swap-line", "macroprudential"] } as PoliticsRules,
    setup: () => config,
    startYear: 2026,
    comparison: { label: "WEO projection", config: reference },
  };
}

// ---- Historical episodes -----------------------------------------------------

export type Episode = {
  id: string;
  iso: string;
  title: string;
  span: string;
  startYear: number;
  quarters: number;
  archetype: Archetype;
  regime: FxRegime;
  target: number;
  overrides: Overrides;
  /** Potential growth during the episode, %. */
  potential: number;
  /** What policymakers actually did, approximately, in quarters from the start. */
  history: { decisions: Decision[]; oneOffs?: Omit<OneOffAction, "id">[] };
  /** Shocks shown to the player as they happen (the rest of history sits in hidden residuals). */
  shocks?: Omit<ScheduledShock, "source">[];
  context: string[];
  whatHappened: string[];
  lesson: string;
  hint: string;
  unlocks: LeverId[];
  goals: (actual: (key: keyof WeoCountry["series"], year: number) => number) => Objective[];
  politics: PoliticsRules;
};

const q = (quarter: number, changes: Decision["changes"]): Decision => ({ quarter, changes });

export const EPISODES: Episode[] = [
  {
    id: "thailand-1997",
    iso: "THA",
    title: "The baht breaks",
    span: "Thailand, 1997–2000",
    startYear: 1997,
    quarters: 16,
    archetype: "emerging",
    regime: "peg",
    target: 3,
    potential: 4.5,
    overrides: { reserves: 5, spread: 150, cred: 60, iEff: 6, fxDebtShare: 0.4, rate: 11 },
    history: {
      decisions: [q(0, { rateMode: "manual", manualRate: 11 }), q(3, { fxRegime: "float", manualRate: 20, imfProgram: 3, fiscalAdjustment: 1 }), q(7, { manualRate: 10, fiscalAdjustment: -2 }), q(9, { manualRate: 4, fiscalAdjustment: -1 }), q(13, { fiscalAdjustment: 0 })],
    },
    context: [
      "Thailand has grown fast for a decade with the baht pegged to a basket dominated by the dollar. Banks and firms have borrowed heavily abroad, short term and in dollars, and the current account deficit is about 8% of GDP.",
      "Speculators are circling. The central bank can spend reserves to hold the peg, raise rates, or let the baht go.",
    ],
    whatHappened: [
      "The central bank spent most of its usable reserves defending the peg, much of it through forward contracts, and floated the baht on 2 July 1997. It lost about half its value by early 1998.",
      "An IMF-led package of about $17 billion followed in August, with tight money and an initial fiscal tightening that was later reversed. Output fell 7.6% in 1998 before recovering.",
    ],
    lesson: "Defending a peg with reserves only buys time if the problem is temporary; with large foreign-currency debts, the longer the defence, the harder the landing.",
    hint: "Decide early whether the peg can survive. Floating before the reserves are gone keeps a buffer for later.",
    shocks: [{ id: "surprise-stop", kind: "sudden-stop", quarter: 3, magnitude: 2 }],
    unlocks: ["rate", "fxRegime", "intervention", "fiscal", "imf", "devalue", "controls"],
    goals: (a) => [
      { id: "growth98", label: `Growth in 1998 better than what happened (${a("growth", 1998).toFixed(1)}%)`, metric: "growth", op: ">=", threshold: a("growth", 1998) + 0.1, when: "year", year: 1998 },
      { id: "reserves", label: "Reserves never below 1.5 months of imports", metric: "reserves", op: ">=", threshold: 1.5, when: "every", from: 1 },
      { id: "infl98", label: `Inflation in 1998 below what happened (${a("infl", 1998).toFixed(1)}%)`, metric: "infl", op: "<=", threshold: a("infl", 1998) - 0.1, when: "year", year: 1998, bonus: true },
      { id: "debt", label: `Debt in 2000 below what happened (${a("debt", 2000).toFixed(1)}% of GDP)`, metric: "debt", op: "<=", threshold: a("debt", 2000) - 0.1, when: "year", year: 2000, bonus: true },
    ],
    politics: { start: { votes: 4, trust: 2 }, elections: [], threshold: 0, institutions: ["swap-line", "macroprudential", "debt-office", "safety-net"], trustCrisis: false },
  },
  {
    id: "korea-1997",
    iso: "KOR",
    title: "Run on the won",
    span: "Korea, 1997–2000",
    startYear: 1997,
    quarters: 16,
    archetype: "emerging",
    regime: "managed",
    target: 3,
    potential: 5,
    overrides: { reserves: 2.5, spread: 100, cred: 65, iEff: 6, fxDebtShare: 0.1, rate: 12 },
    history: {
      decisions: [q(0, { rateMode: "manual", manualRate: 12, fxIntervention: 70 }), q(4, { fxRegime: "float", manualRate: 25, imfProgram: 4, fiscalAdjustment: 0.5 }), q(6, { manualRate: 15, fiscalAdjustment: -2 }), q(7, { manualRate: 8 }), q(9, { manualRate: 5, fiscalAdjustment: 0 })],
    },
    context: [
      "Korea's large industrial groups are highly indebted, and its banks have borrowed short term abroad. As neighbours' currencies fall in 1997, foreign lenders stop rolling over their loans.",
      "Usable reserves are thin. The won is managed within a band.",
    ],
    whatHappened: [
      "The won came under attack in late 1997. Korea widened and then abandoned the band in December, and agreed a package of about $58 billion with the IMF, World Bank, Asian Development Bank and bilateral lenders.",
      "Interest rates rose to around 30% before falling through 1998. Output fell 4.9% in 1998 and rebounded 11.6% in 1999.",
    ],
    lesson: "A liquidity run can sink a solvent country; outside financing and a credible plan stop the run, and the recovery can be fast.",
    hint: "Reserves are the binding constraint. Let the won move before they run out, and use outside support to rebuild them.",
    shocks: [{ id: "surprise-stop", kind: "sudden-stop", quarter: 4, magnitude: 2 }],
    unlocks: ["rate", "fxRegime", "intervention", "fiscal", "imf", "controls"],
    goals: (a) => [
      { id: "growth98", label: `Growth in 1998 better than what happened (${a("growth", 1998).toFixed(1)}%)`, metric: "growth", op: ">=", threshold: a("growth", 1998) + 0.1, when: "year", year: 1998 },
      { id: "reserves", label: "Reserves never below 1 month of imports", metric: "reserves", op: ">=", threshold: 1, when: "every", from: 1 },
      { id: "unemp98", label: `Unemployment in 1998 below what happened (${a("unemp", 1998).toFixed(1)}%)`, metric: "unemp", op: "<=", threshold: a("unemp", 1998) - 0.1, when: "year", year: 1998, bonus: true },
      { id: "infl98", label: `Inflation in 1998 below what happened (${a("infl", 1998).toFixed(1)}%)`, metric: "infl", op: "<=", threshold: a("infl", 1998) - 0.1, when: "year", year: 1998, bonus: true },
    ],
    politics: { start: { votes: 4, trust: 2 }, elections: [], threshold: 0, institutions: ["swap-line", "macroprudential", "safety-net", "cb-independence"], trustCrisis: false },
  },
  {
    id: "argentina-2001",
    iso: "ARG",
    title: "The end of convertibility",
    span: "Argentina, 2001–2004",
    startYear: 2001,
    quarters: 16,
    archetype: "frontier",
    regime: "peg",
    target: 5,
    potential: 3,
    overrides: { reserves: 6, spread: 800, cred: 35, iEff: 7, fxDebtShare: 0.8, rate: 9 },
    history: {
      decisions: [q(0, { rateMode: "manual", manualRate: 9 }), q(1, { imfProgram: 4, fiscalAdjustment: 0.5 }), q(3, { fiscalAdjustment: 1.5 }), q(4, { imfProgram: 0 }), q(6, { fxRegime: "float", manualRate: 30, fiscalAdjustment: 0.5 }), q(9, { manualRate: 10 })],
      oneOffs: [{ quarter: 5, kind: "devalue", value: 65 }],
    },
    shocks: [{ id: "surprise-run", kind: "sudden-stop", quarter: 4, magnitude: 1.5 }],
    context: [
      "Since 1991 a currency board has fixed the peso at one dollar. It ended hyperinflation, but after three years of recession the peso looks overvalued, unemployment is near 15%, and most public debt is in dollars.",
      "The IMF is lending. Markets doubt the peg will hold.",
    ],
    whatHappened: [
      "Argentina passed a 'zero deficit' law in mid-2001 and the IMF augmented its support, but deposits kept leaving. A deposit freeze in December 2001 set off protests; the government fell and the country defaulted.",
      "Convertibility ended in January 2002. The peso fell to almost four per dollar, dollar debts nearly tripled in pesos, output fell 10.9% in 2002, and unemployment passed 20%. Recovery was strong from 2003.",
    ],
    lesson: "A peg with dollar debts creates a trap: the longer the exit waits, the larger the devaluation and the debt shock when it comes.",
    hint: "The peg's cost grows every quarter. Consider an orderly exit while reserves and IMF support are still there, and restructure before the debt balloons.",
    unlocks: ["rate", "fiscal", "mix", "fxRegime", "imf", "devalue", "restructure"],
    goals: (a) => [
      { id: "growth02", label: `Growth in 2002 better than what happened (${a("growth", 2002).toFixed(1)}%)`, metric: "growth", op: ">=", threshold: a("growth", 2002) + 0.1, when: "year", year: 2002 },
      { id: "infl02", label: `Inflation in 2002 below what happened (${a("infl", 2002).toFixed(1)}%)`, metric: "infl", op: "<=", threshold: a("infl", 2002) - 0.1, when: "year", year: 2002 },
      { id: "debt02", label: `Debt in 2002 below what happened (${a("debt", 2002).toFixed(1)}% of GDP)`, metric: "debt", op: "<=", threshold: a("debt", 2002) - 0.1, when: "year", year: 2002, bonus: true },
      { id: "unemp02", label: `Unemployment in 2002 below what happened (${a("unemp", 2002).toFixed(1)}%)`, metric: "unemp", op: "<=", threshold: a("unemp", 2002) - 0.1, when: "year", year: 2002, bonus: true },
    ],
    politics: { start: { votes: 4, trust: 4 }, elections: [], threshold: 0, institutions: ["fiscal-rule", "tax-admin", "safety-net", "debt-office"], trustCrisis: false },
  },
  {
    id: "iceland-2008",
    iso: "ISL",
    title: "Three banks, one island",
    span: "Iceland, 2008–2011",
    startYear: 2008,
    quarters: 16,
    archetype: "advanced",
    regime: "float",
    target: 2.5,
    potential: 2.5,
    overrides: { reserves: 4, spread: 100, cred: 55, iEff: 5, fxDebtShare: 0.3, rate: 13.75 },
    history: {
      decisions: [q(4, { rateMode: "manual", manualRate: 18, capitalControls: true, imfProgram: 6, fiscalAdjustment: 0.5 }), q(6, { manualRate: 12, fiscalAdjustment: 2 }), q(8, { manualRate: 9 }), q(10, { manualRate: 6 }), q(12, { manualRate: 4.5, fiscalAdjustment: 1 })],
    },
    shocks: [
      { id: "surprise-banks", kind: "banking-crisis", quarter: 4, magnitude: 1 },
      { id: "surprise-stop", kind: "sudden-stop", quarter: 4, magnitude: 1.5 },
    ],
    context: [
      "Iceland's three big banks have grown to around ten times the size of the economy, funded largely abroad. The krona floats; the policy rate is 13.75%.",
      "Global funding markets are freezing.",
    ],
    whatHappened: [
      "All three banks failed in October 2008. The krona collapsed, capital controls were imposed in November, and the IMF approved a $2.1 billion programme alongside Nordic loans.",
      "The policy rate went to 18% before falling through 2009–2011. Output fell 8.3% in 2009, unemployment rose from about 3% to 8%, and public debt more than doubled.",
    ],
    lesson: "When banks are many times the size of the economy, letting them fail rather than guaranteeing their foreign debts can keep public debt manageable; capital controls buy time but must be unwound.",
    hint: "The banking shock is coming whatever you do. Your choices are how hard to defend the krona, how fast to consolidate, and when to call for help.",
    unlocks: ["rate", "fxRegime", "intervention", "controls", "fiscal", "mix", "imf"],
    goals: (a) => [
      { id: "growth09", label: `Growth in 2009 better than what happened (${a("growth", 2009).toFixed(1)}%)`, metric: "growth", op: ">=", threshold: a("growth", 2009) + 0.1, when: "year", year: 2009 },
      { id: "debt11", label: `Debt in 2011 below what happened (${a("debt", 2011).toFixed(1)}% of GDP)`, metric: "debt", op: "<=", threshold: a("debt", 2011) - 0.1, when: "year", year: 2011 },
      { id: "infl09", label: `Inflation in 2009 below what happened (${a("infl", 2009).toFixed(1)}%)`, metric: "infl", op: "<=", threshold: a("infl", 2009) - 0.1, when: "year", year: 2009, bonus: true },
      { id: "unemp10", label: `Unemployment in 2010 below what happened (${a("unemp", 2010).toFixed(1)}%)`, metric: "unemp", op: "<=", threshold: a("unemp", 2010) - 0.1, when: "year", year: 2010, bonus: true },
    ],
    politics: { start: { votes: 4, trust: 2 }, elections: [], threshold: 0, institutions: ["macroprudential", "swap-line", "safety-net", "cb-independence", "inflation-targeting"], trustCrisis: false },
  },
  {
    id: "greece-2010",
    iso: "GRC",
    title: "Inside the euro",
    span: "Greece, 2010–2013",
    startYear: 2010,
    quarters: 16,
    archetype: "advanced",
    regime: "peg",
    target: 2,
    potential: 1,
    overrides: { reserves: 30, spread: 300, cred: 50, iEff: 4.5, fxDebtShare: 0, debtThreshold: 60, rate: 3 },
    history: {
      decisions: [q(0, { rateMode: "manual", manualRate: 3 }), q(2, { imfProgram: 8, fiscalAdjustment: 4 }), q(9, { fiscalAdjustment: 2 }), q(13, { fiscalAdjustment: 1 })],
      oneOffs: [{ quarter: 9, kind: "restructure", value: 25 }],
    },
    shocks: [{ id: "surprise-downgrade", kind: "downgrade", quarter: 2, magnitude: 2 }],
    context: [
      "Late in 2009 Greece revealed that its deficit was far larger than reported, over 15% of GDP. Debt is about 130% of GDP and spreads are rising.",
      "As a euro-area member, Greece cannot set its own interest rate or devalue. Its tools are the budget, structural reform, outside financing and, in the end, its debt.",
    ],
    whatHappened: [
      "A €110 billion EU–IMF programme in May 2010 came with very large fiscal consolidation. A second programme in 2012 included a restructuring of privately held bonds, the largest sovereign debt restructuring to that date.",
      "Output fell by about a quarter between 2008 and 2013, unemployment reached 27.5%, and debt still ended 2013 above 175% of GDP.",
    ],
    lesson: "Without a currency to devalue, adjustment falls on wages, jobs and the budget; the pace of austerity and the timing of debt relief decide how deep the fall goes.",
    hint: "Austerity this deep shrinks the economy and the tax base with it. Try a slower pace, earlier debt relief, and reforms that raise revenue without raising rates.",
    unlocks: ["fiscal", "mix", "imf", "reforms", "restructure"],
    goals: (a) => [
      { id: "debt13", label: `Debt in 2013 below what happened (${a("debt", 2013).toFixed(1)}% of GDP)`, metric: "debt", op: "<=", threshold: a("debt", 2013) - 0.1, when: "year", year: 2013 },
      { id: "unemp12", label: `Unemployment in 2012 below what happened (${a("unemp", 2012).toFixed(1)}%)`, metric: "unemp", op: "<=", threshold: a("unemp", 2012) - 0.1, when: "year", year: 2012 },
      { id: "growth11", label: `Growth in 2011 better than what happened (${a("growth", 2011).toFixed(1)}%)`, metric: "growth", op: ">=", threshold: a("growth", 2011) + 0.1, when: "year", year: 2011, bonus: true },
      { id: "balance11", label: `Deficit in 2011 smaller than what happened (${(-a("balance", 2011)).toFixed(1)}% of GDP)`, metric: "ob", op: ">=", threshold: a("balance", 2011) + 0.1, when: "year", year: 2011, bonus: true },
    ],
    politics: { start: { votes: 4, trust: 1 }, elections: [], threshold: 0, institutions: ["tax-admin", "fiscal-rule", "safety-net", "investment-agency"], trustCrisis: false },
  },
];

export type EpisodeBuild = { mission: Mission; history: ScenarioConfig };

const cache = new Map<string, EpisodeBuild>();

/** Register the episode's preset, calibrate history, and return a playable mission plus the historical scenario. */
export function buildEpisode(data: WeoData, ep: Episode): EpisodeBuild {
  const hit = cache.get(ep.id);
  if (hit) return hit;
  const c = data.countries[ep.iso];
  const y0 = ep.startYear - 1;
  const preset = buildPreset(`episode-${ep.id}`, c, y0, ep.archetype, ep.regime, ep.target, ep.potential, ep.overrides, ep.span);
  registerPreset(preset);

  const years = Array.from({ length: ep.quarters / 4 }, (_, i) => ep.startYear + i);
  const targets: YearTarget[] = years.map((year) => ({ year, growth: v(c, "growth", year), infl: v(c, "infl", year), balance: v(c, "balance", year), debt: v(c, "debt", year) }));
  const shocks: ScheduledShock[] = (ep.shocks ?? []).map((s) => ({ ...s, source: "scheduled" }));
  const oneOffs = (ep.history.oneOffs ?? []).map((o, i) => ({ ...o, id: `history-${i}` }));
  const base: ScenarioConfig = { ...baselineConfig(preset.id), startYear: ep.startYear, shocks, decisions: ep.history.decisions, oneOffs };
  const history = calibrate(base, targets, { hidden: true });

  const actual = (key: keyof WeoCountry["series"], year: number) => v(c, key, year) ?? NaN;
  const startPolicy = ep.history.decisions.filter((d) => d.quarter === 0);
  const mission: Mission = {
    id: `episode-${ep.id}`,
    number: 0,
    title: ep.title,
    presetId: preset.id,
    kicker: ep.span,
    briefing: [...ep.context, "History has already happened once. Your goals are to do better than it did; the goal cards show what actually happened as a grey line."],
    lesson: ep.lesson,
    hint: ep.hint,
    quarters: ep.quarters,
    unlocks: ep.unlocks,
    advisors: ["governor", "minister", "chief"],
    objectives: ep.goals(actual),
    fail: [{ metric: "spread", op: ">", threshold: 2500, message: "Spreads passed 2,500 bp: the country lost all market access." }],
    politics: ep.politics,
    startYear: ep.startYear,
    // The player keeps history's shocks (as hidden residuals) but starts from the pre-crisis policy.
    setup: () => ({ ...history, decisions: startPolicy, oneOffs: [] }),
    comparison: { label: "What happened", config: history, story: ep.whatHappened },
  };
  const build = { mission, history };
  cache.set(ep.id, build);
  return build;
}
