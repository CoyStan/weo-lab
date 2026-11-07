// The macro framework: every sector of the economy on one page, the channels
// that connect policy to them, and plain-language reasons when something the
// player expected to move did not. Pure, so it can be tested with node --test.
//
// Three paths go in: what has happened so far (actual), the staff forecast
// under current policy, and the same forecast had the player changed nothing
// since the mission began. The gap between the last two is "your policies".

import { getPreset } from "../model/presets.ts";
import type { Policy, QuarterState, ScenarioConfig } from "../model/types.ts";

export type SectorId = "real" | "prices" | "fiscal" | "external";

export type RowKey = "growth" | "gap" | "potGrowth" | "unemp" | "infl" | "rate" | "realRate" | "cred" | "pb" | "interest" | "ob" | "debt" | "gfn" | "ca" | "rer" | "reserves" | "spread";

export type RowMeta = { key: RowKey; label: string; unit: string; digits: number; plain: string; /** +1 if higher is better, −1 if lower is better, 0 if it depends. */ good?: 1 | -1 };

export type Sector = {
  id: SectorId;
  title: string;
  /** What this sector's accounts say, in one line. */
  blurb: string;
  rows: RowMeta[];
};

export const SECTORS: Sector[] = [
  {
    id: "real",
    title: "Real sector",
    blurb: "Output, capacity and jobs. Demand moves output against potential; the gap drives growth and unemployment.",
    rows: [
      { key: "growth", good: 1, label: "GDP growth", unit: "%", digits: 1, plain: "Real GDP against the same quarter a year earlier." },
      { key: "gap", label: "Output gap", unit: "% of potential", digits: 1, plain: "How far demand runs above (+) or below (−) what the economy can produce without overheating." },
      { key: "potGrowth", good: 1, label: "Potential growth", unit: "%", digits: 1, plain: "How fast capacity grows. Reforms and investment raise it; deep slumps and heavy debt lower it." },
      { key: "unemp", good: -1, label: "Unemployment", unit: "%", digits: 1, plain: "Moves against the output gap (Okun's law)." },
    ],
  },
  {
    id: "prices",
    title: "Prices and money",
    blurb: "Inflation comes from expectations, demand, the currency and supply shocks. The central bank acts through the real interest rate.",
    rows: [
      { key: "infl", good: -1, label: "Inflation", unit: "%", digits: 1, plain: "Headline inflation, annualised." },
      { key: "rate", label: "Policy rate", unit: "%", digits: 2, plain: "The central bank's rate, or the one the peg imposes." },
      { key: "realRate", label: "Real rate", unit: "%", digits: 1, plain: "Policy rate minus inflation. What actually cools or warms demand." },
      { key: "cred", good: 1, label: "Credibility", unit: "/ 100", digits: 0, plain: "How far expectations are anchored on the target. Higher means inflation is easier to bring down." },
    ],
  },
  {
    id: "fiscal",
    title: "Fiscal sector",
    blurb: "The budget, the interest bill and the debt they add up to. Overall balance = primary balance − interest.",
    rows: [
      { key: "pb", good: 1, label: "Primary balance", unit: "% of GDP", digits: 1, plain: "Revenue minus spending before interest. Your tightening raises it; a slump lowers it." },
      { key: "interest", good: -1, label: "Interest bill", unit: "% of GDP", digits: 1, plain: "Interest on the debt. Rises with the policy rate and spreads as debt rolls over." },
      { key: "ob", good: 1, label: "Overall balance", unit: "% of GDP", digits: 1, plain: "Primary balance minus interest. Negative is a deficit." },
      { key: "debt", good: -1, label: "Public debt", unit: "% of GDP", digits: 1, plain: "Grows with interest, shrinks with nominal growth and primary surpluses, jumps with depreciation on foreign-currency debt." },
      { key: "gfn", good: -1, label: "Financing needs", unit: "% of GDP", digits: 1, plain: "Deficit plus maturing debt: what must be borrowed this year." },
    ],
  },
  {
    id: "external",
    title: "External sector and markets",
    blurb: "Trade, the currency, reserves and what investors charge. Pressure on the currency shows up as depreciation, lost reserves, or both.",
    rows: [
      { key: "ca", good: 1, label: "Current account", unit: "% of GDP", digits: 1, plain: "What the country earns abroad minus what it pays. Weaker demand and a weaker currency improve it." },
      { key: "rer", label: "Real exchange rate", unit: "index", digits: 0, plain: "100 = start; higher means a weaker, more competitive currency." },
      { key: "reserves", good: 1, label: "Reserves", unit: "months of imports", digits: 1, plain: "Foreign currency the central bank holds. Spent to defend the currency; rebuilt by IMF money." },
      { key: "spread", good: -1, label: "Bond spread", unit: "bp", digits: 0, plain: "Extra interest investors demand. Rises with debt, low reserves, deficits and lost credibility." },
    ],
  },
];

