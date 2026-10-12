"use client";

import { useDeferredValue, useMemo } from "react";
import { simulateFan, type FanKey } from "../model/fan";
import { VARIABLES } from "../model/constraints";
import type { ConstraintVar } from "../model/types";
import { selectReference, useLab } from "../store";
import { CHART_KEYS, METRICS, seriesOf } from "./format";
import LineChart, { type ChartThreshold } from "./LineChart";

const SCENARIO = "var(--lab-scenario)";
const REFERENCE = "var(--lab-reference)";
const PINNED = "var(--lab-pinned)";

export default function ChartsStrip() {
  const result = useLab((s) => s.result);
  const reference = useLab(selectReference);
  const compare = useLab((s) => s.compare);
  const clock = useLab((s) => s.clock);
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const constraints = useLab((s) => s.config.constraints);
  const breaches = useLab((s) => s.result.breaches);
  const config = useLab((s) => s.config);
  const showFan = useLab((s) => s.showFan);
  const setShowFan = useLab((s) => s.setShowFan);
  // The fan reruns the scenario under 60 shock draws; defer it so slider drags stay smooth.
  const deferredConfig = useDeferredValue(config);
  const fan = useMemo(() => (showFan ? simulateFan(deferredConfig, 60) : null), [showFan, deferredConfig]);

  const refLabel = compare === "pinned" ? "Pinned" : "WEO reference";
  const refColor = compare === "pinned" ? PINNED : REFERENCE;

  const thresholdsByKey = useMemo(() => {
    const map = new Map<string, ChartThreshold[]>();
    for (const c of constraints) {
      const spec = VARIABLES[c.variable];
      const list = map.get(c.variable) ?? [];
      list.push({ value: c.threshold, op: c.op, label: `${c.threshold}${spec.unit === "%" ? "%" : ""}` });
      map.set(c.variable, list);
    }
    return map;
  }, [constraints]);

  const breachesByKey = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const b of breaches) {
      const c = constraints.find((x) => x.id === b.constraintId);
      if (!c) continue;
      const list = map.get(c.variable) ?? [];
      list.push(b.quarter);
      map.set(c.variable, list);
    }
    return map;
  }, [breaches, constraints]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[0.68rem] text-[var(--lab-ink-2)]" aria-label="Chart legend">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-5 border-t-2" style={{ borderColor: SCENARIO }} /> Your scenario</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-5 border-t-2 border-dashed" style={{ borderColor: refColor }} /> {refLabel}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-5 border-t border-[var(--lab-alert)]" /> Constraint</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[color-mix(in_srgb,var(--lab-alert)_18%,transparent)]" /> Breach</span>
        {showFan ? <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 rounded-sm" style={{ background: SCENARIO, opacity: 0.25 }} /> 10–90% of 60 shock draws</span> : null}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 font-semibold text-[var(--lab-ink)]" title="Rerun the scenario under 60 random shock draws and shade the 10th–90th percentile range">
          <input type="checkbox" className="accent-[var(--lab-scenario)]" checked={showFan} onChange={(e) => setShowFan(e.target.checked)} />
          Risk fan
        </label>
      </div>
      <div className="lab-chart-strip min-h-0 flex-1 px-1 pb-1">
        {CHART_KEYS.map((key) => {
          const m = METRICS[key];
          return (
            <LineChart
              key={key}
              id={`chart-${key}`}
              title={m.label}
              unit={m.unit}
              digits={m.digits}
              clock={clock}
              focused={focus === key}
              onFocus={() => setFocus(key)}
              thresholds={thresholdsByKey.get(key as ConstraintVar) ?? []}
              breachQuarters={breachesByKey.get(key as ConstraintVar) ?? []}
              band={fan ? { lo: fan[key as FanKey].p10, hi: fan[key as FanKey].p90, color: SCENARIO, label: "10–90% range" } : undefined}
              series={[
                { key: "scenario", label: "Scenario", color: SCENARIO, values: seriesOf(result.path, key) },
                { key: "reference", label: refLabel, color: refColor, dashed: true, values: seriesOf(reference.path, key) },
              ]}
            />
          );
        })}
      </div>
    </div>
  );
}
