import type { Breach, Constraint, ConstraintVar, QuarterState } from "./types.ts";

export type VariableSpec = {
  key: ConstraintVar;
  label: string;
  short: string;
  unit: string;
  /** Decimal places for display. */
  digits: number;
  /** Default threshold and direction when a constraint on this variable is added. */
  defaultOp: "<=" | ">=";
  defaultThreshold: number;
  step: number;
  /** Suggested chart range. */
  range: [number, number];
};

export const VARIABLES: Record<ConstraintVar, VariableSpec> = {
  debt: { key: "debt", label: "Public debt", short: "Debt", unit: "% GDP", digits: 1, defaultOp: "<=", defaultThreshold: 60, step: 1, range: [0, 160] },
  ob: { key: "ob", label: "Overall fiscal balance", short: "Balance", unit: "% GDP", digits: 1, defaultOp: ">=", defaultThreshold: -3, step: 0.5, range: [-12, 4] },
  pb: { key: "pb", label: "Primary balance", short: "Primary", unit: "% GDP", digits: 1, defaultOp: ">=", defaultThreshold: 0, step: 0.5, range: [-8, 6] },
  infl: { key: "infl", label: "Inflation", short: "Inflation", unit: "%", digits: 1, defaultOp: "<=", defaultThreshold: 6, step: 0.5, range: [-2, 25] },
  growth: { key: "growth", label: "Real GDP growth", short: "Growth", unit: "%", digits: 1, defaultOp: ">=", defaultThreshold: 2, step: 0.5, range: [-8, 8] },
  unemp: { key: "unemp", label: "Unemployment", short: "Jobless", unit: "%", digits: 1, defaultOp: "<=", defaultThreshold: 10, step: 0.5, range: [0, 20] },
  reserves: { key: "reserves", label: "Reserves", short: "Reserves", unit: "months of imports", digits: 1, defaultOp: ">=", defaultThreshold: 3, step: 0.5, range: [0, 14] },
  ca: { key: "ca", label: "Current account", short: "Current acct", unit: "% GDP", digits: 1, defaultOp: ">=", defaultThreshold: -5, step: 0.5, range: [-12, 8] },
  spread: { key: "spread", label: "Sovereign spread", short: "Spread", unit: "bp", digits: 0, defaultOp: "<=", defaultThreshold: 500, step: 25, range: [0, 1500] },
  gfn: { key: "gfn", label: "Gross financing needs", short: "GFN", unit: "% GDP", digits: 1, defaultOp: "<=", defaultThreshold: 15, step: 1, range: [0, 40] },
};

export const VARIABLE_KEYS = Object.keys(VARIABLES) as ConstraintVar[];

export function evaluateConstraints(path: QuarterState[], constraints: Constraint[]): Breach[] {
  const breaches: Breach[] = [];
  for (const c of constraints) {
    for (const s of path) {
      if (s.t < Math.max(1, c.fromQuarter)) continue;
      const v = s[c.variable];
      const broken = c.op === "<=" ? v > c.threshold : v < c.threshold;
      if (broken) breaches.push({ constraintId: c.id, quarter: s.t, value: v });
    }
  }
  return breaches;
}

export function describeConstraint(c: Constraint): string {
  const spec = VARIABLES[c.variable];
  return `${spec.label} ${c.op === "<=" ? "≤" : "≥"} ${c.threshold}${spec.unit === "%" ? "%" : ` ${spec.unit}`}`;
}

export type ConstraintTemplate = { id: string; name: string; description: string; constraints: Omit<Constraint, "id">[] };

export const CONSTRAINT_TEMPLATES: ConstraintTemplate[] = [
  {
    id: "program",
    name: "Programme-style targets",
    description: "Reserve floor, primary balance floor and a debt ceiling, checked from 2027.",
    constraints: [
      { variable: "reserves", op: ">=", threshold: 3, fromQuarter: 5 },
      { variable: "pb", op: ">=", threshold: 0, fromQuarter: 5 },
      { variable: "debt", op: "<=", threshold: 70, fromQuarter: 5 },
    ],
  },
  {
    id: "maastricht",
    name: "Deficit and debt rules",
    description: "Overall deficit no wider than 3% of GDP and debt no higher than 60%.",
    constraints: [
      { variable: "ob", op: ">=", threshold: -3, fromQuarter: 1 },
      { variable: "debt", op: "<=", threshold: 60, fromQuarter: 1 },
    ],
  },
  {
    id: "inflation-band",
    name: "Inflation band and growth floor",
    description: "Inflation at or below 6% and growth at or above 2% from 2027.",
    constraints: [
      { variable: "infl", op: "<=", threshold: 6, fromQuarter: 5 },
      { variable: "growth", op: ">=", threshold: 2, fromQuarter: 5 },
    ],
  },
  {
    id: "external",
    name: "External sustainability",
    description: "Current account deficit no wider than 5% and spreads under 500 bp.",
    constraints: [
      { variable: "ca", op: ">=", threshold: -5, fromQuarter: 1 },
      { variable: "spread", op: "<=", threshold: 500, fromQuarter: 1 },
      { variable: "gfn", op: "<=", threshold: 15, fromQuarter: 1 },
    ],
  },
];