export const unitTail = (unit: string) => (unit === "%" ? "%" : unit === "bp" ? " bp" : unit === "/ 100" || unit === "index" ? "" : unit === "months of imports" ? " mo" : unit === "% of GDP" ? "% GDP" : unit === "% of potential" ? "%" : ` ${unit}`);
export const deltaTail = (unit: string) => (unit === "bp" ? " bp" : unit === "months of imports" ? " mo" : unit === "/ 100" || unit === "index" ? "" : " pp");

export const rowValue = (s: QuarterState, key: RowKey): number => s[key];

// ---- Transmission channels ---------------------------------------------------

export type ChannelStatus = "active" | "weak" | "blocked" | "idle";

export type Link = { label: string; value: number; unit: string };

export type Channel = {
  id: "rates" | "budget" | "currency" | "confidence" | "world";
  title: string;
  /** Lever → intermediate → sector, as a chain of short labels. */
  chain: string[];
  status: ChannelStatus;
  /** One line on what the channel is doing right now. */
  note: string;
  /** This quarter's contributions through the channel, in each target's own units. */
  links: Link[];
  /** Which sectors the channel reaches. */
  reaches: SectorId[];
};

const fmt = (v: number, d = 1) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : v.toFixed(d));
const signed = (v: number, d = 1) => (v > 0 && fmt(v, d) !== (0).toFixed(d) ? `+${fmt(v, d)}` : fmt(v, d));

export type FrameworkInput = {
  config: ScenarioConfig;
  /** Outturns up to the clock (beyond it, the full-information path the game hides). */
  actual: QuarterState[];
  /** Staff forecast under current policy. */
  forecast: QuarterState[];
  /** Staff forecast had the player changed nothing since the mission began. */
  untouched: QuarterState[];
  clock: number;
  end: number;
  policy: Policy;
  /** Policy at the start of this turn, before this quarter's changes. */
  policyStart: Policy;
  /** The first quarter of the mission, for "since you started". */
  changedSinceStart: boolean;
};

/** The quarter whose mechanics the panel describes: the one just played, or the next one if nothing has been played. */
function focusQuarter(input: FrameworkInput): { now: QuarterState; prev: QuarterState; forecastNext: QuarterState } {
  const { actual, forecast, clock } = input;
  const now = clock > 0 ? actual[clock] : forecast[1];
  const prev = clock > 0 ? actual[clock - 1] : actual[0];
  const forecastNext = forecast[Math.min(clock + 1, forecast.length - 1)];
  return { now, prev, forecastNext };
}

