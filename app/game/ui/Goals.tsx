"use client";

import { useState } from "react";
import { getStartYear, quarterLabel } from "../../model/economy";
import type { QuarterState } from "../../model/types";
import { sound } from "../audio";
import { explain } from "../explain";
import { deltaUnit, fmtNum, GAME_METRICS, unitShort } from "../metrics";
import type { MetricKey, Objective, ObjectiveStatus } from "../missions";
import { useProbeEffect, useTurn } from "../useTurn";

const STATUS_TEXT: Record<ObjectiveStatus, string> = { met: "Met", failed: "Missed", "on-track": "On track", "at-risk": "At risk" };

export default function Goals() {
  const { mission, actual, forecast, forecastStart, clock, statuses, comparison, comparisonLabel } = useTurn();
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  const effect = useProbeEffect(metrics);

  return (
    <div className="flex flex-col gap-2.5">
      {comparisonLabel ? (
        <p className="flex items-center gap-2 text-[0.66rem] text-[var(--lab-ink-2)]">
          <span className="inline-block h-0 w-5 border-t-2 border-[color-mix(in_srgb,var(--lab-ink)_35%,transparent)]" /> {comparisonLabel}
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-[var(--lab-scenario)]" /> Your forecast
        </p>
      ) : null}
      {metrics.map((metric) => {
        const objectives = mission.objectives.filter((o) => o.metric === metric);
        return (
          <GoalCard
            key={metric}
            metric={metric}
            objectives={objectives}
            statuses={statuses}
            actual={actual}
            forecast={forecast}
            ghost={forecastStart}
            clock={clock}
            end={mission.quarters}
            probeDelta={effect ? effect.deltas[metric] : null}
            comparison={comparison}
            comparisonLabel={comparisonLabel}
          />
        );
      })}
    </div>
  );
}

