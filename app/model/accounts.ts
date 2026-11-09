// Stock-flow consistent accounts, in the spirit of IMF financial programming.
//
// The behavioural core in economy.ts (output gap, inflation, rates, exchange
// rate, spreads, debt) drives these accounts; the accounts close the identities
// that tie the four sectors together, every quarter:
//
//   real      cons + inv + gov + exports - imports = 100           (% of GDP)
//   external  ca = (exports - imports) + primaryIncome + transfers
//             ca + fa + official - dReserves = 0                    (balance of payments)
//             nfa_t = nfa_{t-1}/(1 + g/400) + ca/4 + valuation      (external stock)
//   fiscal    publicSI = ob;  privateSI = ca - ob                   (saving - investment)
//   monetary  money = mNfa + creditGov + creditPrivate + otherNet   (monetary survey)
//
// As in real statistics, each identity has one closing item: private
// consumption in the national accounts, "other investment" in the financial
// account (under a float the exchange rate moves until private flows finance the
// current account), and "other items, net" in the monetary survey. Everything
// else is behavioural. The balances are illustrative calibrations by archetype,
// not country data.

import type { Accounts } from "./types.ts";

export type AccountParams = {
  /** Government consumption and investment, % of GDP, at the start. */
  gov0: number;
  /** Private investment, % of GDP, at the start. */
  inv0: number;
  /** Net secondary income (remittances, aid), % of GDP. */
  transfers: number;
  /** Net foreign assets at the start, % of GDP (negative = net liabilities). */
  nfa0: number;
  /** Share of the external position in foreign currency (revalues with the exchange rate). */
  nfaFxShare: number;
  /** Net foreign direct investment inflows, % of GDP. */
  fdi: number;
  /** Broad money, % of GDP, at the start. */
  money0: number;
  /** Bank credit to the private sector, % of GDP, at the start. */
  credit0: number;
  /** Share of public debt held by domestic banks. */
  bankDebtShare: number;
};

/** Illustrative balances by archetype (orders of magnitude from IMF BoP/IFS data for such economies). */
const BY_ARCHETYPE: Record<string, AccountParams> = {
  "Emerging market": { gov0: 20, inv0: 22, transfers: 1, nfa0: -35, nfaFxShare: 0.6, fdi: 2, money0: 55, credit0: 45, bankDebtShare: 0.3 },
  "Commodity exporter": { gov0: 22, inv0: 24, transfers: 0, nfa0: 10, nfaFxShare: 0.4, fdi: 2.5, money0: 50, credit0: 40, bankDebtShare: 0.25 },
  "Advanced economy": { gov0: 22, inv0: 20, transfers: -0.5, nfa0: 15, nfaFxShare: 0.2, fdi: 1, money0: 90, credit0: 100, bankDebtShare: 0.2 },
  "Frontier economy": { gov0: 18, inv0: 20, transfers: 4, nfa0: -60, nfaFxShare: 0.8, fdi: 2.5, money0: 30, credit0: 20, bankDebtShare: 0.35 },
};

export function accountParams(archetype: string): AccountParams {
  return BY_ARCHETYPE[archetype] ?? BY_ARCHETYPE["Emerging market"];
}

/** Return earned (or paid) on the net foreign position, % a year. Liabilities pay part of the sovereign spread. */
export function externalYield(nfa: number, usRate: number, spreadBp: number): number {
  return usRate + (nfa < 0 ? 0.5 * (spreadBp / 100) : 0);
}

/** Money demand: broad money in % of GDP falls as interest rates and inflation rise. */
export function moneyTarget(money0: number, rate: number, rate0: number, infl: number, infl0: number): number {
  return money0 * Math.max(0.3, 1 - 0.015 * (rate - rate0) - 0.01 * (infl - infl0));
}

/** Private credit: grows with activity, falls when real rates are above neutral. */
export function creditTarget(credit0: number, gap: number, realRateGap: number): number {
  return Math.max(2, credit0 * (1 + 0.012 * gap - 0.01 * realRateGap));
}

export const ZERO_ACCOUNTS: Accounts = {
  cons: 0,
  inv: 0,
  gov: 0,
  exports: 0,
  imports: 0,
  nx: 0,
  primaryIncome: 0,
  transfers: 0,
  fa: 0,
  faFdi: 0,
  faPortfolio: 0,
  faOther: 0,
  official: 0,
  dReserves: 0,
  nfa: 0,
  nfaValuation: 0,
  publicSI: 0,
  privateSI: 0,
  saving: 0,
  money: 0,
  mNfa: 0,
  creditGov: 0,
  creditPrivate: 0,
  otherNet: 0,
};
