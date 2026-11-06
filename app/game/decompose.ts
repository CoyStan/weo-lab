// Shock decomposition: split the path of any variable into what each shock and
// each policy instrument contributed.
//
// It is a counterfactual decomposition in two stages. Starting from the economy
// with nothing hitting it and the policy the player inherited ("momentum"):
//   1. the environment is switched on, one piece at a time: history's own
//      surprises (calibrated residuals) and each shock;
//   2. then the player's instruments are switched on, one group at a time,
//      with the whole environment already in place.
// Within each stage the result is averaged over the forward and reverse
// orderings, so no piece is favoured for going first. The model is nonlinear,
// so the split is an approximation, but it always adds up exactly: momentum
// plus every contribution equals the change in the variable since the start.
// Pure, so it can be tested with node --test.

import { simulate } from "../model/economy.ts";
import { SHOCKS } from "../model/shocks.ts";
import type { Decision, OneOffAction, Policy, QuarterState, ScenarioConfig, ScheduledShock } from "../model/types.ts";

export type DecompMetric = "infl" | "growth" | "gap" | "unemp" | "rate" | "debt" | "ob" | "ca" | "reserves" | "spread" | "rer";

export const DECOMP_METRICS: { key: DecompMetric; label: string; unit: string; digits: number }[] = [
  { key: "infl", label: "Inflation", unit: "pp", digits: 1 },
  { key: "growth", label: "Growth", unit: "pp", digits: 1 },
  { key: "gap", label: "Output gap", unit: "pp", digits: 1 },
  { key: "unemp", label: "Unemployment", unit: "pp", digits: 1 },
  { key: "rate", label: "Policy rate", unit: "pp", digits: 2 },
  { key: "debt", label: "Public debt", unit: "pp of GDP", digits: 1 },
  { key: "ob", label: "Budget balance", unit: "pp of GDP", digits: 1 },
  { key: "ca", label: "Current account", unit: "pp of GDP", digits: 1 },
  { key: "reserves", label: "Reserves", unit: "months", digits: 1 },
  { key: "spread", label: "Bond spread", unit: "bp", digits: 0 },
  { key: "rer", label: "Real exchange rate", unit: "index pts", digits: 1 },
];

export type ComponentKind = "momentum" | "environment" | "policy";

export type Component = {
  id: string;
  label: string;
  kind: ComponentKind;
  /** Categorical slot (1–8) for the chart, fixed per component; 0 = neutral momentum. */
  slot: number;
  /** Contribution to the change since the start, per quarter (index = quarter), per metric. */
  values: Record<DecompMetric, number[]>;
};

export type Decomposition = {
  /** Value of each metric at the start (quarter 0). */
  start: Record<DecompMetric, number>;
  /** The decomposed path: start + every contribution. */
  path: QuarterState[];
  components: Component[];
};

/** Policy fields grouped into the instruments a player thinks in. */
const GROUPS: { id: string; label: string; slot: number; fields: (keyof Policy)[]; oneOffs: OneOffAction["kind"][]; institutions?: boolean }[] = [
  { id: "rates", label: "Interest rates", slot: 1, fields: ["rateMode", "manualRate", "ruleStrength", "inflationTarget"], oneOffs: [] },
  { id: "budget", label: "Budget", slot: 3, fields: ["fiscalAdjustment", "adjustmentMix", "publicInvestment"], oneOffs: [] },
  { id: "currency", label: "Currency regime and flows", slot: 7, fields: ["fxRegime", "fxIntervention", "capitalControls"], oneOffs: ["devalue"] },
  { id: "support", label: "IMF, reforms, debt and institutions", slot: 6, fields: ["imfProgram", "laborReform", "productivityReform", "tradeOpenness"], oneOffs: ["restructure"], institutions: true },
];

/** Slots for the environment, in order: history first, then shocks as they arrive; the fourth folds the rest. */
const ENV_SLOTS = [4, 2, 8, 5];

type Piece = { id: string; label: string; kind: ComponentKind; slot: number; shockIds?: string[]; residuals?: boolean; group?: (typeof GROUPS)[number] };

function shockLabel(s: ScheduledShock): string {
  if (s.id === "surprise-confidence") return "Markets lose trust";
  return SHOCKS[s.kind].name;
}

/** The pieces present in this scenario, in a stable order. */
function pieces(full: ScenarioConfig, start: ScenarioConfig): Piece[] {
  const env: Piece[] = [];
  const residuals = full.residuals ?? [];
  if (residuals.length) {
    const hidden = residuals.some((r) => r.hidden);
    env.push({ id: "history", label: hidden ? "What really hit the economy" : "Underlying trend (WEO path)", kind: "environment", slot: 0, residuals: true });
  }
  const shocks = [...full.shocks].sort((a, b) => a.quarter - b.quarter);
  for (const s of shocks) env.push({ id: `shock:${s.id}`, label: `${shockLabel(s)}, ${quarterTag(s.quarter, full)}`, kind: "environment", slot: 0, shockIds: [s.id] });
  // Four environment slots at most: the rest fold into one.
  let envPieces = env;
  if (env.length > 4) {
    const rest = env.slice(3);
    envPieces = [...env.slice(0, 3), { id: "other-shocks", label: "Other shocks", kind: "environment", slot: 0, shockIds: rest.flatMap((p) => p.shockIds ?? []), residuals: rest.some((p) => p.residuals) }];
  }
  envPieces.forEach((p, i) => (p.slot = ENV_SLOTS[i]));

  const used = playerDecisions(full, start);
  const policy: Piece[] = GROUPS.filter((g) => used.some((d) => Object.keys(d.changes).some((k) => g.fields.includes(k as keyof Policy))) || full.oneOffs.some((o) => g.oneOffs.includes(o.kind)) || (g.institutions && (full.institutions ?? []).length > (start.institutions ?? []).length)).map((g) => ({ id: g.id, label: g.label, kind: "policy", slot: g.slot, group: g }));
  return [...envPieces, ...policy];
}

