"use client";

import { useMemo } from "react";
import { SHOCKS } from "../model/shocks";
import type { QuarterState, ScenarioConfig, ShockKind } from "../model/types";
import { forecastFor, useGame } from "../game/store";
import { useStoryShown } from "../scenes/story/shown";
import { useLab, type FocusKey } from "../store";

/**
 * Which quarter the island shows, and which landmarks stand on it.
 *
 * In the game the island shows the same quarter as the cause-and-effect map: the staff
 * forecast for the quarter being decided (the map's own pick on its time strip when it
 * has one), never last quarter's actual. In free play it shows the quarter under the
 * playhead, as the sandbox's charts and tiles do.
 */

export type IslandMode = "play" | "sandbox" | "backdrop";

export function useIslandMode(): IslandMode {
  const screen = useGame((s) => s.screen);
  return screen === "sandbox" ? "sandbox" : screen === "play" ? "play" : "backdrop";
}

/** One forecast per (config, clock): every district and the weather read the same path. */
let cached: { config: ScenarioConfig | null; clock: number; path: QuarterState[] } = { config: null, clock: -1, path: [] };
function forecastPath(config: ScenarioConfig, clock: number): QuarterState[] {
  if (cached.config !== config || cached.clock !== clock) cached = { config, clock, path: forecastFor(config, clock) };
  return cached.path;
}

export type IslandQuarter = {
  /** The quarter shown. */
  now: QuarterState;
  /** The quarter before it, for the tags' arrows. */
  prev: QuarterState;
  /** Its index on the path. */
  t: number;
};

export function useIslandQuarter(): IslandQuarter {
  const mode = useIslandMode();
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  const result = useLab((s) => s.result);
  // The map's quarter (the one being decided, or the one picked on its strip), while it is up.
  const storyT = useStoryShown((s) => (s.story && s.story.clock === clock ? s.T : -1));
  return useMemo(() => {
    if (mode === "sandbox") {
      const t = Math.min(clock, result.path.length - 1);
      return { now: result.path[t], prev: result.path[Math.max(0, t - 1)], t };
    }
    const path = forecastPath(config, clock);
    const t = Math.max(1, Math.min(path.length - 1, storyT >= 0 ? storyT : clock + 1));
    return { now: path[t], prev: path[t - 1], t };
  }, [mode, config, clock, result, storyT]);
}

/** Every district on the island. */
export const ALL_LANDMARKS: FocusKey[] = ["debt", "rate", "infl", "growth", "ca", "reserves", "unemp", "cred", "oil"];

/**
 * The landmark a shock hits, as the news card names it ("hits the port"): the same reading of
 * the shock's first impulse as the card's (app/game/ui/Modals.tsx, shockDistrict).
 */
function shockLandmark(kind: ShockKind): FocusKey | null {
  const spec = SHOCKS[kind];
  const imp = { ...spec.at(1, 1), ...spec.at(0, 1) };
  if (imp.inflAdd) return "infl";
  if (imp.oilMult !== undefined && imp.oilMult !== 1) return "oil";
  if (imp.spendingAdd || imp.debtOneOff) return "debt";
  if (imp.riskPremiumAdd || imp.capitalFlowAdd) return "reserves";
  if (imp.globalGrowthAdd || imp.partnerGrowthAdd || (imp.commodityMult !== undefined && imp.commodityMult !== 1)) return "ca";
  if (imp.gapAdd || (imp.potentialLevelMult !== undefined && imp.potentialLevelMult !== 1)) return "growth";
  if (imp.credAdd) return "cred";
  return null;
}

/**
 * The landmarks on the island. Free play and the title screens show them all. A mission
 * shows only what it is about: its goals and the lever it unlocks (the game's spotlight),
 * and the landmark a shock hits, from its news card until the shock has passed.
 */
export function useLandmarks(now: QuarterState): ReadonlySet<FocusKey> {
  const mode = useIslandMode();
  const screen = useGame((s) => s.screen);
  const spotlight = useGame((s) => s.spotlight);
  const shockFocus = useLab((s) => s.shockFocus);
  const hits: string[] = [];
  for (const k of now.activeShocks) {
    const at = shockLandmark(k);
    if (at && !hits.includes(at)) hits.push(at);
  }
  const hit = hits.sort().join(",");
  const key = `${mode}|${screen}|${spotlight.join(",")}|${shockFocus ?? ""}|${hit}`;
  return useMemo(() => {
    const inMission = mode === "play" || (screen === "briefing" && spotlight.length > 0);
    if (!inMission) return new Set(ALL_LANDMARKS);
    const set = new Set<FocusKey>(spotlight.filter((k) => ALL_LANDMARKS.includes(k)));
    if (shockFocus && ALL_LANDMARKS.includes(shockFocus)) set.add(shockFocus);
    for (const k of hit ? hit.split(",") : []) set.add(k as FocusKey);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
