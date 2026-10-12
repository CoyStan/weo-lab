import type { Assumptions, FxRegime, Policy } from "./types.ts";

/**
 * Structural parameters of a stylised economy. Values are illustrative
 * calibrations in the range of the empirical literature, not official IMF
 * estimates for any real country.
 */
export type PresetParams = {
  /** Neutral real policy rate, %. */
  neutralRealRate: number;
  /** Output-gap persistence per quarter. */
  rhoGap: number;
  /** Annual output-gap response to a 1 pp real-rate gap. */
  sigma: number;
  /** Phillips-curve slope: pp of annualised inflation per pp of output gap. */
  kappa: number;
  /** Exchange-rate pass-through: pp of inflation per 1% nominal depreciation. */
  passthrough: number;
  /** pp of inflation per 1% quarterly oil-price change. */
  oilInflation: number;
  /** Net oil imports, % GDP (negative for an exporter). */
  oilImportShare: number;
  /** Non-oil commodity exports, % GDP. */
  commodityExportShare: number;
  /** Fiscal revenue tied to commodity prices, % GDP. */
  commodityRevenueShare: number;
  /** Imports, % GDP (converts reserves between % GDP and months of imports). */
  importsGDP: number;
  /** pp of GDP in the current account per 1% real depreciation, at steady state. */
  exportElasticity: number;
  /** Response of demand and the current account to partner growth deviations. */
  externalDemand: number;
  /** Share of public debt denominated in foreign currency, 0–1. */
  fxDebtShare: number;
  /** Share of debt refinanced at market rates (rest is concessional), 0–1. */
  marketDebtShare: number;
  /** Debt ratio above which spreads climb, % GDP. */
  debtThreshold: number;
  /** Spread at the initial equilibrium, bp. */
  spreadBase: number;
  /** Average debt maturity, years. */
  avgMaturity: number;
  /** pp of GDP in the primary balance per pp of output gap. */
  autoStabilizer: number;
  multiplierSpend: number;
  multiplierTax: number;
  nairu: number;
  /** Okun coefficient: pp of unemployment per pp of output gap. */
  okun: number;
  /** Term premium over the policy rate on new debt, pp. */
  termPremium: number;
  /** FX pressure sensitivity to the interest differential (% per pp per quarter). */
  k1: number;
  /** FX pressure sensitivity to the current account (% per pp of GDP per year). */
  k2: number;
  /** FX pressure per 1% of GDP of net capital outflow in a quarter. */
  k3: number;
  /** Reserve loss, % GDP, per 1% of absorbed FX pressure. */
  k5: number;
  /** Part of the current-account deficit not covered by stable inflows, % GDP per year. */
  financingGap: number;
  /** Effective lower bound on the policy rate, %. */
  elb: number;
};

export type PresetInitial = {
  gap: number;
  infl: number;
  rate: number;
  debt: number;
  structPB: number;
  iEff: number;
  ca: number;
  reserves: number;
  unemp: number;
  spread: number;
  cred: number;
  growth: number;
};

export type Preset = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  archetype: string;
  initial: PresetInitial;
  params: PresetParams;
  defaultPolicy: Policy;
  potentialGrowth: number;
  defaultRegime: FxRegime;
};

/** Illustrative WEO reference assumptions shared by every preset. */
export const WEO_REFERENCE: Omit<Assumptions, "potentialGrowth"> = {
  oilPrice: 72,
  oilDrift: -2,
  globalGrowth: 3.1,
  partnerGrowth: 3.0,
  usRate: 3.5,
  riskPremium: 0,
  commodityPrice: 100,
  commodityDrift: 0,
  rerConvention: "constant",
};

/** Partner-country inflation used for the real exchange rate, %. */
export const WORLD_INFLATION = 2.5;

const basePolicy: Policy = {
  rateMode: "rule",
  manualRate: 8.5,
  inflationTarget: 4,
  ruleStrength: 1.5,
  fxRegime: "float",
  fxIntervention: 0,
  fiscalAdjustment: 0,
  adjustmentMix: 50,
  publicInvestment: 3.5,
  laborReform: 0,
  productivityReform: 0,
  tradeOpenness: 0,
  imfProgram: 0,
  capitalControls: false,
};

