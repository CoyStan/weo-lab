import { simulate } from "./economy.ts";
import type { QuarterState, ScenarioConfig } from "./types.ts";

export const FAN_KEYS = ["growth", "infl", "rate", "debt", "ob", "ca", "reserves", "unemp", "spread", "rer", "cred", "oil"] as const;
export type FanKey = (typeof FAN_KEYS)[number];

/** Per-quarter percentile bands for each indicator. */
export type Fan = Record<FanKey, { p10: number[]; p50: number[]; p90: number[] }>;

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Risk fan: rerun the scenario under `draws` independent random-shock draws
 * (on top of whatever the economist scheduled) and take the 10th, 50th and
 * 90th percentile of each indicator per quarter. Deterministic for a given
 * config, so the fan does not flicker between renders.
 */
export function simulateFan(config: ScenarioConfig, draws = 60): Fan {
  const paths: QuarterState[][] = [];
  for (let i = 0; i < draws; i++) {
    paths.push(simulate({ ...config, randomShocks: true, seed: 9001 + i * 7919 }).path);
  }
  const quarters = paths[0].length;
  const fan = {} as Fan;
  for (const key of FAN_KEYS) {
    const p10: number[] = [];
    const p50: number[] = [];
    const p90: number[] = [];
    for (let t = 0; t < quarters; t++) {
      const values = paths.map((p) => p[t][key]).sort((a, b) => a - b);
      p10.push(percentile(values, 0.1));
      p50.push(percentile(values, 0.5));
      p90.push(percentile(values, 0.9));
    }
    fan[key] = { p10, p50, p90 };
  }
  return fan;
}
