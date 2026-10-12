import { mulberry32 } from "./random.ts";
import type { ScheduledShock, ShockKind } from "./types.ts";

/** Exogenous impulses aggregated over every shock active in a quarter. */
export type Impulse = {
  oilMult: number;
  commodityMult: number;
  globalGrowthAdd: number;
  partnerGrowthAdd: number;
  riskPremiumAdd: number;
  /** Net capital flow this quarter, % GDP (negative = outflow). */
  capitalFlowAdd: number;
  gapAdd: number;
  inflAdd: number;
  /** One-off level shift to potential output, applied at onset. */
  potentialLevelMult: number;
  /** Extra spending, % GDP annualised. */
  spendingAdd: number;
  /** One-off addition to the debt stock, % GDP. */
  debtOneOff: number;
  credAdd: number;
};

export const NEUTRAL_IMPULSE: Impulse = {
  oilMult: 1,
  commodityMult: 1,
  globalGrowthAdd: 0,
  partnerGrowthAdd: 0,
  riskPremiumAdd: 0,
  capitalFlowAdd: 0,
  gapAdd: 0,
  inflAdd: 0,
  potentialLevelMult: 1,
  spendingAdd: 0,
  debtOneOff: 0,
  credAdd: 0,
};

export type ShockSpec = {
  kind: ShockKind;
  name: string;
  short: string;
  description: string;
  /** Probability of onset per quarter in random mode. */
  probability: number;
  severity: "bad" | "good";
  /** Impulse at k quarters after onset (k = 0 at onset) with magnitude m. */
  at: (k: number, m: number) => Partial<Impulse>;
};

const decay = (k: number, rate: number, horizon: number) => (k < horizon ? Math.pow(rate, k) : 0);