export function channels(input: FrameworkInput): Channel[] {
  const { config, policy, clock } = input;
  const { now, forecastNext } = focusQuarter(input);
  const P = getPreset(config.presetId).params;
  const d = now.drivers;
  const pegged = forecastNext.regime === "peg";
  const pegRate = config.assumptions.usRate + now.spread / 100;
  const rateBinding = policy.rateMode === "manual" && policy.manualRate > forecastNext.rate - 0.05 && policy.manualRate > pegRate;
  const realGap = forecastNext.rate - forecastNext.infl - P.neutralRealRate;

  const rates: Channel = {
    id: "rates",
    title: "Interest rates",
    chain: ["Policy rate", "Real rate", "Demand (next quarter)", "Inflation (2–4 quarters)"],
    status: pegged && !rateBinding ? "blocked" : Math.abs(d.gap.monetary) < 0.05 && Math.abs(realGap) < 0.5 ? "idle" : "active",
    note: pegged
      ? rateBinding
        ? `You hold the rate at ${fmt(policy.manualRate, 2)}%, above the ${fmt(pegRate)}% the peg alone would set: it defends reserves and squeezes demand.`
        : `The peg sets the rate (about ${fmt(forecastNext.rate, 2)}%: the anchor's rate plus your spread). Your own rate isn't doing anything.`
      : `Real rate ${fmt(forecastNext.rate - forecastNext.infl)}% against a neutral ${fmt(P.neutralRealRate)}%: policy is ${realGap > 0.5 ? "tight, cooling demand" : realGap < -0.5 ? "loose, warming demand" : "roughly neutral"}. It reaches demand a quarter later and inflation over the year after.`,
    links: [
      { label: "Demand", value: d.gap.monetary, unit: "pp" },
      { label: "Inflation (via demand)", value: P.kappa * d.gap.monetary, unit: "pp" },
    ],
    reaches: ["prices", "real", "fiscal", "external"],
  };

  const dStruct = policy.fiscalAdjustment;
  const budget: Channel = {
    id: "budget",
    title: "The budget",
    chain: ["Tightening / investment", "Primary balance", "Demand", "Debt"],
    status: Math.abs(dStruct) < 0.01 && Math.abs(d.gap.fiscal) < 0.05 ? "idle" : "active",
    note:
      Math.abs(dStruct) < 0.01
        ? "No change in the structural balance: the budget only moves with the cycle (revenues fall in a slump)."
        : `${dStruct > 0 ? "Tightening" : "Loosening"} ${fmt(Math.abs(dStruct), 2)} pp of GDP a year: ${dStruct > 0 ? "less demand now, less debt later" : "more demand now, more debt later"}. Spending cuts bite growth harder than tax rises.`,
    links: [
      { label: "Demand", value: d.gap.fiscal, unit: "pp" },
      { label: "Debt", value: d.debt.primary, unit: "pp GDP" },
    ],
    reaches: ["fiscal", "real", "prices", "external"],
  };

  const absorbed = forecastNext.pressure - forecastNext.dE;
  const constantRer = config.assumptions.rerConvention === "constant" && forecastNext.regime === "float";
  const currency: Channel = {
    id: "currency",
    title: "The exchange rate",
    chain: ["Rates, flows, current account", "Currency pressure", "Depreciation or reserve loss", "Prices, exports, FX debt"],
    status: pegged ? "blocked" : constantRer ? "weak" : Math.abs(now.dE) < 0.2 && Math.abs(d.gap.currency) < 0.05 ? "idle" : "active",
    note: pegged
      ? `The peg holds the currency still, so reserves take the pressure instead${absorbed > 0.05 ? ` (${fmt(absorbed)}% of pressure absorbed this quarter)` : ""}. No competitiveness gain, no import-price shock.`
      : constantRer
        ? "This scenario follows the WEO convention of a constant real exchange rate: the currency only tracks inflation differences, so it neither cushions shocks nor adds to inflation."
        : `The currency moved ${signed(now.dE)}% this quarter${forecastNext.regime === "managed" ? ", with reserves smoothing part of the pressure" : ""}. A weaker currency lifts exports and the current account, raises import prices and the burden of foreign-currency debt.`,
    links: [
      { label: "Demand (exports)", value: d.gap.currency, unit: "pp" },
      { label: "Inflation (imports)", value: d.infl.currency, unit: "pp" },
      { label: "Debt (FX debt)", value: d.debt.currency, unit: "pp GDP" },
    ],
    reaches: ["external", "prices", "real", "fiscal"],
  };

  const anchor = Math.round(now.cred);
  const confidence: Channel = {
    id: "confidence",
    title: "Confidence",
    chain: ["Credibility, debt, reserves", "Expectations and spreads", "Inflation, demand, interest bill"],
    status: Math.abs(d.infl.expectations) < 0.05 && Math.abs(d.gap.confidence) < 0.05 ? "idle" : "active",
    note: `Credibility ${anchor}/100: expectations sit ${anchor}% on the target and ${100 - anchor}% on past inflation. Spread ${fmt(now.spread, 0)} bp${now.spread > 400 ? ", high enough to weigh on demand and the interest bill" : ""}.`,
    links: [
      { label: "Inflation (expectations)", value: d.infl.expectations, unit: "pp" },
      { label: "Demand (spreads)", value: d.gap.confidence, unit: "pp" },
    ],
    reaches: ["prices", "real", "fiscal", "external"],
  };

  const supply = d.infl.oil + d.infl.shocks;
  const historical = (config.residuals ?? []).some((r) => r.hidden);
  const world: Channel = {
    id: "world",
    title: "Shocks and the world",
    chain: ["Harvests, oil, partners, markets", "Prices and demand", "Every sector"],
    status: Math.abs(supply) + Math.abs(d.gap.external + d.gap.commodities + d.gap.shocks) < 0.05 ? "idle" : "active",
    note: now.activeShocks.length
      ? `Active now: ${now.activeShocks.map((k) => k.replace(/-/g, " ")).join(", ")}. Shocks are outside your control; policy decides how they spread.`
      : historical
        ? "No named shock, but history's own surprises (what really hit the economy that quarter, rebuilt from the data) are pushing on prices and demand."
        : "No shock is active this quarter.",
    links: [
      { label: "Inflation (costs)", value: supply, unit: "pp" },
      { label: "Demand", value: d.gap.external + d.gap.commodities + d.gap.shocks, unit: "pp" },
    ],
    reaches: ["prices", "real", "external", "fiscal"],
  };

  void clock;
  return [rates, budget, currency, confidence, world];
}

