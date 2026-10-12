// WEO Scenario Lab — shared model types.
//
// The model runs at quarterly frequency over the WEO projection horizon.
// Quarter 0 is the initial condition (2025Q4); quarters 1..24 are 2026Q1..2031Q4.
// All ratios are in percent of GDP unless a comment says otherwise.

export type FxRegime = "float" | "managed" | "peg";
export type RateMode = "rule" | "manual";
export type RerConvention = "constant" | "model";

/** Policy levers. A decision at quarter q overrides these from q onward. */
export type Policy = {
  rateMode: RateMode;
  /** Policy rate when rateMode is "manual" (%). */
  manualRate: number;
  /** Inflation target (%). */
  inflationTarget: number;
  /** Taylor-rule response to the inflation gap (0.5 timid … 2.5 hawkish). */
  ruleStrength: number;
  fxRegime: FxRegime;
  /** Share of FX pressure absorbed with reserves under a managed float (0–100). */
  fxIntervention: number;
  /** Change in the structural primary balance, pp of GDP per year (+ = consolidation). */
  fiscalAdjustment: number;
  /** 0 = adjustment via spending, 100 = via taxes. Spending measures carry a larger multiplier. */
  adjustmentMix: number;
  /** Public investment, % of GDP. Raises potential growth with a lag; costs the primary balance now. */
  publicInvestment: number;
  /** Structural reforms, 0–3 intensity. Phase in over ~2 years. */
  laborReform: number;
  productivityReform: number;
  tradeOpenness: number;
  /** IMF financing, % of GDP per year. Disburses only while the fiscal adjustment is at least 0.5 pp/yr. */
  imfProgram: number;
  capitalControls: boolean;
};

/** WEO-style external and structural assumptions. */
export type Assumptions = {
  /** Brent-style oil price at the start of the horizon ($/bbl). */
  oilPrice: number;
  /** Oil price drift, % per year. */
  oilDrift: number;
  /** World real GDP growth, % per year. */
  globalGrowth: number;
  /** Trading-partner real GDP growth, % per year. */
  partnerGrowth: number;
  /** US policy rate, % (anchor for the required return on the country's assets). */
  usRate: number;
  /** Extra emerging-market risk premium, basis points. */
  riskPremium: number;
  /** Non-oil commodity export price index (100 = WEO reference). */
  commodityPrice: number;
  /** Commodity price drift, % per year. */
  commodityDrift: number;
  /** Country potential growth, % per year. */
  potentialGrowth: number;
  /** WEO convention: hold the real exchange rate constant, or let the model move it. */
  rerConvention: RerConvention;
};

export type ShockKind =
  | "oil-spike"
  | "global-recession"
  | "sudden-stop"
  | "commodity-bust"
  | "supply-shock"
  | "natural-disaster"
  | "banking-crisis"
  | "pandemic"
  | "food-price"
  | "downgrade"
  | "inflow-surge";

export type ScheduledShock = {
  id: string;
  kind: ShockKind;
  /** Onset quarter, 1..24. */
  quarter: number;
  /** 1 = the catalog's reference size. */
  magnitude: number;
  source: "scheduled" | "random";
};

export type OneOffKind = "restructure" | "devalue";

/** A one-time action rather than a standing lever. */
export type OneOffAction = {
  id: string;
  quarter: number;
  kind: OneOffKind;
  /** restructure: haircut in % of the debt stock. devalue: step depreciation in %. */
  value: number;
};

export type Decision = { quarter: number; changes: Partial<Policy> };

export type ConstraintVar =
  | "debt"
  | "ob"
  | "pb"
  | "infl"
  | "growth"
  | "unemp"
  | "reserves"
  | "ca"
  | "spread"
  | "gfn";

export type Constraint = {
  id: string;
  variable: ConstraintVar;
  op: "<=" | ">=";
  threshold: number;
  /** First quarter the constraint is checked (1..24). */
  fromQuarter: number;
};

export type ScenarioConfig = {
  presetId: string;
  assumptions: Assumptions;
  decisions: Decision[];
  oneOffs: OneOffAction[];
  shocks: ScheduledShock[];
  randomShocks: boolean;
  seed: number;
  constraints: Constraint[];
};

/**
 * What moved a variable this quarter, in the variable's own units. The parts
 * sum to the change from the previous quarter (any rounding or clamping sits in
 * "other"), so the lab can answer "why did this happen?".
 */
export type Drivers = {
  /** Change in annualised inflation, pp. */
  infl: { expectations: number; demand: number; currency: number; oil: number; shocks: number; other: number };
  /** Change in the output gap, pp of potential. */
  gap: { fading: number; monetary: number; fiscal: number; external: number; commodities: number; currency: number; confidence: number; shocks: number; other: number };
  /** Change in public debt, pp of GDP. */
  debt: { interestGrowth: number; primary: number; currency: number; other: number };
};

export type QuarterState = {
  t: number;
  label: string;
  /** Output gap, % of potential. */
  gap: number;
  /** Real GDP growth, year on year %. */
  growth: number;
  /** Headline inflation, annualised %. */
  infl: number;
  /** Policy rate, %. */
  rate: number;
  realRate: number;
  /** Real effective exchange rate index, 100 = start; higher = weaker currency. */
  rer: number;
  /** Nominal depreciation this quarter, %. */
  dE: number;
  /** Gross public debt, % GDP. */
  debt: number;
  /** Primary balance, % GDP. */
  pb: number;
  /** Overall fiscal balance, % GDP. */
  ob: number;
  structPB: number;
  /** Effective nominal interest rate on debt, %. */
  iEff: number;
  interest: number;
  /** Gross financing needs, % GDP. */
  gfn: number;
  /** Current account, % GDP. */
  ca: number;
  /** Reserves in months of imports. */
  reserves: number;
  reservesPct: number;
  unemp: number;
  nairu: number;
  /** Sovereign spread, basis points. */
  spread: number;
  /** Policy credibility index, 0–100. */
  cred: number;
  oil: number;
  commodity: number;
  potGrowth: number;
  potLevel: number;
  gdpLevel: number;
  regime: FxRegime;
  imfDisb: number;
  /** FX pressure this quarter (what a float would have depreciated), %. */
  pressure: number;
  activeShocks: ShockKind[];
  drivers: Drivers;
};

export type EventSeverity = "info" | "warn" | "bad" | "good";
export type EventKind = "shock" | "decision" | "regime" | "program" | "crisis" | "action";

export type SimEvent = {
  quarter: number;
  kind: EventKind;
  title: string;
  detail: string;
  severity: EventSeverity;
};

export type Breach = { constraintId: string; quarter: number; value: number };

export type SimResult = {
  path: QuarterState[];
  events: SimEvent[];
  breaches: Breach[];
  /** Scheduled plus any seeded random shocks actually applied. */
  shocks: ScheduledShock[];
};