export const SHOCKS: Record<ShockKind, ShockSpec> = {
  "oil-spike": {
    kind: "oil-spike",
    name: "Oil price spike",
    short: "Oil +45%",
    description: "Oil jumps 45% and fades over two years. Importers lose income and see inflation; exporters gain revenue.",
    probability: 0.025,
    severity: "bad",
    at: (k, m) => ({ oilMult: 1 + 0.45 * m * (k === 0 ? 0.6 : k === 1 ? 1 : decay(k - 1, 0.85, 12)) }),
  },
  "global-recession": {
    kind: "global-recession",
    name: "Global recession",
    short: "World growth −2.5 pp",
    description: "World and partner growth fall 2.5 points for a year; risk premia rise and commodity prices soften.",
    probability: 0.015,
    severity: "bad",
    at: (k, m) =>
      k < 4
        ? { globalGrowthAdd: -2.5 * m, partnerGrowthAdd: -2.5 * m, riskPremiumAdd: 100 * m, commodityMult: 1 - 0.15 * m }
        : {},
  },
  "sudden-stop": {
    kind: "sudden-stop",
    name: "Sudden stop",
    short: "Capital outflow 3% GDP",
    description: "Portfolio capital leaves for two quarters and the risk premium jumps 350 bp, fading over two years.",
    probability: 0.015,
    severity: "bad",
    at: (k, m) => ({ capitalFlowAdd: k < 2 ? -3 * m : 0, riskPremiumAdd: 350 * m * decay(k, 0.8, 8) }),
  },
  "commodity-bust": {
    kind: "commodity-bust",
    name: "Commodity bust",
    short: "Commodities −35%",
    description: "Non-oil commodity prices fall 35% for two years, then recover over the following year.",
    probability: 0.02,
    severity: "bad",
    at: (k, m) => ({ commodityMult: 1 - 0.35 * m * (k < 8 ? 1 : Math.max(0, (12 - k) / 4)) }),
  },
  "supply-shock": {
    kind: "supply-shock",
    name: "Supply shock",
    short: "Potential −2%, prices +2.5 pp",
    description: "A permanent 2% loss of potential output with a year of cost-push inflation.",
    probability: 0.015,
    severity: "bad",
    at: (k, m) => ({ potentialLevelMult: k === 0 ? 1 - 0.02 * m : 1, inflAdd: 2.5 * m * decay(k, 0.6, 4) }),
  },
  "natural-disaster": {
    kind: "natural-disaster",
    name: "Natural disaster",
    short: "Output −3%, reconstruction 1.5% GDP",
    description: "Output drops for two quarters; reconstruction spending of 1.5% of GDP runs for a year.",
    probability: 0.025,
    severity: "bad",
    at: (k, m) => ({ gapAdd: k === 0 ? -3 * m : k === 1 ? -1.5 * m : 0, spendingAdd: k < 4 ? 1.5 * m : 0, inflAdd: k < 2 ? 0.5 * m : 0 }),
  },
  "banking-crisis": {
    kind: "banking-crisis",
    name: "Banking crisis",
    short: "Bank recap 8% GDP, credit crunch",
    description: "Bank recapitalisation adds 8% of GDP to debt; a credit crunch drags demand for six quarters.",
    probability: 0.01,
    severity: "bad",
    at: (k, m) => ({ debtOneOff: k === 0 ? 8 * m : 0, gapAdd: -2 * m * decay(k, 0.8, 6), riskPremiumAdd: 200 * m * decay(k, 0.85, 8), credAdd: k === 0 ? -10 * m : 0 }),
  },
  pandemic: {
    kind: "pandemic",
    name: "Pandemic",
    short: "Output −6%, support 4% GDP",
    description: "Activity collapses for two quarters and rebounds; emergency support costs 4% of GDP; world growth stalls.",
    probability: 0.005,
    severity: "bad",
    at: (k, m) => ({ gapAdd: k === 0 ? -6 * m : k === 1 ? -3 * m : k < 4 ? 1 * m : 0, spendingAdd: k < 2 ? 4 * m : 0, globalGrowthAdd: k < 2 ? -3 * m : 0, partnerGrowthAdd: k < 2 ? -3 * m : 0 }),
  },
  "food-price": {
    kind: "food-price",
    name: "Food price surge",
    short: "Inflation +2 pp, subsidies 0.5% GDP",
    description: "A harvest failure lifts inflation two points for a year; subsidies cost half a point of GDP.",
    probability: 0.02,
    severity: "bad",
    at: (k, m) => (k < 4 ? { inflAdd: 2 * m, gapAdd: -0.3 * m, spendingAdd: 0.5 * m } : {}),
  },
  downgrade: {
    kind: "downgrade",
    name: "Rating downgrade",
    short: "Spread +150 bp",
    description: "A rating agency downgrades the sovereign; spreads rise 150 bp for two years and credibility slips.",
    probability: 0.015,
    severity: "bad",
    at: (k, m) => ({ riskPremiumAdd: k < 8 ? 150 * m : 0, credAdd: k === 0 ? -5 * m : 0 }),
  },
  "inflow-surge": {
    kind: "inflow-surge",
    name: "Capital inflow surge",
    short: "Inflows +2% GDP",
    description: "Search for yield brings 2% of GDP in inflows per quarter for a year, pushing up demand and the currency.",
    probability: 0.015,
    severity: "good",
    at: (k, m) => (k < 4 ? { capitalFlowAdd: 2 * m, gapAdd: 0.5 * m, riskPremiumAdd: -50 * m } : {}),
  },
};

export const SHOCK_KINDS = Object.keys(SHOCKS) as ShockKind[];

/** Sum the impulses of every shock active at quarter t. */
export function impulseAt(shocks: ScheduledShock[], t: number): { impulse: Impulse; active: ShockKind[] } {
  const impulse: Impulse = { ...NEUTRAL_IMPULSE };
  const active: ShockKind[] = [];
  for (const shock of shocks) {
    const k = t - shock.quarter;
    if (k < 0) continue;
    const part = SHOCKS[shock.kind].at(k, shock.magnitude);
    let touched = false;
    for (const key of Object.keys(part) as (keyof Impulse)[]) {
      const v = part[key];
      if (v === undefined) continue;
      if (key === "oilMult" || key === "commodityMult" || key === "potentialLevelMult") {
        if (v !== 1) touched = true;
        impulse[key] *= v;
      } else {
        if (v !== 0) touched = true;
        impulse[key] += v;
      }
    }
    if (touched) active.push(shock.kind);
  }
  return { impulse, active };
}

/** Deterministic random shock draw for a seed: at most one onset per quarter, at most four over the horizon. */
export function generateRandomShocks(seed: number, horizon: number): ScheduledShock[] {
  const rand = mulberry32(seed);
  const out: ScheduledShock[] = [];
  for (let t = 2; t <= horizon && out.length < 4; t++) {
    for (const kind of SHOCK_KINDS) {
      if (rand() < SHOCKS[kind].probability) {
        out.push({ id: `rnd-${seed}-${t}`, kind, quarter: t, magnitude: Math.round((0.6 + rand() * 1.0) * 10) / 10, source: "random" });
        break;
      }
    }
  }
  return out;
}
