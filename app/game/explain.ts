// Plain-language "why" for the three variables the model decomposes, plus a
// newspaper headline for each quarter.

import { getPreset } from "../model/presets.ts";
import { SHOCKS } from "../model/shocks.ts";
import type { Drivers, QuarterState, SimEvent } from "../model/types.ts";

export type ExplainKey = "infl" | "growth" | "debt";
export type Part = { key: string; label: string; value: number };

const LABELS: { [K in keyof Drivers]: Record<keyof Drivers[K], string> } = {
  infl: {
    expectations: "Expectations pulling toward the target",
    demand: "Demand: how hot the economy runs",
    currency: "The exchange rate",
    oil: "Oil prices",
    shocks: "Shocks: harvests, costs",
    other: "Other",
  },
  gap: {
    fading: "Earlier swings fading",
    monetary: "Interest rates",
    fiscal: "The budget",
    external: "Trading partners",
    commodities: "Oil and commodity prices",
    currency: "Exchange-rate competitiveness",
    confidence: "Confidence and spreads",
    shocks: "Shocks",
    other: "Other",
  },
  debt: {
    interestGrowth: "Interest bill against growth",
    primary: "The budget before interest",
    currency: "Currency moves on foreign debt",
    other: "One-offs",
  },
};

/** Contributions to this quarter's change, largest first. Activity uses the output gap. */
export function explain(key: ExplainKey, state: QuarterState): { parts: Part[]; unit: string; subject: string } {
  const group = key === "growth" ? "gap" : key;
  const drivers = state.drivers[group] as Record<string, number>;
  const labels = LABELS[group] as Record<string, string>;
  const parts = Object.entries(drivers)
    .map(([k, value]) => ({ key: k, label: labels[k] ?? k, value }))
    .filter((p) => Math.abs(p.value) >= 0.02)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const subject = key === "infl" ? "Inflation" : key === "debt" ? "Debt" : "Activity (output against potential)";
  return { parts, unit: key === "debt" ? "pp of GDP" : "pp", subject };
}

const PAPERS: Record<string, string> = { aurelia: "The Aurelia Ledger", boreas: "Boreas Courier", castellan: "Castellan Times", dumara: "Dumara Daily" };

/** A short, newspaper-style headline for the quarter that just ended. */
export function headline(presetId: string, prev: QuarterState, now: QuarterState, events: SimEvent[]): { paper: string; text: string } {
  const paper = PAPERS[presetId] ?? `${getPreset(presetId).name} Herald`;
  const crisis = events.find((e) => e.kind === "crisis");
  if (crisis) return { paper, text: crisis.title };
  const shock = events.find((e) => e.kind === "shock");
  if (shock) {
    const kind = now.activeShocks.find((k) => SHOCKS[k].name === shock.title);
    return { paper, text: `${shock.title} hits ${getPreset(presetId).name}${kind ? `: ${SHOCKS[kind].short.charAt(0).toLowerCase()}${SHOCKS[kind].short.slice(1)}` : ""}` };
  }
  const regime = events.find((e) => e.kind === "regime" || e.kind === "program");
  if (regime) return { paper, text: regime.title };

  const dRate = now.rate - prev.rate;
  const candidates: [number, string][] = [
    [Math.abs(dRate) * 1.4, dRate > 0 ? `Central bank raises rate to ${now.rate.toFixed(2)}%` : `Central bank cuts rate to ${now.rate.toFixed(2)}%`],
    [Math.abs(now.infl - prev.infl), now.infl > prev.infl ? `Inflation climbs to ${now.infl.toFixed(1)}%` : `Inflation eases to ${now.infl.toFixed(1)}%`],
    [Math.abs(now.growth - prev.growth) * 0.9, now.growth < 0 ? `Economy shrinks ${Math.abs(now.growth).toFixed(1)}%` : now.growth > prev.growth ? `Growth picks up to ${now.growth.toFixed(1)}%` : `Growth slows to ${now.growth.toFixed(1)}%`],
    [Math.abs(now.reserves - prev.reserves) * 1.5, now.reserves < prev.reserves ? `Reserves slip to ${now.reserves.toFixed(1)} months of imports` : `Reserves rebuilt to ${now.reserves.toFixed(1)} months`],
    [Math.abs(now.debt - prev.debt) * 0.6, now.debt > prev.debt ? `Public debt rises to ${now.debt.toFixed(0)}% of GDP` : `Public debt falls to ${now.debt.toFixed(0)}% of GDP`],
    [Math.abs(now.spread - prev.spread) / 60, now.spread > prev.spread ? `Bond spreads widen to ${now.spread.toFixed(0)} bp` : `Bond spreads narrow to ${now.spread.toFixed(0)} bp`],
  ];
  candidates.sort((a, b) => b[0] - a[0]);
  return { paper, text: candidates[0][0] < 0.05 ? "A quiet quarter for markets" : candidates[0][1] };
}
