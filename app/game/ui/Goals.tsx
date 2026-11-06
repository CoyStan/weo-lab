"use client";

import { useState } from "react";
import { getStartYear, quarterLabel } from "../../model/economy";
import type { QuarterState } from "../../model/types";
import { sound } from "../audio";
import { explain } from "../explain";
import { deltaUnit, fmtNum, GAME_METRICS, unitShort } from "../metrics";
import type { MetricKey, Objective, ObjectiveStatus } from "../missions";
import { useProbeEffect, useTurn } from "../useTurn";
import { useGame } from "../store";
import { DECOMP_METRICS, type DecompMetric } from "../decompose";
import { DUR, useTween } from "./useTween";
import Glyph from "./Glyph";

const DECOMPOSABLE = new Set<string>(DECOMP_METRICS.map((m) => m.key));

const STATUS_TEXT: Record<ObjectiveStatus, string> = { met: "Met", failed: "Missed", "on-track": "On track", "at-risk": "At risk" };

export default function Goals() {
  const { mission, actual, forecast, forecastStart, clock, statuses, comparison, comparisonLabel } = useTurn();
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  const effect = useProbeEffect(metrics);

  return (
    <div className="flex flex-col gap-2.5">
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
      <p className="game-goal-key">
        <span><i className="is-actual" /> So far</span>
        <span><i className="is-forecast" /> Your forecast</span>
        {comparisonLabel ? <span><i className="is-comp" /> {comparisonLabel}</span> : null}
        <span><i className="is-goal" /> Goal</span>
      </p>
    </div>
  );
}

/** The objective a card is judged on: the first non-bonus one, else the first. */
const mainObjective = (objectives: Objective[]) => objectives.find((o) => !o.bonus) ?? objectives[0];
const goalText = (o: Objective | undefined, digits: number) => (o ? `goal ${o.op === "<=" ? "≤" : "≥"}${fmtNum(o.threshold, digits)}` : "");

