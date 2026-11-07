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

/** Institutions and reforms adopted for good from a given quarter (the campaign's upgrades). */
export type InstitutionId =
  | "cb-independence"
  | "inflation-targeting"
  | "forward-guidance"
  | "fiscal-rule"
  | "tax-admin"
  | "debt-office"
  | "investment-agency"
  | "safety-net"
  | "swap-line"
  | "macroprudential";

export type Adoption = { id: InstitutionId; quarter: number };

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
  /** Optional: institutions adopted along the way. */
  institutions?: Adoption[];
  /** Optional: calendar year of quarter 1 (defaults to 2026). */
  startYear?: number;
  /** Optional: calibrated residual impulses that make the model reproduce a data path. */
  residuals?: Residual[];
};

/** Per-quarter impulses found by calibration (see game/calibrate.ts). */
export type Residual = { quarter: number; gap?: number; infl?: number; pb?: number; debt?: number; /** Permanent shift in the level of potential output, %. */ pot?: number; hidden?: boolean };

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

/**
 * One quarter of the projection. Flows are % of GDP at an annual rate and
 * stocks % of annual GDP unless a comment says otherwise. The accounting
 * blocks (national accounts, current account, balance of payments,
 * saving–investment, monetary survey) hold exactly every quarter; see
 * app/model/identities.test.ts.
 */
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
  /** Nominal GDP growth this quarter, annualised % (domestic currency). */
  nomGrowth: number;

  // ---- National accounts, expenditure side (nominal, % of GDP). cons + inv + gov + exports − imports = 100.
  /** Private consumption (the residual of the expenditure identity). */
  cons: number;
  /** Private investment. */
  inv: number;
  /** Government consumption and investment. */
  gov: number;
  /** Public investment (part of gov). */
  govInvestment: number;
  exports: number;
  imports: number;
  /** Net exports of goods and services, exports − imports. */
  nx: number;

  // ---- Current account: ca = nx + primaryIncome + transfers.
  /** Net primary income (investment income on the net foreign asset position), % GDP. */
  primaryIncome: number;
  /** Net secondary income (remittances, grants), % GDP. */
  transfers: number;
  /** Net foreign assets, % of annual GDP (negative = net liabilities). */
  nfa: number;
  /** Valuation and other volume changes in nfa this quarter (exchange rate on the FX share, restructuring), % GDP. */
  nfaValuation: number;

  // ---- Balance of payments: ca + fa + official − dReserves = 0 (annual-rate flows, % GDP).
  /** Private financial account, net inflows (positive = inflow). fa = faFdi + faPortfolio + faOther. */
  fa: number;
  faFdi: number;
  faPortfolio: number;
  /** Other investment, including exchange-rate clearing and exceptional financing. */
  faOther: number;
  /** Official financing (IMF disbursements, swap-line drawings), annual rate. */
  official: number;
  /** Change in reserve assets, annual rate (positive = accumulation), excluding valuation. */
  dReserves: number;

  // ---- Saving–investment balances: privateSI + publicSI = ca.
  publicSI: number;
  privateSI: number;
  /** Gross national saving = inv + govInvestment + ca. */
  savingNational: number;

  // ---- Monetary survey: money = mNfa + mNda; mNda = creditGov + creditPrivate + mOther.
  /** Broad money, % GDP. */
  money: number;
  /** Net foreign assets of the banking system (= reservesPct). */
  mNfa: number;
  /** Net domestic assets of the banking system. */
  mNda: number;
  creditPrivate: number;
  creditGov: number;
  /** Other items net (residual of the survey). */
  mOther: number;
  /** Change in money this quarter, pp of GDP, split into ΔNFA and ΔNDA. */
  dMoney: number;
  dMNfa: number;
  dMNda: number;

  activeShocks: ShockKind[];
  drivers: Drivers;
  /** The stock-flow consistent accounts (see accounts.ts). */
  acct: Accounts;
};

/**
 * National, external, fiscal and monetary accounts in one consistent set, as in
 * IMF financial programming. Flows are % of GDP at an annual rate; stocks are
 * % of annual GDP. Identities checked every quarter in identities.test.ts:
 *   cons + inv + gov + exports - imports = 100
 *   ca = (exports - imports) + primaryIncome + transfers
 *   ca + fa + official - dReserves = 0          (balance of payments)
 *   reservesPct_t = reservesPct_{t-1} + dReserves / 4
 *   nfa_t = nfa_{t-1} / (1 + nominal growth / 400) + ca / 4 + nfaValuation
 *   privateSI + publicSI = ca,  publicSI = ob   (saving - investment)
 *   money = mNfa + creditGov + creditPrivate + otherNet   (monetary survey)
 */
export type Accounts = {
  cons: number;
  inv: number;
  gov: number;
  exports: number;
  imports: number;
  nx: number;
  primaryIncome: number;
  transfers: number;
  /** Private financial account, net inflows (+ = inflows). */
  fa: number;
  faFdi: number;
  faPortfolio: number;
  /** Other investment, including the flows that clear the exchange market under a float. */
  faOther: number;
  /** Official financing (IMF and other official disbursements, swap lines). */
  official: number;
  /** Change in reserve assets (+ = accumulation), annual rate. */
  dReserves: number;
  /** Net foreign assets of the country (negative = net liabilities). */
  nfa: number;
  nfaValuation: number;
  publicSI: number;
  privateSI: number;
  /** Gross national saving = private investment + public investment + current account. */
  saving: number;
  money: number;
  mNfa: number;
  creditGov: number;
  creditPrivate: number;
  otherNet: number;
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