export const PRESETS: Preset[] = [
  {
    id: "aurelia",
    name: "Aurelia",
    tagline: "Emerging market, oil importer, inflation targeter",
    archetype: "Emerging market",
    description:
      "A mid-sized emerging economy with a floating currency and an inflation-targeting central bank. Debt sits just above the 60% mark, inflation is a point and a half above target, and a third of public debt is in foreign currency.",
    initial: { gap: 0, infl: 5.5, rate: 8.5, debt: 62, structPB: -1.0, iEff: 7.5, ca: -3.0, reserves: 4.5, unemp: 7.5, spread: 280, cred: 60, growth: 3.8 },
    params: {
      neutralRealRate: 2.0, rhoGap: 0.8, sigma: 0.5, kappa: 0.25, passthrough: 0.15, oilInflation: 0.03,
      oilImportShare: 3, commodityExportShare: 0, commodityRevenueShare: 0, importsGDP: 30,
      exportElasticity: 0.15, externalDemand: 0.6, fxDebtShare: 0.35, marketDebtShare: 0.9,
      debtThreshold: 60, spreadBase: 280, avgMaturity: 6, autoStabilizer: 0.35,
      multiplierSpend: 0.8, multiplierTax: 0.4, nairu: 7.5, okun: 0.35, termPremium: 1.0,
      k1: 0.25, k2: 0.4, k3: 1.0, k5: 0.5, financingGap: 0, elb: 0,
    },
    defaultPolicy: { ...basePolicy, manualRate: 8.5, inflationTarget: 4, fxRegime: "float", publicInvestment: 3.5 },
    potentialGrowth: 3.5,
    defaultRegime: "float",
  },
  {
    id: "boreas",
    name: "Boreas",
    tagline: "Commodity exporter with a managed float",
    archetype: "Commodity exporter",
    description:
      "A resource-rich economy whose budget and exports lean on commodity prices. Reserves are comfortable and debt is moderate, but a commodity bust hits the budget, the current account and the currency at once.",
    initial: { gap: 0.5, infl: 3.2, rate: 5.0, debt: 45, structPB: 0.5, iEff: 5.5, ca: 1.5, reserves: 7, unemp: 6, spread: 180, cred: 65, growth: 2.6 },
    params: {
      neutralRealRate: 1.5, rhoGap: 0.8, sigma: 0.5, kappa: 0.2, passthrough: 0.12, oilInflation: 0.02,
      oilImportShare: -4, commodityExportShare: 15, commodityRevenueShare: 6, importsGDP: 28,
      exportElasticity: 0.1, externalDemand: 0.7, fxDebtShare: 0.25, marketDebtShare: 0.85,
      debtThreshold: 55, spreadBase: 180, avgMaturity: 7, autoStabilizer: 0.4,
      multiplierSpend: 0.7, multiplierTax: 0.35, nairu: 6, okun: 0.4, termPremium: 0.8,
      k1: 0.25, k2: 0.4, k3: 1.0, k5: 0.5, financingGap: 0, elb: 0,
    },
    defaultPolicy: { ...basePolicy, manualRate: 5.0, inflationTarget: 3, fxRegime: "managed", fxIntervention: 50, publicInvestment: 4.0 },
    potentialGrowth: 2.5,
    defaultRegime: "managed",
  },
  {
    id: "castellan",
    name: "Castellan",
    tagline: "Advanced economy with high debt and low rates",
    archetype: "Advanced economy",
    description:
      "A mature economy with deep markets, a credible central bank and public debt above 100% of GDP. Spreads are low and the currency floats freely, so the question is fiscal space, not market access.",
    initial: { gap: -0.3, infl: 2.4, rate: 2.75, debt: 108, structPB: -1.5, iEff: 2.6, ca: 2.0, reserves: 12, unemp: 5.5, spread: 40, cred: 85, growth: 1.2 },
    params: {
      neutralRealRate: 0.5, rhoGap: 0.85, sigma: 0.6, kappa: 0.12, passthrough: 0.04, oilInflation: 0.015,
      oilImportShare: 1.5, commodityExportShare: 0, commodityRevenueShare: 0, importsGDP: 40,
      exportElasticity: 0.08, externalDemand: 0.6, fxDebtShare: 0, marketDebtShare: 1,
      debtThreshold: 100, spreadBase: 40, avgMaturity: 8, autoStabilizer: 0.5,
      multiplierSpend: 1.0, multiplierTax: 0.5, nairu: 5.3, okun: 0.5, termPremium: 0.5,
      k1: 0.2, k2: 0.2, k3: 0.5, k5: 0.3, financingGap: 0, elb: 0,
    },
    defaultPolicy: { ...basePolicy, manualRate: 2.75, inflationTarget: 2, fxRegime: "float", publicInvestment: 3.0 },
    potentialGrowth: 1.3,
    defaultRegime: "float",
  },
  {
    id: "dumara",
    name: "Dumara",
    tagline: "Frontier economy defending a peg with thin reserves",
    archetype: "Frontier economy",
    description:
      "A frontier economy pegged to the dollar with two months of import cover, a 6% current-account deficit and most of its debt in foreign currency. Inflation runs at 9% and credibility is low. A programme, a devaluation or a restructuring are all on the table.",
    initial: { gap: -0.5, infl: 9.0, rate: 12, debt: 78, structPB: -2.5, iEff: 9, ca: -6, reserves: 2.1, unemp: 11, spread: 650, cred: 35, growth: 3.5 },
    params: {
      neutralRealRate: 3.0, rhoGap: 0.75, sigma: 0.4, kappa: 0.3, passthrough: 0.25, oilInflation: 0.04,
      oilImportShare: 4, commodityExportShare: 8, commodityRevenueShare: 2, importsGDP: 35,
      exportElasticity: 0.12, externalDemand: 0.5, fxDebtShare: 0.6, marketDebtShare: 0.4,
      debtThreshold: 55, spreadBase: 650, avgMaturity: 5, autoStabilizer: 0.25,
      multiplierSpend: 0.7, multiplierTax: 0.3, nairu: 11, okun: 0.3, termPremium: 1.5,
      k1: 0.3, k2: 0.5, k3: 1.2, k5: 0.6, financingGap: 2.0, elb: 0,
    },
    defaultPolicy: { ...basePolicy, rateMode: "manual", manualRate: 12, inflationTarget: 5, ruleStrength: 1.2, fxRegime: "peg", fxIntervention: 100, publicInvestment: 4.0 },
    potentialGrowth: 4.0,
    defaultRegime: "peg",
  },
];

/** Economies built at runtime (real countries and historical episodes). */
const REGISTRY = new Map<string, Preset>();

export function registerPreset(preset: Preset) {
  REGISTRY.set(preset.id, preset);
}

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? REGISTRY.get(id) ?? PRESETS[0];
}

export function defaultAssumptions(presetId: string): Assumptions {
  return { ...WEO_REFERENCE, potentialGrowth: getPreset(presetId).potentialGrowth };
}
