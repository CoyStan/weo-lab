import type { QuarterState } from "../model/types";
import type { FocusKey } from "../store";

export type MetricSpec = {
  key: FocusKey;
  label: string;
  short: string;
  unit: string;
  digits: number;
  signed: boolean;
  /** Whether a higher value is better, worse, or neutral for the delta colour. */
  better: "up" | "down" | "neutral";
  description: string;
};

export const METRICS: Record<FocusKey, MetricSpec> = {
  growth: { key: "growth", label: "Real GDP growth", short: "Growth", unit: "%", digits: 1, signed: true, better: "up", description: "Year-on-year growth of real GDP." },
  infl: { key: "infl", label: "Inflation", short: "Inflation", unit: "%", digits: 1, signed: false, better: "neutral", description: "Headline inflation, annualised." },
  rate: { key: "rate", label: "Policy rate", short: "Policy rate", unit: "%", digits: 2, signed: false, better: "neutral", description: "Central bank policy rate." },
  debt: { key: "debt", label: "Public debt", short: "Debt", unit: "% GDP", digits: 1, signed: false, better: "down", description: "Gross general government debt." },
  ob: { key: "ob", label: "Overall balance", short: "Fiscal bal.", unit: "% GDP", digits: 1, signed: true, better: "up", description: "Primary balance less interest." },
  ca: { key: "ca", label: "Current account", short: "Current acct", unit: "% GDP", digits: 1, signed: true, better: "up", description: "Current-account balance." },
  reserves: { key: "reserves", label: "Reserves", short: "Reserves", unit: "mo. imports", digits: 1, signed: false, better: "up", description: "Gross reserves in months of imports." },
  unemp: { key: "unemp", label: "Unemployment", short: "Jobless", unit: "%", digits: 1, signed: false, better: "down", description: "Unemployment rate." },
  spread: { key: "spread", label: "Sovereign spread", short: "Spread", unit: "bp", digits: 0, signed: false, better: "down", description: "Spread over the safe rate." },
  cred: { key: "cred", label: "Credibility", short: "Credibility", unit: "/100", digits: 0, signed: false, better: "up", description: "Policy credibility index anchoring expectations." },
  rer: { key: "rer", label: "Real exchange rate", short: "REER", unit: "index", digits: 1, signed: false, better: "neutral", description: "Real effective exchange rate, 100 = start; higher = weaker." },
  oil: { key: "oil", label: "Oil price", short: "Oil", unit: "$/bbl", digits: 0, signed: false, better: "neutral", description: "Assumed oil price path, with shocks." },
};

export const TILE_KEYS: FocusKey[] = ["growth", "infl", "rate", "debt", "ob", "ca", "reserves", "unemp", "spread", "cred"];
export const CHART_KEYS: FocusKey[] = ["growth", "infl", "rate", "debt", "ob", "ca", "reserves", "unemp", "spread", "rer", "cred", "oil"];

export function fmt(v: number, digits = 1, signed = false): string {
  if (!Number.isFinite(v)) return "–";
  const s = v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return signed && v > 0 ? `+${s}` : s;
}

export function fmtMetric(key: FocusKey, v: number): string {
  const m = METRICS[key];
  return fmt(v, m.digits, m.signed);
}

export function fmtDelta(key: FocusKey, delta: number): string {
  const m = METRICS[key];
  return `${fmt(delta, m.digits, true)}${m.unit === "%" || m.unit === "% GDP" ? " pp" : m.unit === "bp" ? " bp" : ""}`;
}

export function metricValue(state: QuarterState, key: FocusKey): number {
  return state[key];
}

export function seriesOf(path: QuarterState[], key: FocusKey): number[] {
  return path.map((s) => s[key]);
}

export function deltaTone(key: FocusKey, delta: number): "good" | "bad" | "neutral" {
  const m = METRICS[key];
  if (Math.abs(delta) < 0.05) return "neutral";
  if (m.better === "neutral") return "neutral";
  const improved = m.better === "up" ? delta > 0 : delta < 0;
  return improved ? "good" : "bad";
}
