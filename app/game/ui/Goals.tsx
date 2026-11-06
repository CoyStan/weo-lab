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
import { Valence, type Tone } from "./Valence";

const DECOMPOSABLE = new Set<string>(DECOMP_METRICS.map((m) => m.key));

const STATUS_TEXT: Record<ObjectiveStatus, string> = { met: "Met", failed: "Missed", "on-track": "On track", "at-risk": "At risk" };
/** Worst first: the verdict a goal card leads with. */
const STATUS_RANK: Record<ObjectiveStatus, number> = { failed: 0, "at-risk": 1, "on-track": 2, met: 3 };

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
      {comparisonLabel ? (
        <p className="game-goal-key">
          <span><i className="is-comp" /> {comparisonLabel}</span>
        </p>
      ) : null}
    </div>
  );
}

/** The objective a card is judged on: the first non-bonus one, else the first. */
const mainObjective = (objectives: Objective[]) => objectives.find((o) => !o.bonus) ?? objectives[0];
const goalText = (o: Objective | undefined, digits: number) => (o ? `goal\u00a0${o.op === "<=" ? "≤" : "≥"}\u00a0${fmtNum(o.threshold, digits)}` : "");

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

  const verdict: ObjectiveStatus | undefined = judged.length ? (judged.map((o) => statuses[o.id]).sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0]) : undefined;

  return (
    <section className={`game-goal is-${worst}`} aria-label={meta.label}>
      {/* One verdict per goal, first: the status word and its square. Everything under it is subordinate. */}
      <div className="game-goal-head">
        <h3 className="game-goal-title" title={meta.plain}>{meta.label}</h3>
        {verdict ? <span className={`game-status game-goal-verdict is-${verdict}`}>{STATUS_TEXT[verdict]}</span> : null}
      </div>
      <div className="game-goal-figures">
        {clock < end ? (
          <span className="game-goal-fc">
            <small>{quarterLabel(end)}&nbsp;forecast</small>
            <span className="game-goal-value is-hero tabular-nums"><TweenNum value={endValue} digits={meta.digits} /></span>
            <span className="game-goal-unit">{unit}</span>
          </span>
        ) : null}
        <span className="game-goal-side">
          {main ? <span className="game-goal-target">{goalText(main, meta.digits)}</span> : null}
          <span className="game-goal-now">
            <small>Now</small> <span className="tabular-nums"><TweenNum value={now} digits={meta.digits} /></span>
            {unit === "%" ? "%" : `\u00a0${unit}`}
          </span>
        </span>
      </div>

      <ul className="game-goal-sub">
        {judged.length > 1
          ? judged.map((o) => (
              <li key={o.id} className="game-goal-part" title={o.label}>
                <span className={`game-goal-star-state is-${statuses[o.id]}`}>{STATUS_TEXT[statuses[o.id]].toLowerCase()}</span> {o.label}
              </li>
            ))
          : null}
        {stars.map((o) => (
          <li key={o.id} className={`game-goal-bonus is-${statuses[o.id]}`}>
            <Glyph name="star" label="Extra star" /> Bonus: {o.label.charAt(0).toLowerCase() + o.label.slice(1)}:{" "}
            <span className="game-goal-star-state">{STATUS_TEXT[statuses[o.id]].toLowerCase()}</span>
          </li>
        ))}
        <li className="game-goal-move" aria-live="polite">
          {probeDelta !== null ? (
            Math.abs(probeDelta) >= 0.05 ? (
              <span className={`game-probe-chip ${moveTone(objectives, probeDelta)}`} title="Effect of the lever under your pointer, by the end of the mission">
                <small>Try it</small>
                <Glyph name={probeDelta > 0 ? "up" : "down"} /> {fmtNum(Math.abs(probeDelta), meta.digits)}
                {deltaUnit(meta.unit)}
                <Valence tone={toneOf(objectives, probeDelta)} />
              </span>
            ) : (
              <span className="game-probe-chip is-neutral"><small>Try it</small> no change</span>
            )
          ) : clock < end && Math.abs(moveDelta) >= 0.05 ? (
            <MoveChip metric={metric} objectives={objectives} delta={moveDelta} end={end} />
          ) : null}
        </li>
      </ul>

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
 * goal figures. The ink triangle gives the direction; the square and word after it
 * say whether that helps or hurts the goal.
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
      <Valence tone={toneOf(objectives, delta)} />
    </span>
  );
}

function toneOf(objectives: Objective[], d: number): Tone {
  const o = mainObjective(objectives);
  if (!o || Math.abs(d) < 0.05) return "neutral";
  return (o.op === "<=" ? d < 0 : d > 0) ? "good" : "bad";
}

const moveTone = (objectives: Objective[], d: number) => `is-${toneOf(objectives, d)}`;

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

const H = 84;
const PAD = { l: 28, r: 94, t: 8, b: 20 };
const FONT = 14;
/** Words at the line ends, in place of a legend; "no change" is the framework's "had you changed nothing". */
const GUTTER_GAP = 15;

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

/** Spread labels in a column so no two sit closer than `gap`, keeping each near its own line. */
function dodge<T extends { y: number }>(items: T[], gap: number, lo: number, hi: number): T[] {
  const out = items.map((it) => ({ ...it })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < out.length; i++) if (out[i].y - out[i - 1].y < gap) out[i].y = out[i - 1].y + gap;
  const over = out.length ? out[out.length - 1].y - hi : 0;
  if (over > 0) for (const it of out) it.y -= over;
  for (let i = 0; i < out.length; i++) out[i].y = Math.max(lo + i * gap, out[i].y);
  return out;
}