function GoalCard({ metric, objectives, statuses, actual, forecast, ghost, clock, end, probeDelta, comparison, comparisonLabel }: { metric: MetricKey; objectives: Objective[]; statuses: Record<string, ObjectiveStatus>; actual: QuarterState[]; forecast: QuarterState[]; ghost: QuarterState[]; clock: number; end: number; probeDelta: number | null; comparison: QuarterState[] | null; comparisonLabel: string | null }) {
  const meta = GAME_METRICS[metric];
  const [why, setWhy] = useState(false);
  const now = actual[clock][metric];
  const endValue = clock >= end ? actual[end][metric] : forecast[end][metric];
  const worst = objectives.some((o) => statuses[o.id] === "failed" && !o.bonus) ? "failed" : objectives.some((o) => statuses[o.id] === "at-risk" && !o.bonus) ? "at-risk" : "ok";

  return (
    <section className={`game-goal is-${worst}`} aria-label={meta.label}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="game-goal-title" title={meta.plain}>{meta.label}</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="game-goal-value tabular-nums">{fmtNum(now, meta.digits)}</span>
            <span className="text-[0.7rem] text-[var(--lab-ink-2)]">{meta.unit}</span>
            {clock < end ? (
              <span className="ml-1 text-[0.68rem] text-[var(--lab-ink-2)]">
                forecast {fmtNum(endValue, meta.digits)}
                {unitShort(meta.unit)} in {quarterLabel(end)}
              </span>
            ) : null}
          </div>
        </div>
        {probeDelta !== null && Math.abs(probeDelta) >= 0.05 ? (
          <span className={`game-probe-chip ${probeDelta > 0 ? "is-up" : "is-down"}`} title="Effect of the lever under your pointer, by the end of the mission">
            {probeDelta > 0 ? "▲" : "▼"} {fmtNum(probeDelta, meta.digits, true)}
            {deltaUnit(meta.unit)}
          </span>
        ) : null}
      </header>

      <ul className="mt-1.5 flex flex-col gap-1">
        {objectives.map((o) => (
          <li key={o.id} className="flex items-start gap-1.5 text-[0.72rem] leading-snug">
            <span className={`game-status is-${statuses[o.id]}`}>{STATUS_TEXT[statuses[o.id]]}</span>
            <span className="text-[var(--lab-ink)]">
              {o.bonus ? <span className="game-star-inline" aria-label="Bonus">★</span> : null}
              {o.label}
            </span>
          </li>
        ))}
      </ul>

      <OutlookChart metric={metric} objectives={objectives} actual={actual} forecast={forecast} ghost={ghost} clock={clock} end={end} comparison={comparison} />
      {comparison && comparisonLabel ? (
        <p className="mt-0.5 text-[0.64rem] text-[var(--lab-ink-2)]">
          {comparisonLabel}, {quarterLabel(Math.min(clock + 1, end))}: {fmtNum(comparison[Math.min(clock + 1, end)][metric], meta.digits)}
          {unitShort(meta.unit)}
        </p>
      ) : null}

      {meta.explain && clock > 0 ? (
        <div className="mt-1">
          <button
            type="button"
            className="game-why"
            aria-expanded={why}
            onClick={() => {
              if (!why) sound.play("pluck");
              setWhy((v) => !v);
            }}
          >
            {why ? "Hide" : "Why did it move?"}
          </button>
          {why ? <WhyBars metric={metric} state={actual[clock]} prev={actual[clock - 1]} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function WhyBars({ metric, state, prev }: { metric: MetricKey; state: QuarterState; prev: QuarterState }) {
  const meta = GAME_METRICS[metric];
  if (!meta.explain) return null;
  const { parts, subject, unit } = explain(meta.explain, state);
  const total = meta.explain === "growth" ? state.gap - prev.gap : meta.explain === "infl" ? state.infl - prev.infl : state.debt - prev.debt;
  const max = Math.max(0.1, ...parts.map((p) => Math.abs(p.value)));
  return (
    <div className="game-why-panel">
      <p className="mb-1.5 text-[0.7rem] leading-snug text-[var(--lab-ink-2)]">
        {subject} moved {fmtNum(total, 2, true)} {unit} in {state.label}. What pushed it:
      </p>
      <ul className="flex flex-col gap-1">
        {parts.slice(0, 6).map((p) => (
          <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_88px_44px] items-center gap-2 text-[0.68rem]">
            <span className="truncate" title={p.label}>{p.label}</span>
            <span className="game-why-track" aria-hidden="true">
              <span className={`game-why-bar ${p.value > 0 ? "is-pos" : "is-neg"}`} style={{ width: `${(Math.abs(p.value) / max) * 50}%`, [p.value > 0 ? "left" : "right"]: "50%" }} />
            </span>
            <span className="text-right font-mono tabular-nums">{fmtNum(p.value, 2, true)}</span>
          </li>
        ))}
      </ul>
      {metric === "growth" ? <p className="mt-1.5 text-[0.64rem] leading-snug text-[var(--lab-ink-2)]">Growth follows the output gap: when demand pushes output above its potential, growth runs faster than potential.</p> : null}
    </div>
  );
}

const W = 300;
const H = 92;
const PAD = { l: 30, r: 8, t: 8, b: 16 };

function OutlookChart({ metric, objectives, actual, forecast, ghost, clock, end, comparison }: { metric: MetricKey; objectives: Objective[]; actual: QuarterState[]; forecast: QuarterState[]; ghost: QuarterState[]; clock: number; end: number; comparison: QuarterState[] | null }) {
  const meta = GAME_METRICS[metric];
  const past = actual.slice(0, clock + 1).map((s) => s[metric]);
  const fut = clock < end ? forecast.slice(clock, end + 1).map((s) => s[metric]) : [];
  const gh = clock < end ? ghost.slice(clock, end + 1).map((s) => s[metric]) : [];
  const ghostDiffers = gh.some((v, i) => Math.abs(v - fut[i]) > 0.01);
  const comp = comparison ? comparison.slice(0, end + 1).map((s) => s[metric]) : [];
  const values = [...past, ...fut, ...(ghostDiffers ? gh : []), ...comp, ...objectives.map((o) => o.threshold)];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const x = (t: number) => PAD.l + (t / end) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (vals: number[], from: number) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(from + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  // A tick at the first quarter of each year.
  const years = Array.from({ length: Math.ceil(end / 4) }, (_, i) => 1 + i * 4).filter((t) => t < end);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 block w-full" role="img" aria-label={`${meta.label}: outturn so far and forecast to ${quarterLabel(end)}`}>
      {objectives.map((o) => {
        const yq = o.when === "year" ? ((o.year ?? 0) - getStartYear()) * 4 + 1 : 0;
        const from = o.when === "end" ? end - 0.5 : o.when === "year" ? Math.max(0.5, yq - 0.5) : Math.max(0.5, (o.from ?? 1) - 0.5);
        const to = o.when === "year" ? Math.min(end, yq + 3.5) : end;
        const yT = y(o.threshold);
        const bad = o.op === "<=" ? { y0: PAD.t, y1: yT } : { y0: yT, y1: H - PAD.b };
        return (
          <g key={o.id}>
            <rect x={x(from)} y={bad.y0} width={Math.max(2, x(to) - x(from) + (o.when === "end" ? 6 : 0))} height={Math.max(0, bad.y1 - bad.y0)} fill={o.bonus ? "color-mix(in srgb, var(--lab-warn-mark) 10%, transparent)" : "color-mix(in srgb, var(--lab-alert) 11%, transparent)"} />
            <line x1={x(from)} x2={x(to)} y1={yT} y2={yT} stroke={o.bonus ? "var(--lab-warn-mark)" : "var(--lab-alert)"} strokeWidth={1} strokeDasharray={o.bonus ? "2 2" : undefined} />
          </g>
        );
      })}
      {years.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={H - PAD.b} y2={H - PAD.b + 3} stroke="var(--lab-line-strong)" />
          <text x={x(t) + 2} y={H - 4} fontSize={8} fill="var(--lab-ink-2)">
            {getStartYear() + (t - 1) / 4}
          </text>
        </g>
      ))}
      <text x={PAD.l - 4} y={y(hi - pad) + 3} fontSize={8} textAnchor="end" fill="var(--lab-ink-2)">{fmtNum(hi - pad, meta.digits >= 1 ? 1 : 0)}</text>
      <text x={PAD.l - 4} y={y(lo + pad) + 3} fontSize={8} textAnchor="end" fill="var(--lab-ink-2)">{fmtNum(lo + pad, meta.digits >= 1 ? 1 : 0)}</text>
      {comp.length ? <path d={line(comp, 0)} fill="none" stroke="var(--lab-ink)" strokeOpacity={0.3} strokeWidth={2} strokeLinejoin="round" /> : null}
      {ghostDiffers ? <path d={line(gh, clock)} fill="none" stroke="var(--lab-ink-2)" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="1.5 3" strokeLinecap="round" /> : null}
      {fut.length ? <path d={line(fut, clock)} fill="none" stroke="var(--lab-scenario)" strokeWidth={2} strokeDasharray="5 3.5" strokeLinecap="round" className="game-forecast-line" /> : null}
      <path d={line(past, 0)} fill="none" stroke="var(--lab-ink)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={x(clock)} x2={x(clock)} y1={PAD.t} y2={H - PAD.b} stroke="var(--lab-ink)" strokeOpacity={0.25} />
      <circle cx={x(clock)} cy={y(past[past.length - 1])} r={3.5} fill="var(--lab-ink)" stroke="var(--lab-paper)" strokeWidth={1.5} />
    </svg>
  );
}
