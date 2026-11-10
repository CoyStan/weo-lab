// A country's macro framework from public data: the four sectors an IMF desk
// keeps (real, fiscal, external, monetary), each with the accounting identity
// that ties it together and a check of how well the published numbers satisfy
// it. Data: IMF WEO, Fiscal Monitor and reserve-adequacy datasets, and World
// Bank national accounts (see scripts/fetch-framework.mjs). Pure functions.

import type { AccountParams } from "../model/accounts.ts";
import type { WeoData } from "../game/economies.ts";

export type FwSeries = Record<string, number>;
export type FwCountry = Partial<Record<FwKey, FwSeries>>;
export type FwKey =
  | "revenue" | "expenditure" | "primaryBalance" | "overallBalance" | "capb" | "netDebt" | "reservesMonths" | "reservesAra"
  | "exports" | "imports" | "privateConsumption" | "governmentConsumption" | "investment" | "saving" | "broadMoney" | "privateCredit" | "reservesMonthsWb" | "fdi" | "remittances";
export type FrameworkData = { fetched: string; sources: Record<string, { provider: string; code: string; label: string; unit: string; dataset: string }>; countries: Record<string, FwCountry> };

/** The latest year, no later than `max`, for which every listed series has a value. */
function latestCommon(c: FwCountry, keys: FwKey[], max: number): number | null {
  for (let y = max; y >= max - 8; y--) if (keys.every((k) => c[k]?.[String(y)] !== undefined)) return y;
  return null;
}
const at = (c: FwCountry, k: FwKey, y: number) => c[k]![String(y)];

export type Line = { label: string; value: number | null; unit: string; note?: string; total?: boolean };
export type Check = { ok: boolean; text: string; residual: number };
export type SectorTable = { id: "real" | "fiscal" | "external" | "monetary"; title: string; identity: string; year: number | null; source: string; lines: Line[]; check: Check | null; missing?: string };

/** How far an identity may be off before it is flagged, in % of GDP. Published data never add up exactly. */
export const TOLERANCE = 1.5;