function GoalCard({ metric, objectives, statuses, actual, forecast, ghost, clock, end, probeDelta, comparison, comparisonLabel }: { metric: MetricKey; objectives: Objective[]; statuses: Record<string, ObjectiveStatus>; actual: QuarterState[]; forecast: QuarterState[]; ghost: QuarterState[]; clock: number; end: number; probeDelta: number | null; comparison: QuarterState[] | null; comparisonLabel: string | null }) {
  const meta = GAME_METRICS[metric];
  const [why, setWhy] = useState(false);
  const setFramework = useGame((s) => s.setFramework);
  const now = actual[clock][metric];
  const endValue = clock >= end ? actual[end][metric] : forecast[end][metric];
  const worst = objectives.some((o) => statuses[o.id] === "failed" && !o.bonus) ? "failed" : objectives.some((o) => statuses[o.id] === "at-risk" && !o.bonus) ? "at-risk" : "ok";
  const unit = unitShort(meta.unit).trim() || meta.unit;
  const main = mainObjective(objectives);
  const judged = objectives.filter((o) => !o.bonus);
  const stars = objectives.filter((o) => o.bonus);
  const moveDelta = clock < end ? forecast[end][metric] - ghost[end][metric] : 0;

  return (
    <section className={`game-goal is-${worst}`} aria-label={meta.label}>
      <h3 className="game-goal-title" title={meta.plain}>{meta.label}</h3>
      <div className="game-goal-figures">
        {clock < end ? (
          <span className="game-goal-fc">
            <small>{quarterLabel(end)} forecast</small>
            <span className="game-goal-value is-hero tabular-nums"><TweenNum value={endValue} digits={meta.digits} /></span>
            <span className="game-goal-unit">{unit}</span>
          </span>
        ) : null}
        <span className="game-goal-side">
          {main ? <span className="game-goal-target">{goalText(main, meta.digits)}</span> : null}
          <span className="game-goal-now">
            <small>Now</small> <span className="tabular-nums"><TweenNum value={now} digits={meta.digits} /></span>
            {unit === "%" ? "%" : ` ${unit}`}
          </span>
        </span>
      </div>
      <div className="game-goal-move" aria-live="polite">
        {probeDelta !== null ? (
          Math.abs(probeDelta) >= 0.05 ? (
            <span className={`game-probe-chip ${moveTone(objectives, probeDelta)}`} title="Effect of the lever under your pointer, by the end of the mission">
              <small>Try it</small>
              <Glyph name={probeDelta > 0 ? "up" : "down"} /> {fmtNum(Math.abs(probeDelta), meta.digits)}
              {deltaUnit(meta.unit)}
            </span>
          ) : (
            <span className="game-probe-chip is-neutral"><small>Try it</small> no change</span>
          )
        ) : clock < end && Math.abs(moveDelta) >= 0.05 ? (
          <MoveChip metric={metric} objectives={objectives} delta={moveDelta} end={end} />
        ) : null}
      </div>

      <ul className="game-goal-lines">
        {judged.map((o) => (
          <li key={o.id}>
            <span className={`game-status is-${statuses[o.id]}`}>{STATUS_TEXT[statuses[o.id]]}</span>
            <span className="game-goal-label">{o.label}</span>
          </li>
        ))}
      </ul>
      {stars.length ? (
        <ul className="game-goal-stars" aria-label="Extra stars">
          {stars.map((o) => (
            <li key={o.id} className={`is-${statuses[o.id]}`}>
              <Glyph name="star" label="Extra star" />
              <span>{o.label}</span>
              <span className="game-goal-star-state">· {STATUS_TEXT[statuses[o.id]].toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <OutlookChart metric={metric} objectives={objectives} actual={actual} forecast={forecast} ghost={ghost} clock={clock} end={end} comparison={comparison} />
      {comparison && comparisonLabel ? (
        <p className="game-goal-note">
          {comparisonLabel}, {quarterLabel(Math.min(clock + 1, end))}: {fmtNum(comparison[Math.min(clock + 1, end)][metric], meta.digits)}
          {unitShort(meta.unit)}
        </p>
      ) : null}

      {(meta.explain && clock > 0) || DECOMPOSABLE.has(metric) ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3">
          {meta.explain && clock > 0 ? (
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
          ) : null}
          {DECOMPOSABLE.has(metric) ? (
            <button type="button" className="game-why" onClick={() => setFramework(true, metric as DecompMetric)} title="Split the whole path into shocks and your instruments">
              Break it down: shocks vs. policy
            </button>
          ) : null}
          {why && clock > 0 ? <div className="w-full"><WhyBars metric={metric} state={actual[clock]} prev={actual[clock - 1]} /></div> : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Phones: the goals sit below the levers, so a strip above the End bar shows what the
 * lever is doing to each judged forecast, easing as it moves.
 */
export function MoveStrip() {
  const { mission, forecast, forecastStart, clock, statuses } = useTurn();
  const end = mission.quarters;
  if (clock >= end) return null;
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  return (
    <div className="game-move-strip" aria-label="Your move: the forecast for each goal">
      {metrics.map((metric) => {
        const meta = GAME_METRICS[metric];
        const objectives = mission.objectives.filter((o) => o.metric === metric);
        const main = mainObjective(objectives);
        const status = main ? statuses[main.id] : undefined;
        const d = forecast[end][metric] - forecastStart[end][metric];
        const value = forecast[end][metric];
        return (
          <span key={metric} className="game-move-strip-item">
            <b>{meta.label.replace("Public ", "").replace("Unemployment", "Jobless")}</b> <span className="tabular-nums"><TweenNum value={value} digits={meta.digits} /></span>
            {Math.abs(d) >= 0.05 ? (
              <span className={`game-move-strip-d ${moveTone(objectives, d)}`}>
                <Glyph name={d > 0 ? "up" : "down"} />
                <TweenNum value={Math.abs(d)} digits={meta.digits} />
              </span>
            ) : null}
            {status ? <span className={`game-status is-${status}`}>{STATUS_TEXT[status].toLowerCase()}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

/** A goal figure that eases to its new value when a lever or the clock moves it. */
function TweenNum({ value, digits }: { value: number; digits: number }) {
  return <>{fmtNum(useTween(value), digits)}</>;
}

/**
 * "Your move": what this quarter's changes do by the end. The number counts in
 * from 0 when the chip appears and eases as a lever moves, in step with the
 * goal figures. The triangle gives the direction; the colour says whether that
 * helps or hurts the goal.
 */
function MoveChip({ metric, objectives, delta, end }: { metric: MetricKey; objectives: Objective[]; delta: number; end: number }) {
  const meta = GAME_METRICS[metric];
  const tween = useTween(delta, DUR, 0);
  // While a sign flip eases through zero, never show a number on the wrong side of the arrow.
  const shown = Math.sign(tween) === Math.sign(delta) ? tween : 0;
  return (
    <span className={`game-move-chip ${moveTone(objectives, delta)}`} title={`What this quarter's changes do to ${meta.label.toLowerCase()} by ${quarterLabel(end)}`}>
      <small>Your move</small>
      <Glyph name={delta > 0 ? "up" : "down"} /> {fmtNum(Math.abs(shown), meta.digits)}
      {deltaUnit(meta.unit)}
    </span>
  );
}

function moveTone(objectives: Objective[], d: number): string {
  const o = mainObjective(objectives);
  if (!o || Math.abs(d) < 0.05) return "is-neutral";
  return (o.op === "<=" ? d < 0 : d > 0) ? "is-good" : "is-bad";
}

function WhyBars({ metric, state, prev }: { metric: MetricKey; state: QuarterState; prev: QuarterState }) {
  const meta = GAME_METRICS[metric];
  if (!meta.explain) return null;
  const { parts, subject, unit } = explain(meta.explain, state);
  const total = meta.explain === "growth" ? state.gap - prev.gap : meta.explain === "infl" ? state.infl - prev.infl : state.debt - prev.debt;
  const max = Math.max(0.1, ...parts.map((p) => Math.abs(p.value)));
  return (
    <div className="game-why-panel">
      <p className="mb-1.5 text-(length:--t-sm) leading-snug text-[var(--lab-ink-2)]">
        {subject} moved {fmtNum(total, 2, true)} {unit} in {state.label}. What pushed it:
      </p>
      <ul className="flex flex-col gap-1">
        {parts.slice(0, 6).map((p) => (
          <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_88px_44px] items-center gap-2 text-(length:--t-xs)">
            <span className="truncate" title={p.label}>{p.label}</span>
            <span className="game-why-track" aria-hidden="true">
              <span className={`game-why-bar ${p.value > 0 ? "is-pos" : "is-neg"}`} style={{ width: `${(Math.abs(p.value) / max) * 50}%`, [p.value > 0 ? "left" : "right"]: "50%" }} />
            </span>
            <span className="text-right font-mono tabular-nums">{fmtNum(p.value, 2, true)}</span>
          </li>
        ))}
      </ul>
      {metric === "growth" ? <p className="mt-1.5 text-(length:--t-sm) leading-snug text-[var(--lab-ink-2)]">Growth follows the output gap: when demand pushes output above its potential, growth runs faster than potential.</p> : null}
    </div>
  );
}

const W = 300;
const H = 132;
const PAD = { l: 30, r: 44, t: 10, b: 22 };
const FONT = 15;

/** Two or three round ticks across [lo, hi] (4, 6, 8 rather than the series' own extremes). */
function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  for (const step of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100]) {
    const first = Math.ceil(lo / step) * step;
    const n = Math.floor((hi - first) / step + 1e-9) + 1;
    if (n <= 3 && span > 0) return Array.from({ length: n }, (_, i) => +(first + i * step).toFixed(4));
  }
  return [lo, hi];
}

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
  const pad = (hi - lo) * 0.1;
  lo -= pad;
  hi += pad;
  const x = (t: number) => PAD.l + (t / end) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (vals: number[], from: number) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(from + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  // A tick at the first quarter of each year.
  const years = Array.from({ length: Math.ceil(end / 4) }, (_, i) => 1 + i * 4).filter((t) => t < end);
  const ticks = niceTicks(lo, hi);
  const tickDigits = ticks.some((t) => Math.abs(t - Math.round(t)) > 1e-6) ? 1 : 0;
  const last = fut.length ? fut[fut.length - 1] : past[past.length - 1];
  const main = mainObjective(objectives);
  // The end label sits on the side of the line away from the goal, so the two never touch.
  const labelAbove = main ? last >= main.threshold : true;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="game-outlook mt-1.5 block w-full" role="img" aria-label={`${meta.label}: outturn so far and forecast to ${quarterLabel(end)}, ending at ${fmtNum(last, meta.digits)}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--lab-line)" strokeWidth={1} />
          <text x={PAD.l - 5} y={y(t) + 5} fontSize={FONT} textAnchor="end" fill="var(--lab-ink-2)">{fmtNum(t, tickDigits)}</text>
        </g>
      ))}
      {objectives.map((o) => {
        const yq = o.when === "year" ? ((o.year ?? 0) - getStartYear()) * 4 + 1 : 0;
        const from = o.when === "end" ? end - 1 : o.when === "year" ? Math.max(0.5, yq - 0.5) : Math.max(0.5, (o.from ?? 1) - 0.5);
        const to = o.when === "year" ? Math.min(end, yq + 3.5) : end;
        const yT = y(o.threshold);
        return (
          <g key={o.id}>
            {/* The goal: a faint hairline across the chart, solid where it is judged. */}
            <line x1={PAD.l} x2={W - PAD.r} y1={yT} y2={yT} stroke="var(--lab-ink)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray={o.bonus ? "2 3" : undefined} />
            {!o.bonus ? <line x1={x(from)} x2={x(to) + 4} y1={yT} y2={yT} stroke="var(--lab-ink)" strokeWidth={1.5} /> : null}
            {!o.bonus ? (
              <text x={W - PAD.r + 6} y={yT + 5} fontSize={FONT} fontWeight={700} textAnchor="start" fill="var(--lab-ink)">
                {o.op === "<=" ? "≤" : "≥"}
                {fmtNum(o.threshold, meta.digits)}
              </text>
            ) : null}
          </g>
        );
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--lab-ink)" strokeWidth={1} />
      {years.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="var(--lab-ink)" />
          <text x={x(t) + 3} y={H - 4} fontSize={FONT} fill="var(--lab-ink-2)">
            {getStartYear() + (t - 1) / 4}
          </text>
        </g>
      ))}
      {comp.length ? <path d={line(comp, 0)} fill="none" stroke="var(--lab-ink)" strokeOpacity={0.3} strokeWidth={2} strokeLinejoin="round" /> : null}
      {ghostDiffers ? <path d={line(gh, clock)} fill="none" stroke="var(--lab-ink)" strokeOpacity={0.3} strokeWidth={1} /> : null}
      {fut.length ? <path d={line(fut, clock)} fill="none" stroke="var(--lab-scenario)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="game-forecast-line" /> : null}
      <path d={line(past, 0)} fill="none" stroke="var(--lab-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(clock)} cy={y(past[past.length - 1])} r={3.5} fill="var(--lab-ink)" stroke="var(--lab-paper)" strokeWidth={1.5} />
      {fut.length ? (
        <>
          <circle cx={x(end)} cy={y(last)} r={3.5} fill="var(--lab-scenario)" stroke="var(--lab-paper)" strokeWidth={1.5} />
          <text x={x(end) - 6} y={Math.min(H - PAD.b - 4, Math.max(PAD.t + 12, labelAbove ? y(last) - 8 : y(last) + 18))} fontSize={FONT} fontWeight={700} textAnchor="end" fill="var(--lab-scenario)" stroke="var(--lab-paper)" strokeWidth={3} paintOrder="stroke">
            {fmtNum(last, meta.digits)}
          </text>
        </>
      ) : null}
    </svg>
  );
}
