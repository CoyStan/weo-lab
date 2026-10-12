// Political capital: Votes (your own electorate) and Trust (markets, partners
// and the international community). Both are earned or lost each quarter from
// what actually happened, and spent on institutions and on costly moves.
// Everything is computed from the scenario and its path, so rewinding a
// quarter rewinds the ledger too.

import { policyAt } from "../model/economy.ts";
import { getPreset } from "../model/presets.ts";
import type { InstitutionId, QuarterState, ScenarioConfig, SimEvent } from "../model/types.ts";

export type Currency = "votes" | "trust";
export type Cost = Partial<Record<Currency, number>>;

export type Institution = {
  id: InstitutionId;
  name: string;
  branch: "Monetary" | "Fiscal" | "Buffers" | "Social";
  /** What it does, in plain words. */
  effect: string;
  cost: Cost;
  requires?: InstitutionId;
};

export const INSTITUTIONS: Record<InstitutionId, Institution> = {
  "cb-independence": { id: "cb-independence", name: "Central bank independence", branch: "Monetary", effect: "Credibility grows every quarter and expectations follow the target more closely.", cost: { votes: 4 } },
  "inflation-targeting": { id: "inflation-targeting", name: "Inflation-targeting framework", branch: "Monetary", effect: "Expectations anchor to the target as if credibility were 10 points higher.", cost: { trust: 2 }, requires: "cb-independence" },
  "forward-guidance": { id: "forward-guidance", name: "Forward guidance", branch: "Monetary", effect: "Clear communication halves the credibility lost to shocks.", cost: { trust: 1 } },
  "fiscal-rule": { id: "fiscal-rule", name: "Fiscal responsibility law", branch: "Fiscal", effect: "Spreads fall about 30 bp and credibility edges up.", cost: { votes: 4 } },
  "tax-admin": { id: "tax-admin", name: "Tax administration reform", branch: "Fiscal", effect: "Collects 0.4% of GDP more revenue, phased in over a year, without raising tax rates.", cost: { votes: 3, trust: 2 } },
  "debt-office": { id: "debt-office", name: "Debt management office", branch: "Fiscal", effect: "Longer, cheaper borrowing: 0.3 points off the interest rate on new debt.", cost: { trust: 2 } },
  "investment-agency": { id: "investment-agency", name: "Public investment agency", branch: "Fiscal", effect: "Better project selection: public investment raises growth capacity half as much again.", cost: { votes: 2 } },
  "safety-net": { id: "safety-net", name: "Targeted safety net", branch: "Social", effect: "Cushions job losses, and voters forgive austerity and layoffs.", cost: { trust: 2 } },
  "swap-line": { id: "swap-line", name: "Central bank swap line", branch: "Buffers", effect: "Adds one and a half months of imports to reserves at once.", cost: { trust: 4 } },
  macroprudential: { id: "macroprudential", name: "Macroprudential toolkit", branch: "Buffers", effect: "Capital outflows hit the currency 30% less.", cost: { trust: 2 } },
};

export type PoliticsRules = {
  start: Record<Currency, number>;
  /** Quarters that end with an election. */
  elections: number[];
  /** Votes needed to win an election. */
  threshold: number;
  institutions: InstitutionId[];
};

export type Entry = { quarter: number; currency: Currency; amount: number; reason: string; kind: "earned" | "spent" };

export type Ledger = {
  votes: number;
  trust: number;
  entries: Entry[];
  elections: { quarter: number; votes: number; won: boolean }[];
  /** First quarter that ended with Trust at or below the crisis line. */
  crisisAt: number | null;
};

export const TRUST_CRISIS = -3;
/** A good quarter earns at most one point of each; a bad one can cost up to three. */
const GAIN_CAP = 1;
const LOSS_CAP = 3;

function earned(t: number, prev: QuarterState, now: QuarterState, config: ScenarioConfig, events: SimEvent[], has: (id: InstitutionId) => boolean): Entry[] {
  const preset = getPreset(config.presetId);
  const policy = policyAt(preset.defaultPolicy, config.decisions, t);
  const out: Entry[] = [];
  const v = (amount: number, reason: string) => out.push({ quarter: t, currency: "votes", amount, reason, kind: "earned" });
  const tr = (amount: number, reason: string) => out.push({ quarter: t, currency: "trust", amount, reason, kind: "earned" });

  // Voters.
  if (now.growth >= 3) v(1, `Strong growth (${now.growth.toFixed(1)}%)`);
  else if (now.growth < -2) v(-2, `Deep recession (${now.growth.toFixed(1)}%)`);
  else if (now.growth < 0) v(-1, `Recession (${now.growth.toFixed(1)}%)`);
  const dU = now.unemp - prev.unemp;
  if (dU <= -0.3) v(1, "Jobs created");
  else if (dU >= 0.3 && !has("safety-net")) v(-1, "Job losses");
  if (now.infl > 15) v(-2, `Prices soaring (${now.infl.toFixed(1)}%)`);
  else if (now.infl > 8) v(-1, `Prices rising fast (${now.infl.toFixed(1)}%)`);
  if (policy.fiscalAdjustment >= 1.25 && !has("safety-net")) v(-1, "Austerity");
  if (policy.fiscalAdjustment <= -0.5) v(1, "Spending boost");

  // Markets and partners.
  const gap = Math.abs(now.infl - policy.inflationTarget);
  if (gap <= 0.5) tr(1, "Inflation on target");
  else if (gap > 4) tr(-1, "Inflation far off target");
  if (now.debt < prev.debt - 0.3) tr(1, "Debt falling");
  else if (now.debt > prev.debt + 0.8) tr(-1, "Debt rising");
  if (now.reserves < 2) tr(-1, "Thin reserves");
  if (now.spread <= prev.spread - 25) tr(1, "Spreads narrowing");
  else if (now.spread >= prev.spread + 50) tr(-1, "Spreads widening");
  if (policy.imfProgram > 0) {
    if (policy.fiscalAdjustment >= 0.5) tr(1, "IMF programme on track");
    else tr(-2, "IMF programme off track");
  }
  for (const e of events) {
    if (e.quarter !== t) continue;
    if (e.title === "Peg abandoned") tr(-3, "Peg broke");
    if (e.title === "Market access lost") tr(-2, "Lost market access");
  }

  // Cap the quarter's swing in each currency: goodwill builds slowly and drains fast.
  for (const c of ["votes", "trust"] as Currency[]) {
    const list = out.filter((e) => e.currency === c);
    const total = list.reduce((a, e) => a + e.amount, 0);
    const capped = Math.max(-LOSS_CAP, Math.min(GAIN_CAP, total));
    if (capped !== total) list.push({ quarter: t, currency: c, amount: capped - total, reason: total > 0 ? "Goodwill builds slowly" : "Limit on one quarter's losses", kind: "earned" });
    if (capped !== total) out.push(list[list.length - 1]);
  }
  return out.filter((e) => e.amount !== 0);
}

