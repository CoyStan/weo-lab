import type { Policy } from "../model/types.ts";
import type { LeverId } from "./missions.ts";

/** The small change used to preview what a lever does, relative to current policy. */
export const NUDGES: Partial<Record<LeverId, { label: string; changes: (p: Policy) => Partial<Policy> }>> = {
  rate: { label: "Raising the rate 1 point", changes: (p) => ({ manualRate: p.manualRate + 1 }) },
  rule: { label: "Making the rule react 0.5 harder", changes: (p) => ({ ruleStrength: Math.min(2.5, p.ruleStrength + 0.5) }) },
  fiscal: { label: "Tightening 0.5 more a year", changes: (p) => ({ fiscalAdjustment: p.fiscalAdjustment + 0.5 }) },
  mix: { label: "Leaning 30 points more on taxes", changes: (p) => ({ adjustmentMix: Math.min(100, p.adjustmentMix + 30) }) },
  investment: { label: "Investing 0.5% of GDP more", changes: (p) => ({ publicInvestment: p.publicInvestment + 0.5 }) },
  intervention: { label: "Intervening 25 points more", changes: (p) => ({ fxIntervention: Math.min(100, p.fxIntervention + 25) }) },
  controls: { label: "Switching capital flow measures", changes: (p) => ({ capitalControls: !p.capitalControls }) },
  imf: { label: "Borrowing 2% of GDP more a year from the IMF", changes: (p) => ({ imfProgram: Math.min(8, p.imfProgram + 2), fiscalAdjustment: Math.max(0.5, p.fiscalAdjustment) }) },
  reforms: { label: "One more level of reform", changes: (p) => ({ laborReform: Math.min(3, p.laborReform + 1), productivityReform: Math.min(3, p.productivityReform + 1), tradeOpenness: Math.min(3, p.tradeOpenness + 1) }) },
};