// ---- Why isn't it moving? ----------------------------------------------------

export type Diagnosis = { id: string; tone: "info" | "warn"; title: string; text: string };

export function diagnose(input: FrameworkInput): Diagnosis[] {
  const { config, policy, policyStart, forecast, untouched, end, clock, changedSinceStart } = input;
  const { now, forecastNext } = focusQuarter(input);
  const out: Diagnosis[] = [];
  const d = now.drivers;
  const changedNow = JSON.stringify(policy) !== JSON.stringify(policyStart);

  if (changedNow) {
    const g = forecast[Math.min(clock + 1, end)];
    const u = untouched[Math.min(clock + 1, end)];
    out.push({
      id: "lags",
      tone: "info",
      title: "This quarter will barely show your change",
      text: `Policy works with lags. A rate move reaches demand from the following quarter and inflation over the year after; a budget change reaches demand straight away but debt only slowly. Next quarter's inflation moves ${signed(g.infl - u.infl, 2)} pp because of everything you've done; by ${forecast[end].label} the gap is ${signed(forecast[end].infl - untouched[end].infl, 2)} pp. Judge a decision by the end of the forecast.`,
    });
  }

  const supply = d.infl.oil + d.infl.shocks;
  if (Math.abs(supply) > 0.3 && Math.abs(supply) > Math.abs(d.infl.demand)) {
    out.push({
      id: "supply",
      tone: "warn",
      title: "Inflation is mostly a supply shock right now",
      text: `This quarter, ${(config.residuals ?? []).some((r) => r.hidden) ? "cost shocks (here, the price surprises that really hit, rebuilt from the data)" : "food, oil and other cost shocks"} moved inflation ${signed(supply, 2)} pp, against ${signed(d.infl.demand, 2)} pp from demand. Interest rates can't make a harvest bigger: they work by cooling demand and keeping expectations from following prices up, which takes quarters. The shock fades on its own; your job is to stop it spreading.`,
    });
  }

  if (forecastNext.regime === "peg") {
    const pegRate = config.assumptions.usRate + now.spread / 100;
    const binding = policy.rateMode === "manual" && policy.manualRate > pegRate;
    out.push({
      id: "peg",
      tone: "warn",
      title: "The peg ties your hands",
      text: `With the currency pegged, the interest rate follows the anchor plus your spread${binding ? "; you are holding it higher by hand to defend the parity" : ", whatever you set"}, and the exchange rate cannot cushion shocks. Pressure on the currency is paid for in reserves (${fmt(now.reserves)} months of imports, ${signed(now.reserves - input.actual[Math.max(0, clock - 1)].reserves)} on the quarter). Your real levers are the budget, outside money, the regime itself, and how high you hold rates.`,
    });
  }

  if (config.assumptions.rerConvention === "constant" && forecastNext.regime === "float") {
    out.push({
      id: "rer",
      tone: "info",
      title: "The real exchange rate is held flat",
      text: "Like the WEO's own projections, this scenario holds the real exchange rate constant: the currency only tracks the inflation gap with the rest of the world. So rates don't work through the currency here, and the currency doesn't add to inflation. Interest rates act through demand and expectations alone.",
    });
  }

  if (now.gap < -8) {
    out.push({
      id: "slump",
      tone: "warn",
      title: "A deep slump",
      text: `Output is ${fmt(-now.gap)}% below potential. Policy still works, but the deeper the hole the less each extra push buys, and long slumps scar capacity (potential growth is ${fmt(now.potGrowth)}%). Unemployment is ${fmt(now.unemp)}%.`,
    });
  }

  if (now.cred < 45) {
    out.push({
      id: "cred",
      tone: "warn",
      title: "Low credibility makes inflation sticky",
      text: `Credibility is ${Math.round(now.cred)}/100, so expectations lean on past inflation instead of the target. Inflation comes down slowly, whatever demand does. Hitting the target for a while, institutions and falling debt rebuild it.`,
    });
  }

  if (policy.imfProgram > 0 && policy.fiscalAdjustment < 0.5) {
    out.push({ id: "imf", tone: "warn", title: "The IMF programme is paused", text: "It only disburses while you tighten the budget by at least 0.5 pp of GDP a year, so reserves get nothing from it right now." });
  }

  if (changedSinceStart) {
    const keys: { k: keyof QuarterState; label: string; d: number }[] = [
      { k: "growth", label: "growth", d: 1 },
      { k: "infl", label: "inflation", d: 1 },
      { k: "debt", label: "debt", d: 1 },
      { k: "reserves", label: "reserves", d: 1 },
    ];
    const tiny = keys.every(({ k }) => Math.abs((forecast[end][k] as number) - (untouched[end][k] as number)) < 0.15);
    if (tiny) out.push({ id: "small", tone: "info", title: "Your moves so far are small", text: `Everything you've changed shifts the ${forecast[end].label} outlook by less than 0.15 pp on growth, inflation, debt and reserves. In this economy it takes bigger, earlier or more persistent moves to bend the path.` });
  } else if (clock > 0) {
    out.push({ id: "none", tone: "info", title: "You haven't changed policy yet", text: "Everything here is the economy running on the policy you inherited. Move a lever and the dotted 'no change' lines will split from the dashed forecast." });
  }

  return out;
}