/** A goal's chart outside the goal column (the recap): reads the turn itself. */
export function GoalChart({ metric, width = 300 }: { metric: MetricKey; width?: number }) {
  const { mission, actual, forecast, forecastStart, clock, comparison } = useTurn();
  const objectives = mission.objectives.filter((o) => o.metric === metric);
  return <OutlookChart metric={metric} objectives={objectives} actual={actual} forecast={forecast} ghost={forecastStart} clock={clock} end={mission.quarters} comparison={comparison} width={width} />;
}

function OutlookChart({ metric, objectives, actual, forecast, ghost, clock, end, comparison, width: W = 300 }: { metric: MetricKey; objectives: Objective[]; actual: QuarterState[]; forecast: QuarterState[]; ghost: QuarterState[]; clock: number; end: number; comparison: QuarterState[] | null; width?: number }) {
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
  const judged = objectives.filter((o) => !o.bonus);
  // Words at the right-hand ends of the lines, dodged so they never collide.
  const gutter = dodge(
    [
      ...judged.slice(0, 1).map((o) => ({ key: "goal", y: y(o.threshold) + 5, text: `goal ${o.op === "<=" ? "≤" : "≥"} ${fmtNum(o.threshold, meta.digits)}`, fill: "var(--lab-ink)", weight: 700 })),
      ...(fut.length ? [{ key: "fc", y: y(last) + 5, text: fmtNum(last, meta.digits), sub: " forecast", fill: "var(--lab-scenario)", weight: 700 }] : []),
      ...(ghostDiffers ? [{ key: "gh", y: y(gh[gh.length - 1]) + 5, text: "no change", fill: "var(--lab-ink-2)", weight: 400 }] : []),
    ],
    GUTTER_GAP,
    PAD.t + 10,
    H - PAD.b + 4,
  );
  const lastPast = past[past.length - 1];
  // "so far" above the past line's end, or under it when the forecast leaves upward.
  const soFarBelow = fut.length > 1 && fut[1] > lastPast;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="game-outlook mt-1.5 block w-full" role="img" aria-label={`${meta.label}: outturn so far and forecast to ${quarterLabel(end)}, ending at ${fmtNum(last, meta.digits)}${main ? `; ${goalText(main, meta.digits)}` : ""}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--lab-line)" strokeWidth={1} />
          <text x={PAD.l - 5} y={y(t) + 5} fontSize={FONT - 1} textAnchor="end" fill="var(--lab-ink-2)">{fmtNum(t, tickDigits)}</text>
        </g>
      ))}
      {objectives.map((o) => {
        const yT = y(o.threshold);
        // The goal: a solid ink rule across the chart, labelled in the gutter; a bonus target is dotted.
        return <line key={o.id} x1={PAD.l} x2={W - PAD.r + 2} y1={yT} y2={yT} stroke="var(--lab-ink)" strokeOpacity={o.bonus ? 0.45 : 1} strokeWidth={o.bonus ? 1 : 1.5} strokeDasharray={o.bonus ? "2 3" : undefined} />;
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--lab-ink)" strokeWidth={1} />
      {years.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="var(--lab-ink)" />
          <text x={x(t) + 3} y={H - 4} fontSize={FONT - 1} fill="var(--lab-ink-2)">
            {getStartYear() + (t - 1) / 4}
          </text>
        </g>
      ))}
      {comp.length ? <path d={line(comp, 0)} fill="none" stroke="var(--lab-ink)" strokeOpacity={0.3} strokeWidth={2} strokeLinejoin="round" /> : null}
      {ghostDiffers ? <path d={line(gh, clock)} fill="none" stroke="var(--lab-ink-2)" strokeWidth={1.25} strokeDasharray="1.5 3" strokeLinecap="round" /> : null}
      {fut.length ? <path d={line(fut, clock)} fill="none" stroke="var(--lab-scenario)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" className="game-forecast-line" /> : null}
      <path d={line(past, 0)} fill="none" stroke="var(--lab-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(clock)} cy={y(lastPast)} r={3.5} fill="var(--lab-ink)" stroke="var(--lab-paper)" strokeWidth={1.5} />
      {clock >= 2 ? (
        <text x={clock / end < 0.3 ? x(clock) + 6 : clock >= end ? x(clock) - 6 : x(clock)} y={soFarBelow ? Math.min(H - PAD.b - 3, y(lastPast) + 15) : Math.max(PAD.t + 9, y(lastPast) - 7)} fontSize={FONT - 1} textAnchor={clock / end < 0.3 ? "start" : clock >= end ? "end" : "middle"} fill="var(--lab-ink)" stroke="var(--lab-paper)" strokeWidth={3} paintOrder="stroke">
          so far
        </text>
      ) : null}
      {fut.length ? <circle cx={x(end)} cy={y(last)} r={4} fill="var(--lab-scenario)" stroke="var(--lab-paper)" strokeWidth={1.5} /> : null}
      {gutter.map((g) => (
        <text key={g.key} x={W - PAD.r + 8} y={g.y} fontSize={FONT} fontWeight={g.weight} textAnchor="start" fill={g.fill}>
          {g.text}
          {"sub" in g && g.sub ? <tspan fontWeight={400}>{g.sub}</tspan> : null}
        </text>
      ))}
    </svg>
  );
}