/** Costs of moves made for quarter t (adoptions, programmes, one-off actions). */
function spent(t: number, config: ScenarioConfig): Entry[] {
  const preset = getPreset(config.presetId);
  const out: Entry[] = [];
  const pay = (cost: Cost, reason: string) => {
    if (cost.votes) out.push({ quarter: t, currency: "votes", amount: -cost.votes, reason, kind: "spent" });
    if (cost.trust) out.push({ quarter: t, currency: "trust", amount: -cost.trust, reason, kind: "spent" });
  };
  for (const a of config.institutions ?? []) if (a.quarter === t) pay(INSTITUTIONS[a.id].cost, INSTITUTIONS[a.id].name);
  const now = policyAt(preset.defaultPolicy, config.decisions, t);
  const before = policyAt(preset.defaultPolicy, config.decisions, t - 1);
  for (const move of Object.values(MOVE_COSTS)) if (move.when(before, now)) pay(move.cost, move.reason);
  for (const o of config.oneOffs) {
    if (o.quarter !== t) continue;
    if (o.kind === "devalue") pay({ votes: 1, trust: 2 }, "Devaluation");
    if (o.kind === "restructure") pay({ trust: 3 }, "Debt restructuring");
  }
  return out;
}

/** Big moves that use up political capital the quarter they start. */
export const MOVE_COSTS = {
  imf: { cost: { votes: 3 } as Cost, reason: "Asked the IMF for a programme", when: (a: { imfProgram: number }, b: { imfProgram: number }) => a.imfProgram === 0 && b.imfProgram > 0 },
  controls: { cost: { trust: 2 } as Cost, reason: "Imposed capital flow measures", when: (a: { capitalControls: boolean }, b: { capitalControls: boolean }) => !a.capitalControls && b.capitalControls },
};

/** The ledger at the end of quarter `clock`, plus any moves already decided for clock + 1. */
export function ledger(rules: PoliticsRules, config: ScenarioConfig, path: QuarterState[], events: SimEvent[], clock: number): Ledger {
  const entries: Entry[] = [];
  const elections: Ledger["elections"] = [];
  let votes = rules.start.votes;
  let trust = rules.start.trust;
  let crisisAt: number | null = null;
  const owned = new Set<InstitutionId>();

  for (let t = 1; t <= clock + 1; t++) {
    for (const a of config.institutions ?? []) if (a.quarter === t) owned.add(a.id);
    // Spending for quarter t is committed while deciding it, before its outcome.
    for (const e of spent(t, config)) {
      entries.push(e);
      if (e.currency === "votes") votes += e.amount;
      else trust += e.amount;
    }
    if (t > clock) break;
    for (const e of earned(t, path[t - 1], path[t], config, events, (id) => owned.has(id))) {
      entries.push(e);
      if (e.currency === "votes") votes += e.amount;
      else trust += e.amount;
    }
    if (rules.elections.includes(t)) elections.push({ quarter: t, votes, won: votes >= rules.threshold });
    if (crisisAt === null && trust <= TRUST_CRISIS) crisisAt = t;
  }
  return { votes, trust, entries, elections, crisisAt };
}

/** Whether an institution can be adopted now, and why not if it can't. */
export function canAdopt(id: InstitutionId, rules: PoliticsRules, config: ScenarioConfig, balance: { votes: number; trust: number }): { ok: boolean; reason?: string } {
  const inst = INSTITUTIONS[id];
  const owned = new Set((config.institutions ?? []).map((a) => a.id));
  if (owned.has(id)) return { ok: false, reason: "Adopted" };
  if (!rules.institutions.includes(id)) return { ok: false, reason: "Not available in this mission" };
  if (inst.requires && !owned.has(inst.requires)) return { ok: false, reason: `Needs ${INSTITUTIONS[inst.requires].name.toLowerCase()} first` };
  if ((inst.cost.votes ?? 0) > balance.votes) return { ok: false, reason: "Not enough votes" };
  if ((inst.cost.trust ?? 0) > balance.trust) return { ok: false, reason: "Not enough trust" };
  return { ok: true };
}
