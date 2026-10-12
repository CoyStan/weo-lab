import type { ExplainKey } from "./explain";
import type { MetricKey } from "./missions";

export type MetricMeta = { label: string; unit: string; digits: number; explain?: ExplainKey; plain: string };

export const GAME_METRICS: Record<MetricKey, MetricMeta> = {
  infl: { label: "Inflation", unit: "%", digits: 1, explain: "infl", plain: "How fast prices are rising, at an annual rate." },
  growth: { label: "Growth", unit: "%", digits: 1, explain: "growth", plain: "Real GDP against the same quarter a year earlier." },
  rate: { label: "Policy rate", unit: "%", digits: 2, plain: "The central bank's interest rate." },
  debt: { label: "Public debt", unit: "% of GDP", digits: 1, explain: "debt", plain: "What the government owes, against the size of the economy." },
  ob: { label: "Budget balance", unit: "% of GDP", digits: 1, plain: "Revenue minus spending, including interest. Negative is a deficit." },
  pb: { label: "Primary balance", unit: "% of GDP", digits: 1, plain: "The budget balance before interest payments." },
  ca: { label: "Current account", unit: "% of GDP", digits: 1, plain: "What the country earns abroad minus what it pays abroad." },
  reserves: { label: "Reserves", unit: "months of imports", digits: 1, plain: "Foreign currency the central bank holds, measured in months of imports it could pay for." },
  unemp: { label: "Unemployment", unit: "%", digits: 1, plain: "Share of the labour force looking for work." },
  spread: { label: "Bond spread", unit: "bp", digits: 0, plain: "Extra interest investors demand to lend to the government, in basis points." },
  cred: { label: "Credibility", unit: "/ 100", digits: 0, plain: "How far people believe the central bank will hit its target. High credibility makes inflation easier to control." },
  gfn: { label: "Financing needs", unit: "% of GDP", digits: 1, plain: "Borrowing needed this year to cover the deficit and maturing debt." },
};

export const fmtNum = (v: number, digits: number, signed = false) => {
  const s = Math.abs(v) < 0.5 * Math.pow(10, -digits) ? (0).toFixed(digits) : v.toFixed(digits);
  return signed && v > 0 ? `+${s}` : s;
};

export const unitShort = (unit: string) => (unit === "%" ? "%" : unit === "bp" ? " bp" : unit === "/ 100" ? "" : ` ${unit}`);
export const deltaUnit = (unit: string) => (unit === "%" || unit === "% of GDP" ? " pp" : unit === "bp" ? " bp" : unit === "months of imports" ? " mo" : "");