function quarterTag(q: number, config: ScenarioConfig): string {
  const y = (config.startYear ?? 2026) + Math.floor((q - 1) / 4);
  return `${y}Q${((q - 1) % 4) + 1}`;
}

/** Decisions the player made: everything beyond the mission's starting decisions. */
function playerDecisions(full: ScenarioConfig, start: ScenarioConfig): Decision[] {
  const inherited = new Set(start.decisions.map((d) => JSON.stringify(d)));
  return full.decisions.filter((d) => !inherited.has(JSON.stringify(d)));
}

/** The scenario with only the given pieces switched on. */
function build(full: ScenarioConfig, start: ScenarioConfig, on: Piece[]): ScenarioConfig {
  const shockIds = new Set(on.flatMap((p) => p.shockIds ?? []));
  const residualsOn = on.some((p) => p.residuals);
  const groups = on.filter((p) => p.group).map((p) => p.group!);
  const fields = new Set(groups.flatMap((g) => g.fields));
  const oneOffKinds = new Set(groups.flatMap((g) => g.oneOffs));
  const decisions: Decision[] = [...start.decisions];
  for (const d of playerDecisions(full, start)) {
    const changes = Object.fromEntries(Object.entries(d.changes).filter(([k]) => fields.has(k as keyof Policy))) as Partial<Policy>;
    if (Object.keys(changes).length) decisions.push({ quarter: d.quarter, changes });
  }
  return {
    ...full,
    randomShocks: false,
    shocks: full.shocks.filter((s) => shockIds.has(s.id)),
    residuals: residualsOn ? full.residuals : [],
    decisions,
    oneOffs: full.oneOffs.filter((o) => oneOffKinds.has(o.kind)),
    institutions: groups.some((g) => g.institutions) ? full.institutions : start.institutions,
  };
}

const KEYS = DECOMP_METRICS.map((m) => m.key);

/**
 * Average marginal contributions over the forward and reverse orderings of
 * `stage`, with `base` always switched on.
 */
function stageContributions(full: ScenarioConfig, start: ScenarioConfig, base: Piece[], stage: Piece[], horizon: number): Map<string, Record<DecompMetric, number[]>> {
  const out = new Map<string, Record<DecompMetric, number[]>>();
  for (const p of stage) out.set(p.id, Object.fromEntries(KEYS.map((k) => [k, Array(horizon + 1).fill(0)])) as Record<DecompMetric, number[]>);
  if (!stage.length) return out;
  const orders = stage.length > 1 ? [stage, [...stage].reverse()] : [stage];
  for (const order of orders) {
    let on = [...base];
    let prev = simulate(build(full, start, on)).path;
    for (const p of order) {
      on = [...on, p];
      const next = simulate(build(full, start, on)).path;
      const rec = out.get(p.id)!;
      for (const k of KEYS) for (let t = 0; t <= horizon; t++) rec[k][t] += (next[t][k] - prev[t][k]) / orders.length;
      prev = next;
    }
  }
  return out;
}

/**
 * Decompose `full` (the scenario as known now) relative to `start` (the
 * scenario as the mission began), quarters 0..horizon.
 */
export function decompose(full: ScenarioConfig, start: ScenarioConfig, horizon: number): Decomposition {
  const all = pieces(full, start);
  const env = all.filter((p) => p.kind === "environment");
  const pol = all.filter((p) => p.kind === "policy");
  const path = simulate(full).path;
  const bare = simulate(build(full, start, [])).path;
  const startVals = Object.fromEntries(KEYS.map((k) => [k, path[0][k]])) as Record<DecompMetric, number>;

  const momentum: Component = {
    id: "momentum",
    label: "Starting conditions and momentum",
    kind: "momentum",
    slot: 0,
    values: Object.fromEntries(KEYS.map((k) => [k, Array.from({ length: horizon + 1 }, (_, t) => bare[t][k] - startVals[k])])) as Record<DecompMetric, number[]>,
  };
  const envC = stageContributions(full, start, [], env, horizon);
  const polC = stageContributions(full, start, env, pol, horizon);
  const components: Component[] = [momentum, ...all.map((p) => ({ id: p.id, label: p.label, kind: p.kind, slot: p.slot, values: (p.kind === "policy" ? polC : envC).get(p.id)! }))];
  return { start: startVals, path, components };
}
