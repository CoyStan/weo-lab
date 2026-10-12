import { baselineConfig } from "./economy.ts";
import type { ScenarioConfig } from "./types.ts";

export type Storyline = {
  id: string;
  title: string;
  /** The question the exercise asks the economist. */
  brief: string;
  build: () => ScenarioConfig;
};

let n = 0;
const sid = (p: string) => `${p}-story-${n++}`;

/** Ready-made exercises. Each loads a full scenario the economist can then change. */
export const STORYLINES: Storyline[] = [
  {
    id: "oil-2027",
    title: "Oil shock in an inflation targeter",
    brief: "Aurelia, an oil importer, is hit by a 45% oil spike in 2027. Does the rule look through it, or should the central bank tighten?",
    build: () => ({
      ...baselineConfig("aurelia"),
      shocks: [{ id: sid("s"), kind: "oil-spike", quarter: 5, magnitude: 1.2, source: "scheduled" }],
      constraints: [
        { id: sid("c"), variable: "infl", op: "<=", threshold: 6, fromQuarter: 5 },
        { id: sid("c"), variable: "growth", op: ">=", threshold: 2, fromQuarter: 5 },
      ],
    }),
  },
  {
    id: "defend-peg",
    title: "Defend the peg, or let it go?",
    brief: "Dumara's reserves cover two months of imports and the baseline peg breaks in 2028. Find a mix of programme financing, adjustment and exchange-rate policy that keeps reserves above three months.",
    build: () => ({
      ...baselineConfig("dumara"),
      constraints: [
        { id: sid("c"), variable: "reserves", op: ">=", threshold: 3, fromQuarter: 5 },
        { id: sid("c"), variable: "spread", op: "<=", threshold: 700, fromQuarter: 1 },
      ],
    }),
  },
  {
    id: "commodity-bust",
    title: "Commodity bust for an exporter",
    brief: "Boreas loses a third of its commodity prices in 2026. Use the reserve buffer and fiscal space to smooth it without breaching the deficit rule.",
    build: () => ({
      ...baselineConfig("boreas"),
      shocks: [{ id: sid("s"), kind: "commodity-bust", quarter: 3, magnitude: 1, source: "scheduled" }],
      constraints: [
        { id: sid("c"), variable: "ob", op: ">=", threshold: -4, fromQuarter: 1 },
        { id: sid("c"), variable: "reserves", op: ">=", threshold: 4, fromQuarter: 1 },
      ],
    }),
  },
  {
    id: "debt-castellan",
    title: "Bring high debt down",
    brief: "Castellan's debt is above 100% of GDP and drifting up. Put it on a declining path by 2031 without pushing unemployment above 7%.",
    build: () => ({
      ...baselineConfig("castellan"),
      constraints: [
        { id: sid("c"), variable: "debt", op: "<=", threshold: 105, fromQuarter: 21 },
        { id: sid("c"), variable: "unemp", op: "<=", threshold: 7, fromQuarter: 1 },
      ],
    }),
  },
  {
    id: "sudden-stop-rer",
    title: "Sudden stop with a moving exchange rate",
    brief: "Aurelia faces a sudden stop in 2026Q4 and the real exchange rate is allowed to move. How much of the hit does the float absorb, and what does it do to foreign-currency debt?",
    build: () => {
      const base = baselineConfig("aurelia");
      return {
        ...base,
        assumptions: { ...base.assumptions, rerConvention: "model" },
        shocks: [{ id: sid("s"), kind: "sudden-stop", quarter: 4, magnitude: 1.3, source: "scheduled" }],
        constraints: [{ id: sid("c"), variable: "debt", op: "<=", threshold: 70, fromQuarter: 1 }],
      };
    },
  },
];