/** Does policy now differ from what the mission started with? */
export function policyTouched(config: ScenarioConfig, start: ScenarioConfig): boolean {
  return JSON.stringify(config.decisions) !== JSON.stringify(start.decisions) || config.oneOffs.length !== start.oneOffs.length || (config.institutions ?? []).length !== (start.institutions ?? []).length;
}

/** The scenario as it would be had the player made no decision since the mission began. */
export function untouchedConfig(config: ScenarioConfig, start: ScenarioConfig): ScenarioConfig {
  return { ...config, decisions: start.decisions, oneOffs: start.oneOffs, institutions: start.institutions };
}

// ---- Consistency tables ------------------------------------------------------

/** One line of a sector's consistency table: % of GDP, now and at the end of the mission. */
export type AccountLine = {
  label: string;
  now: number;
  end: number;
  /** How the line enters the identity: added, subtracted, a memo item (not summed), or the total. */
  role: "plus" | "minus" | "memo" | "total";
  /** A component of the line above (shown indented). */
  sub?: boolean;
};

export type AccountTable = {
  id: "real" | "external" | "fiscal" | "monetary";
  /** The sector card the table sits in. */
  sector: SectorId;
  title: string;
  /** The identity, in symbols. */
  identity: string;
  lines: AccountLine[];
  /** Largest absolute residual of the identity, now or at the end (pp of GDP). */
  residual: number;
  ok: boolean;
};

/** Any residual below this, in pp of GDP, is rounding: the account "adds up". */
export const ADDS_UP_TOL = 0.05;

function table(id: AccountTable["id"], sector: SectorId, title: string, identity: string, lines: AccountLine[], residuals: number[]): AccountTable {
  const residual = Math.max(...residuals.map(Math.abs));
  return { id, sector, title, identity, lines, residual, ok: Number.isFinite(residual) && residual < ADDS_UP_TOL };
}

/**
 * The four sectors' accounts as consistency tables, each identity checked live
 * on the quarter shown (`now`) and at the end of the mission (`end`).
 */
