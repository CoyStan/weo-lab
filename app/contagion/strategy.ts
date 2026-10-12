// A reasonable, simple fund strategy, used by the tests to prove every origin
// is winnable and by the game as the "what would a careful fund do?" hint.

import { act, canAct, COUNTRIES, crisisCount, def, vuln, type Action, type World } from "./engine.ts";

const REGION_PRIORITY = (w: World, iso: string) => {
  const d = def(iso);
  const hot = Object.values(w.countries).filter((c) => c.status !== "calm" && def(c.iso).region === d.region).length;
  return hot + (d.center ? 1.5 : 0);
};

/** The single most useful action right now, or null when nothing helps. */
export function suggest(w: World): Action | null {
  const t = w.quarter;
  const all = Object.values(w.countries);
  if (w.panic > 55 && canAct(w, { kind: "calm" }).ok) return { kind: "calm" };
  // Big countries in crisis first: their trouble spreads furthest.
  const sick = all.filter((c) => c.status !== "calm" && c.programmeUntil <= t).sort((a, b) => b.share * b.stress - a.share * a.stress);
  for (const c of sick) {
    if (c.status === "crisis" && c.debt > 100 && !c.restructured && canAct(w, { kind: "restructure", iso: c.iso }).ok) return { kind: "restructure", iso: c.iso };
    if (canAct(w, { kind: "programme", iso: c.iso }).ok && (c.status === "crisis" || c.stress > 55)) return { kind: "programme", iso: c.iso };
  }
  // Then firewalls around the fire: exposed, vulnerable, sizeable countries.
  const exposed = all
    .filter((c) => c.status !== "crisis" && canAct(w, { kind: "creditLine", iso: c.iso }).ok)
    .map((c) => ({ c, score: (c.stress / 100 + vuln(c, t)) * REGION_PRIORITY(w, c.iso) * (0.3 + Math.sqrt(c.share)) }))
    .filter((x) => x.score > 0.25)
    .sort((a, b) => b.score - a.score);
  if (exposed.length) return { kind: "creditLine", iso: exposed[0].c.iso };
  const assist = all.filter((c) => c.status === "stressed" && canAct(w, { kind: "assist", iso: c.iso }).ok).sort((a, b) => b.stress - a.stress);
  if (assist.length) return { kind: "assist", iso: assist[0].iso };
  return null;
}

/** Spend the whole quarter's staff on suggestions. */
export function autoQuarter(w: World): World {
  for (let i = 0; i < 4; i++) {
    const a = suggest(w);
    if (!a) break;
    const next = act(w, a);
    if (next === w) break;
    w = next;
  }
  return w;
}

export const ORIGINS = COUNTRIES.map((c) => c.iso);
export { crisisCount };
