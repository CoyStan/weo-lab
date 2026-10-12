"use client";

import { useMemo } from "react";
import { quarterLabel } from "../model/economy";
import type { Policy, ScenarioConfig } from "../model/types";
import { useLab } from "../store";
import { getMission, objectiveStatus, policyForTurn, type MetricKey, type Mission, type ObjectiveStatus } from "./missions";
import { NUDGES } from "./nudges";
import { forecastFor, useGame } from "./store";

export function withDecision(config: ScenarioConfig, quarter: number, changes: Partial<Policy>): ScenarioConfig {
  const existing = config.decisions.find((d) => d.quarter === quarter);
  const decisions = existing ? config.decisions.map((d) => (d.quarter === quarter ? { ...d, changes: { ...d.changes, ...changes } } : d)) : [...config.decisions, { quarter, changes }];
  return { ...config, decisions };
}

/** Everything the play screen derives from the lab state for the current turn. */
export function useTurn() {
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  const result = useLab((s) => s.result);
  const missionId = useGame((s) => s.missionId);
  const turns = useGame((s) => s.turns);
  const mission = getMission(missionId ?? "") as Mission;
  const turnStart = turns[turns.length - 1] ?? config;

  const forecast = useMemo(() => forecastFor(config, clock), [config, clock]);
  const forecastStart = useMemo(() => (turnStart === config ? forecast : forecastFor(turnStart, clock)), [turnStart, config, clock, forecast]);
  const policy = useMemo(() => policyForTurn(config, clock), [config, clock]);
  const policyStart = useMemo(() => policyForTurn(turnStart, clock), [turnStart, clock]);
  const statuses = useMemo(() => {
    const map: Record<string, ObjectiveStatus> = {};
    if (mission) for (const o of mission.objectives) map[o.id] = objectiveStatus(o, mission, result.path, forecast, clock);
    return map;
  }, [mission, result, forecast, clock]);

  return {
    mission,
    config,
    clock,
    actual: result.path,
    events: result.events,
    forecast,
    forecastStart,
    policy,
    policyStart,
    statuses,
    deciding: quarterLabel(clock + 1),
    changed: JSON.stringify(policy) !== JSON.stringify(policyStart) || config.oneOffs.length !== turnStart.oneOffs.length,
  };
}

/** Effect of the lever under the pointer on each metric, by the mission's last quarter. */
export function useProbeEffect(metrics: MetricKey[]) {
  const probe = useGame((s) => s.probe);
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  const missionId = useGame((s) => s.missionId);
  const mission = getMission(missionId ?? "");
  return useMemo(() => {
    const nudge = probe ? NUDGES[probe] : undefined;
    if (!nudge || !mission) return null;
    const end = mission.quarters;
    const base = forecastFor(config, clock)[end];
    const nudged = forecastFor(withDecision(config, clock + 1, nudge.changes(policyForTurn(config, clock))), clock)[end];
    const deltas = Object.fromEntries(metrics.map((m) => [m, nudged[m] - base[m]])) as Record<MetricKey, number>;
    return { label: nudge.label, deltas, by: quarterLabel(end) };
  }, [probe, mission, config, clock, metrics]);
}
