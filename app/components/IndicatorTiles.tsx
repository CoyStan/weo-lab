"use client";

import { useMemo } from "react";
import { VARIABLES } from "../model/constraints";
import { quarterLabel } from "../model/economy";
import type { ConstraintVar } from "../model/types";
import { selectCurrent, selectReferenceAt, useLab, type FocusKey } from "../store";
import { deltaTone, fmtDelta, fmtMetric, METRICS, seriesOf, TILE_KEYS } from "./format";
import { Panel } from "./ui";

export default function IndicatorTiles() {
  const current = useLab(selectCurrent);
  const reference = useLab(selectReferenceAt);
  const path = useLab((s) => s.result.path);
  const breaches = useLab((s) => s.result.breaches);
  const constraints = useLab((s) => s.config.constraints);
  const clock = useLab((s) => s.clock);
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const compare = useLab((s) => s.compare);

  const breachedNow = useMemo(() => {
    const set = new Set<ConstraintVar>();
    for (const b of breaches) {
      if (b.quarter !== clock) continue;
      const c = constraints.find((x) => x.id === b.constraintId);
      if (c) set.add(c.variable);
    }
    return set;
  }, [breaches, constraints, clock]);

  return (
    <Panel title={`Indicators, ${quarterLabel(clock)}`} subtitle={`Delta against the ${compare === "pinned" ? "pinned scenario" : "WEO reference"}. Click a tile to focus it.`}>
      <div className="grid grid-cols-2 gap-1.5">
        {TILE_KEYS.map((key) => {
          const m = METRICS[key];
          const v = current[key];
          const delta = v - reference[key];
          const tone = deltaTone(key, delta);
          const breached = breachedNow.has(key as ConstraintVar);
          const series = seriesOf(path, key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFocus(focus === key ? null : key);
                document.getElementById(`chart-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className={`lab-tile ${focus === key ? "is-focus" : ""} ${breached ? "is-breach" : ""}`}
              aria-pressed={focus === key}
              aria-label={`${m.label} ${fmtMetric(key, v)} ${m.unit}${breached ? ", constraint breached" : ""}`}
            >
              <span className="flex items-center justify-between gap-1 text-[0.64rem] font-semibold uppercase tracking-wider text-[var(--lab-ink-2)]">
                {m.short}
                {breached ? <span className="lab-chip lab-chip-bad" title={`Breaches ${VARIABLES[key as ConstraintVar]?.label ?? ""} constraint`}>!</span> : null}
              </span>
              <span className="mt-0.5 flex items-baseline gap-1">
                <span className="font-sans text-[1.15rem] font-semibold leading-none tracking-tight text-[var(--lab-ink)]">{fmtMetric(key, v)}</span>
                <span className="text-[0.62rem] text-[var(--lab-ink-2)]">{m.unit}</span>
              </span>
              <span className="mt-1 flex items-end justify-between gap-1">
                <span className={`text-[0.64rem] font-semibold tabular-nums ${tone === "good" ? "text-[var(--lab-good)]" : tone === "bad" ? "text-[var(--lab-bad)]" : "text-[var(--lab-ink-2)]"}`}>{Math.abs(delta) < 0.05 ? "= ref" : fmtDelta(key, delta)}</span>
                <Sparkline values={series} clock={clock} />
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function Sparkline({ values, clock }: { values: number[]; clock: number }) {
  const w = 56;
  const h = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 4);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const past = values.slice(0, clock + 1).map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0 overflow-visible">
      <path d={d} fill="none" stroke="color-mix(in srgb, var(--lab-scenario) 25%, transparent)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={past} fill="none" stroke="var(--lab-scenario)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(clock)} cy={y(values[clock])} r={2.5} fill="var(--lab-scenario)" stroke="var(--lab-surface)" strokeWidth={1.5} />
    </svg>
  );
}

export type { FocusKey };