export function sectorTables(fw: FrameworkData, weo: WeoData, iso: string): SectorTable[] {
  const c = fw.countries[iso] ?? {};
  const w = weo.countries[iso];
  // The last full year before the data were fetched: the current year and later are projections.
  const now = Number(fw.fetched.slice(0, 4)) - 1;
  const weoAt = (k: "ca" | "debt" | "balance", y: number) => w?.series[k]?.[String(y)];
  const out: SectorTable[] = [];

  // Real sector: GDP by expenditure.
  {
    const y = latestCommon(c, ["privateConsumption", "governmentConsumption", "investment", "exports", "imports"], now);
    if (y === null) out.push({ id: "real", title: "Real sector", identity: "GDP = C + G + I + X − M", year: null, source: "World Bank", lines: [], check: null, missing: "National accounts by expenditure are not published for this country in the World Bank data." });
    else {
      const C = at(c, "privateConsumption", y), G = at(c, "governmentConsumption", y), I = at(c, "investment", y), X = at(c, "exports", y), M = at(c, "imports", y);
      const sum = C + G + I + X - M;
      const S = c.saving?.[String(y)];
      const ca = weoAt("ca", y);
      const lines: Line[] = [
        { label: "Household consumption (C)", value: C, unit: "% of GDP" },
        { label: "Government consumption (G)", value: G, unit: "% of GDP" },
        { label: "Investment (I)", value: I, unit: "% of GDP", note: "gross capital formation, public and private" },
        { label: "Exports (X)", value: X, unit: "% of GDP" },
        { label: "Imports (M)", value: -M, unit: "% of GDP" },
        { label: "Sum", value: sum, unit: "% of GDP", total: true },
      ];
      if (S !== undefined) lines.push({ label: "National saving (S)", value: S, unit: "% of GDP" }, { label: "Saving minus investment (S − I)", value: S - I, unit: "% of GDP", note: ca !== undefined ? `current account (WEO): ${ca.toFixed(1)}` : undefined });
      const res = 100 - sum;
      out.push({ id: "real", title: "Real sector", identity: "GDP = C + G + I + X − M", year: y, source: "World Bank, national accounts", lines, check: { ok: Math.abs(res) <= TOLERANCE, residual: res, text: Math.abs(res) <= TOLERANCE ? `Adds up to ${sum.toFixed(1)}% of GDP.` : `Adds up to ${sum.toFixed(1)}%: ${Math.abs(res).toFixed(1)} points ${res > 0 ? "short" : "over"} (statistical discrepancy).` } });
    }
  }

  // Fiscal sector.
  {
    const y = latestCommon(c, ["revenue", "expenditure", "overallBalance", "primaryBalance"], now);
    if (y === null) out.push({ id: "fiscal", title: "Fiscal sector", identity: "Overall balance = revenue − expenditure", year: null, source: "IMF Fiscal Monitor", lines: [], check: null, missing: "Fiscal Monitor data are not published for this country." });
    else {
      const R = at(c, "revenue", y), E = at(c, "expenditure", y), B = at(c, "overallBalance", y), P = at(c, "primaryBalance", y);
      const debt = weoAt("debt", y);
      const net = c.netDebt?.[String(y)];
      const interest = P - B;
      const res = R - E - B;
      const lines: Line[] = [
        { label: "Revenue", value: R, unit: "% of GDP" },
        { label: "Expenditure", value: -E, unit: "% of GDP" },
        { label: "Overall balance", value: B, unit: "% of GDP", total: true },
        { label: "Primary balance", value: P, unit: "% of GDP", note: "the balance before interest" },
        { label: "Net interest (implied)", value: interest, unit: "% of GDP", note: debt ? `about ${((interest / debt) * 100).toFixed(1)}% a year on the debt stock` : undefined },
        { label: "Gross debt", value: debt ?? null, unit: "% of GDP", note: "WEO" },
        { label: "Net debt", value: net ?? null, unit: "% of GDP" },
      ];
      out.push({ id: "fiscal", title: "Fiscal sector", identity: "Overall balance = revenue − expenditure = primary balance − interest", year: y, source: "IMF Fiscal Monitor (general government)", lines, check: { ok: Math.abs(res) <= 0.3, residual: res, text: Math.abs(res) <= 0.3 ? "Revenue less expenditure equals the balance." : `Revenue less expenditure is off the published balance by ${Math.abs(res).toFixed(1)} points.` } });
    }
  }

  // External sector.
  {
    const y = latestCommon(c, ["exports", "imports"], now);
    const ca = y !== null ? weoAt("ca", y) : undefined;
    if (y === null || ca === undefined) out.push({ id: "external", title: "External sector", identity: "Current account = trade balance + income and transfers", year: null, source: "IMF WEO, World Bank", lines: [], check: null, missing: "Trade data are not published for this country in the World Bank data." });
    else {
      const X = at(c, "exports", y), M = at(c, "imports", y);
      const S = c.saving?.[String(y)], I = c.investment?.[String(y)];
      const months = c.reservesMonths?.[String(y)] ?? c.reservesMonthsWb?.[String(y)];
      const ara = c.reservesAra?.[String(y)];
      const lines: Line[] = [
        { label: "Trade balance (X − M)", value: X - M, unit: "% of GDP" },
        { label: "Income and transfers, net (implied)", value: ca - (X - M), unit: "% of GDP", note: c.remittances?.[String(y)] !== undefined ? `of which remittances received: ${at(c, "remittances", y).toFixed(1)}` : undefined },
        { label: "Current account", value: ca, unit: "% of GDP", total: true, note: "WEO" },
        { label: "Foreign direct investment, net inflows", value: c.fdi?.[String(y)] ?? null, unit: "% of GDP" },
        { label: "Reserves", value: months ?? null, unit: "months of imports" },
        { label: "Reserves against the IMF adequacy metric", value: ara ?? null, unit: "ratio", note: ara !== undefined ? (ara < 1 ? "below the 1 to 1.5 range judged adequate" : ara <= 1.5 ? "inside the 1 to 1.5 range judged adequate" : "above the 1 to 1.5 range judged adequate") : "published for emerging markets only" },
      ];
      // The saving-investment balance measures the same thing from the other side.
      const gap = S !== undefined && I !== undefined ? S - I - ca : null;
      out.push({ id: "external", title: "External sector", identity: "Current account = trade balance + income and transfers = saving − investment", year: y, source: "IMF WEO and reserve adequacy data; World Bank", lines, check: gap === null ? null : { ok: Math.abs(gap) <= TOLERANCE, residual: gap, text: Math.abs(gap) <= TOLERANCE ? `Saving minus investment (${(S! - I!).toFixed(1)}) matches the current account (${ca.toFixed(1)}).` : `Saving minus investment (${(S! - I!).toFixed(1)}) and the current account (${ca.toFixed(1)}) differ by ${Math.abs(gap).toFixed(1)} points: two sources, two vintages.` } });
    }
  }

  // Monetary sector: only the aggregates are public in this form, so no identity is checked.
  {
    const y = latestCommon(c, ["privateCredit"], now);
    if (y === null) out.push({ id: "monetary", title: "Monetary sector", identity: "Broad money = net foreign assets + domestic credit", year: null, source: "World Bank", lines: [], check: null, missing: "Money and credit aggregates are not published for this country in the World Bank data." });
    else out.push({ id: "monetary", title: "Monetary sector", identity: "Broad money = net foreign assets + domestic credit", year: y, source: "World Bank (from IMF International Financial Statistics)", lines: [
      { label: "Broad money", value: c.broadMoney?.[String(y)] ?? null, unit: "% of GDP" },
      { label: "Credit to the private sector", value: at(c, "privateCredit", y), unit: "% of GDP" },
    ], check: null, missing: "The full monetary survey (net foreign assets, credit to government) is not in these public series, so the identity cannot be checked here." });
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Starting balances for the model's sector accounts, from the country's own
 * data where published (otherwise the archetype's typical values stay). These
 * feed the accounts only; the behavioural parameters are untouched.
 */
export function accountsFor(fw: FrameworkData, iso: string, publicInvestment: number): Partial<AccountParams> {
  const c = fw.countries[iso];
  if (!c) return {};
  const now = Number(fw.fetched.slice(0, 4));
  const last = (k: FwKey) => {
    const y = latestCommon(c, [k], now);
    return y === null ? undefined : at(c, k, y);
  };
  const out: Partial<AccountParams> = {};
  const G = last("governmentConsumption"), I = last("investment"), money = last("broadMoney"), credit = last("privateCredit"), fdi = last("fdi"), rem = last("remittances");
  if (G !== undefined) out.gov0 = clamp(G + publicInvestment, 8, 45);
  if (I !== undefined) out.inv0 = clamp(I - publicInvestment, 6, 42);
  if (money !== undefined) out.money0 = clamp(money, 10, 200);
  if (credit !== undefined) out.credit0 = clamp(credit, 5, 200);
  if (fdi !== undefined) out.fdi = clamp(fdi, -2, 8);
  if (rem !== undefined) out.transfers = clamp(rem, 0, 12);
  return out;
}
