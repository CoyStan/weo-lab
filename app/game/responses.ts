// When a shock hits, the player gets a card with a few ready-made responses
// (plus "decide myself"). Each response is an ordinary policy decision, limited
// to the levers the mission has unlocked.

import { SHOCKS } from "../model/shocks.ts";
import type { Policy, ShockKind } from "../model/types.ts";
import type { LeverId } from "./missions.ts";

export type Response = {
  id: string;
  label: string;
  detail: string;
  changes: Partial<Policy>;
};

type Ctx = { policy: Policy; unlocked: Set<LeverId> };

/** Tighten or ease monetary policy with whatever rate lever is available. */
function monetary(ctx: Ctx, direction: 1 | -1, size: "small" | "big"): Partial<Policy> | null {
  const { policy, unlocked } = ctx;
  if (policy.fxRegime === "peg") return null;
  if (policy.rateMode === "rule" && unlocked.has("rule")) {
    const target = direction > 0 ? Math.max(policy.ruleStrength, size === "big" ? 2.2 : 1.8) : Math.min(policy.ruleStrength, 0.9);
    return target === policy.ruleStrength ? null : { ruleStrength: target };
  }
  if (unlocked.has("rate")) {
    const step = size === "big" ? 2 : 1;
    const base = policy.rateMode === "manual" ? policy.manualRate : null;
    if (base === null) return null;
    return { rateMode: "manual", manualRate: Math.max(0, base + direction * step) };
  }
  return null;
}

const rateWord = (ctx: Ctx, changes: Partial<Policy>) =>
  changes.ruleStrength !== undefined ? `Rule strength to ×${changes.ruleStrength.toFixed(1)}.` : changes.manualRate !== undefined ? `Policy rate to ${changes.manualRate.toFixed(2).replace(/\.?0+$/, "")}%.` : "";

export function responsesFor(kind: ShockKind, ctx: Ctx): Response[] {
  const { policy, unlocked } = ctx;
  const out: Response[] = [];
  const add = (id: string, label: string, detail: string, changes: Partial<Policy> | null) => {
    if (changes) out.push({ id, label, detail, changes });
  };
  const tighten = monetary(ctx, 1, "small");
  const tightenBig = monetary(ctx, 1, "big");
  const ease = monetary(ctx, -1, "small");
  const fiscal = unlocked.has("fiscal");

  switch (kind) {
    case "food-price":
    case "oil-spike":
    case "supply-shock":
      add("look-through", "Look through it", "Hold policy. A price jump fades on its own if expectations stay anchored.", {});
      if (tighten) add("lean", "Lean against it", `Keep it out of expectations. ${rateWord(ctx, tighten)}`, tighten);
      if (ease) add("protect", "Protect jobs", `Accept more inflation to cushion growth. ${rateWord(ctx, ease)}`, ease);
      if (fiscal) add("subsidise", "Cushion households", "Ease the budget by half a point of GDP a year.", { fiscalAdjustment: policy.fiscalAdjustment - 0.5 });
      break;
    case "commodity-bust":
      if (unlocked.has("fxRegime") && policy.fxRegime !== "float") add("float", "Let the currency adjust", "Float: a weaker currency absorbs the hit and protects reserves.", { fxRegime: "float" });
      if (unlocked.has("intervention") && policy.fxRegime === "managed") add("defend", "Defend the currency", "Meet all FX pressure from reserves.", { fxIntervention: 100 });
      if (fiscal) add("tighten-budget", "Tighten the budget", "Raise the primary balance by a point of GDP a year to replace lost revenue.", { fiscalAdjustment: policy.fiscalAdjustment + 1 });
      break;
    case "sudden-stop":
    case "downgrade":
      if (tightenBig) add("hike", "Raise rates sharply", `Pay investors to stay. ${rateWord(ctx, tightenBig)}`, tightenBig);
      if (unlocked.has("controls") && !policy.capitalControls) add("controls", "Capital flow measures", "Slow the outflow, at a cost in spreads and growth.", { capitalControls: true });
      if (unlocked.has("imf") && policy.imfProgram === 0 && fiscal) add("imf", "Call the IMF", "A programme of 2% of GDP a year, with half a point of fiscal adjustment.", { imfProgram: 2, fiscalAdjustment: Math.max(0.5, policy.fiscalAdjustment) });
      if (fiscal) add("plan", "Announce a fiscal plan", "Show markets a path: half a point of GDP a year more adjustment.", { fiscalAdjustment: policy.fiscalAdjustment + 0.5 });
      break;
    default:
      if (tighten) add("tighten", "Tighten", rateWord(ctx, tighten), tighten);
      if (fiscal) add("support", "Support the economy", "Ease the budget by half a point of GDP a year.", { fiscalAdjustment: policy.fiscalAdjustment - 0.5 });
  }
  return out.slice(0, 3);
}

export function shockStory(kind: ShockKind): { title: string; text: string } {
  const spec = SHOCKS[kind];
  return { title: spec.name, text: spec.description };
}