export function accountTables(now: QuarterState, end: QuarterState): AccountTable[] {
  const a = now.acct;
  const b = end.acct;
  const L = (label: string, f: (s: QuarterState) => number, role: AccountLine["role"], sub = false): AccountLine => ({ label, now: f(now), end: f(end), role, ...(sub ? { sub } : {}) });

  const real = table(
    "real",
    "real",
    "National accounts",
    "GDP = C + I + G + X − M",
    [
      L("Consumption (C)", (s) => s.acct.cons, "plus"),
      L("Private investment (I)", (s) => s.acct.inv, "plus"),
      L("Government (G)", (s) => s.acct.gov, "plus"),
      L("Exports (X)", (s) => s.acct.exports, "plus"),
      L("Imports (M)", (s) => s.acct.imports, "minus"),
      L("GDP", () => 100, "total"),
    ],
    [a.cons + a.inv + a.gov + a.exports - a.imports - 100, b.cons + b.inv + b.gov + b.exports - b.imports - 100],
  );

  const external = table(
    "external",
    "external",
    "Balance of payments",
    "CA + FA + official − Δ reserves = 0",
    [
      L("Current account (CA)", (s) => s.ca, "plus"),
      L("Trade balance", (s) => s.acct.nx, "memo", true),
      L("Income on foreign assets", (s) => s.acct.primaryIncome, "memo", true),
      L("Transfers", (s) => s.acct.transfers, "memo", true),
      L("Financial account (FA)", (s) => s.acct.fa, "plus"),
      L("Direct investment", (s) => s.acct.faFdi, "memo", true),
      L("Portfolio", (s) => s.acct.faPortfolio, "memo", true),
      L("Other investment", (s) => s.acct.faOther, "memo", true),
      L("Official financing", (s) => s.acct.official, "plus"),
      L("Change in reserves", (s) => s.acct.dReserves, "minus"),
      L("Balance", (s) => s.ca + s.acct.fa + s.acct.official - s.acct.dReserves, "total"),
      L("Net foreign assets (stock)", (s) => s.acct.nfa, "memo"),
    ],
    [
      a.nx + a.primaryIncome + a.transfers - now.ca,
      b.nx + b.primaryIncome + b.transfers - end.ca,
      a.faFdi + a.faPortfolio + a.faOther - a.fa,
      b.faFdi + b.faPortfolio + b.faOther - b.fa,
      now.ca + a.fa + a.official - a.dReserves,
      end.ca + b.fa + b.official - b.dReserves,
    ],
  );

  const fiscal = table(
    "fiscal",
    "fiscal",
    "The budget",
    "Overall balance = primary balance − interest",
    [
      L("Primary balance", (s) => s.pb, "plus"),
      L("Interest bill", (s) => s.interest, "minus"),
      L("Overall balance", (s) => s.ob, "total"),
      L("Public debt (stock)", (s) => s.debt, "memo"),
    ],
    [now.pb - now.interest - now.ob, end.pb - end.interest - end.ob],
  );

  const monetary = table(
    "monetary",
    "prices",
    "Monetary survey",
    "Broad money = NFA + NDA",
    [
      L("Net foreign assets (NFA)", (s) => s.acct.mNfa, "plus"),
      L("Credit to government", (s) => s.acct.creditGov, "plus"),
      L("Credit to the private sector", (s) => s.acct.creditPrivate, "plus"),
      L("Other items, net", (s) => s.acct.otherNet, "plus"),
      L("Broad money", (s) => s.acct.money, "total"),
    ],
    [a.mNfa + a.creditGov + a.creditPrivate + a.otherNet - a.money, b.mNfa + b.creditGov + b.creditPrivate + b.otherNet - b.money],
  );

  return [real, external, fiscal, monetary];
}

/** Saving minus investment: what the private sector and the government don't spend is lent abroad (the current account). */
export function savingInvestment(s: QuarterState): { privateSI: number; publicSI: number; ca: number; residual: number; ok: boolean } {
  const residual = s.acct.privateSI + s.acct.publicSI - s.ca;
  return { privateSI: s.acct.privateSI, publicSI: s.acct.publicSI, ca: s.ca, residual, ok: Math.abs(residual) < ADDS_UP_TOL };
}
