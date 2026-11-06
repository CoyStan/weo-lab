"use client";

import { useEffect, useRef, useState } from "react";
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
      <p className="game-goal-key game-spark-key" aria-hidden="true">
        <span><i className="is-past" /> Outturn</span>
        <span><i className="is-fc" /> Forecast</span>
        <span><i className="is-ghost" /> Had you changed nothing</span>
        {comparisonLabel ? <span><i className="is-comp" /> {comparisonLabel}</span> : null}
      </p>
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
            <small>Now</small>{" "}
            <span className="tabular-nums">
              <TweenNum value={now} digits={meta.digits} />
              <span className="game-unit">{unit === "%" ? "%" : `\u00a0${unit}`}</span>
            </span>
          </span>
        </span>
      </div>

      {/* "Your move" on its own ruled line under the forecast figure: what reacts as a lever moves. */}
      <div className="game-goal-move" aria-live="polite">
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
            {/* The status word goes with the level; the helps/hurts word goes with the move. */}
            <span className="game-move-strip-level">
              <b>{meta.label.replace("Public ", "").replace("Unemployment", "Jobless")}</b> <span className="tabular-nums"><TweenNum value={value} digits={meta.digits} /></span>
              {status ? <> · <span className={`game-status is-${status}`}>{STATUS_TEXT[status].toLowerCase()}</span></> : null}
            </span>
            {Math.abs(d) >= 0.05 ? (
              <span className={`game-move-strip-d ${moveTone(objectives, d)}`}>
                <Glyph name={d > 0 ? "up" : "down"} />
                <TweenNum value={Math.abs(d)} digits={meta.digits} />
                {deltaUnit(meta.unit)} <Valence tone={toneOf(objectives, d)} />
              </span>
            ) : null}
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
export function GoalChart({ metric, height = 104 }: { metric: MetricKey; height?: number }) {
  const { mission, actual, forecast, forecastStart, clock, comparison } = useTurn();
  const objectives = mission.objectives.filter((o) => o.metric === metric);
  return <OutlookChart metric={metric} objectives={objectives} actual={actual} forecast={forecast} ghost={forecastStart} clock={clock} end={mission.quarters} comparison={comparison} height={height} />;
}

function OutlookChart({ metric, objectives, actual, forecast, ghost, clock, end, comparison, height = 120 }: { metric: MetricKey; objectives: Objective[]; actual: QuarterState[]; forecast: QuarterState[]; ghost: QuarterState[]; clock: number; end: number; comparison: QuarterState[] | null; height?: number }) {
  const meta = GAME_METRICS[metric];
  return (
    <Sparkline
      label={meta.label}
      digits={meta.digits}
      past={actual.slice(0, clock + 1).map((s) => s[metric])}
      fut={clock < end ? forecast.slice(clock, end + 1).map((s) => s[metric]) : []}
      ghost={clock < end ? ghost.slice(clock, end + 1).map((s) => s[metric]) : []}
      comp={comparison ? comparison.slice(0, end + 1).map((s) => s[metric]) : []}
      goals={objectives}
      clock={clock}
      end={end}
      height={height}
    />
  );
}

export type SparkGoal = { threshold: number; op: "<=" | ">="; bonus?: boolean };

/** The chart box's width and its font size in CSS pixels, read after layout. */
function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, fs: 15 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.getBoundingClientRect().width);
      const fs = parseFloat(getComputedStyle(el).fontSize) || 15;
      setBox((b) => (b.w === w && b.fs === fs ? b : { w, fs }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/**
 * One series chart for every screen (goal cards, the recap and the framework's Why tiles):
 * drawn in CSS pixels at the full width of its column, so no label is ever scaled down; text
 * is set at the box's font size (--t-sm). The outturn in ink, the forecast in blue, the
 * no-change path dotted (named once by the panel's key), the goal as a solid ink rule
 * labelled on the rule itself. Only the start value and the end value are labelled.
 */
export function Sparkline({ label, digits, past, fut, ghost = [], comp = [], goals = [], clock, end, height = 120 }: { label: string; digits: number; past: number[]; fut: number[]; ghost?: number[]; comp?: number[]; goals?: SparkGoal[]; clock: number; end: number; height?: number }) {
  const [ref, { w: W, fs }] = useBox<HTMLSpanElement>();
  const H = Math.max(80, height);
  const ghostDiffers = ghost.length === fut.length && ghost.some((v, i) => Math.abs(v - fut[i]) > 0.01);
  const judged = goals.filter((o) => !o.bonus);
  const values = [...past, ...fut, ...(ghostDiffers ? ghost : []), ...comp, ...goals.map((o) => o.threshold)];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  }
  const padV = (hi - lo) * 0.12;
  lo -= padV;
  hi += padV;
  const ticks = niceTicks(lo, hi);
  const tickDigits = ticks.some((t) => Math.abs(t - Math.round(t)) > 1e-6) ? 1 : 0;
  const ch = fs * 0.6;
  const last = fut.length ? fut[fut.length - 1] : past[past.length - 1];
  const endText = fmtNum(last, digits);
  const PAD = {
    l: Math.ceil(Math.max(...ticks.map((t) => fmtNum(t, tickDigits).length)) * ch + 8),
    r: Math.ceil(endText.length * ch + 14),
    t: Math.ceil(fs * 0.5),
    b: Math.ceil(fs + 8),
  };
  const x = (t: number) => PAD.l + (t / end) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (vals: number[], from: number) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(from + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const years = Array.from({ length: Math.ceil(end / 4) }, (_, i) => 1 + i * 4).filter((t) => t < end);
  const lastPast = past[past.length - 1];
  const main = judged[0];
  const ariaLabel = `${label}: outturn so far and forecast, ending at ${endText}${main ? `; goal ${main.op === "<=" ? "≤" : "≥"} ${fmtNum(main.threshold, digits)}` : ""}`;
  if (!W) return <span ref={ref} className="game-spark" style={{ height: H }} role="img" aria-label={ariaLabel} />;

  // Collision pass: every label is a box that must clear the drawn series and the labels
  // placed before it; each tries its candidate spots in order and takes the first clear one.
  const series: { from: number; vals: number[] }[] = [{ from: 0, vals: past }, { from: clock, vals: fut }, ...(ghostDiffers ? [{ from: clock, vals: ghost }] : []), ...(comp.length ? [{ from: 0, vals: comp }] : [])];
  const at = (sr: { from: number; vals: number[] }, t: number) => {
    const k = t - sr.from;
    if (k < 0 || k > sr.vals.length - 1) return null;
    const a = Math.floor(k);
    const b = Math.min(sr.vals.length - 1, a + 1);
    return sr.vals[a] + (sr.vals[b] - sr.vals[a]) * (k - a);
  };
  type Box = { x: number; y: number; w: number };
  const placed: Box[] = [];
  // Horizontal rules a label must not sit on: gridlines, the baseline and the goal rules.
  const rules = [...ticks.map(y), H - PAD.b, ...goals.map((o) => y(o.threshold))];
  const hits = (b: Box, ownRule?: number) => {
    const top = b.y - fs * 0.8 - 2;
    const bottom = b.y + fs * 0.25 + 2;
    if (top < 0 || bottom > H - PAD.b + 1) return 99;
    let n = 0;
    for (const r of rules) if (r !== ownRule && r > top + 1 && r < bottom - 1) n += 2;
    for (let px = b.x - 2; px <= b.x + b.w + 2; px += 3) {
      const t = ((px - PAD.l) / (W - PAD.l - PAD.r)) * end;
      for (const sr of series) {
        const v = at(sr, t);
        if (v !== null && y(v) > top && y(v) < bottom) n++;
      }
    }
    for (const p of placed) if (b.x < p.x + p.w + 4 && p.x < b.x + b.w + 4 && Math.abs(b.y - p.y) < fs * 1.1) n += 10;
    return n;
  };
  const place = (cands: Box[], ownRule?: number) => {
    let best = cands[0];
    let score = Infinity;
    for (const c of cands) {
      const h = hits(c, ownRule);
      if (h < score) {
        best = c;
        score = h;
      }
      if (h === 0) break;
    }
    placed.push(best);
    return best;
  };
  // The start value (ink), at the first point: above it or below it.
  const startText = fmtNum(past[0], digits);
  const startW = startText.length * ch;
  const y0 = y(past[0]);
  // Never on the dot's own baseline, where the dot would read as a minus sign.
  const start = place(
    [-7, -7 - fs * 0.5, fs * 0.8 + 6, fs * 1.3 + 6].flatMap((dy) => [
      { x: x(0) + 2, y: y0 + dy, w: startW },
      { x: x(0) + 2 + fs, y: y0 + dy, w: startW },
    ]),
  );
  // The forecast's end value (blue), right of its dot, clear of the start label by 1.1em.
  const ends = dodge([{ key: "end", y: y(last) + fs * 0.35, text: endText, fill: fut.length ? "var(--lab-scenario)" : "var(--lab-ink)" }], fs * 1.1, PAD.t + fs * 0.8, H - PAD.b);
  // The goal, on its own rule and left-aligned: above it or under it, at the left, then
  // the middle, then the right of the plot, wherever no line or label crosses it.
  const goalWords = main ? `goal ${main.op === "<=" ? "≤" : "≥"} ${fmtNum(main.threshold, digits)}` : "";
  const goalW = goalWords.length * ch;
  const yT = main ? y(main.threshold) : 0;
  const plotW = W - PAD.l - PAD.r;
  const goal = main
    ? place(
        [PAD.l + 4, PAD.l + plotW * 0.4, PAD.l + plotW - goalW - 4, PAD.l + plotW * 0.2, PAD.l + plotW * 0.6]
          .filter((gx) => gx + goalW <= W - PAD.r + 2)
          .flatMap((gx) => [
            { x: gx, y: yT - 4, w: goalW },
            { x: gx, y: yT + fs * 0.8 + 3, w: goalW },
          ]),
        yT,
      )
    : null;

  return (
    <span ref={ref} className="game-spark">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, margin: 0 }} className="game-outlook" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--lab-line)" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + fs * 0.35} fontSize={fs} textAnchor="end" fill="var(--lab-ink-2)">{fmtNum(t, tickDigits)}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--lab-ink)" strokeWidth={1} />
        {years.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="var(--lab-ink)" />
            <text x={x(t) + 3} y={H - 3} fontSize={fs} fill="var(--lab-ink-2)">
              {getStartYear() + (t - 1) / 4}
            </text>
          </g>
        ))}
        {goals.map((o, i) => {
          const yT = y(o.threshold);
          // The goal: a solid ink hairline across the plot; a bonus target is dotted.
          return <line key={i} x1={PAD.l} x2={W - PAD.r} y1={yT} y2={yT} stroke="var(--lab-ink)" strokeOpacity={o.bonus ? 0.45 : 1} strokeWidth={o.bonus ? 1 : 1.25} strokeDasharray={o.bonus ? "2 3" : undefined} />;
        })}
        {comp.length ? <path d={line(comp, 0)} fill="none" stroke="var(--lab-ink)" strokeOpacity={0.3} strokeWidth={2} strokeLinejoin="round" /> : null}
        {ghostDiffers ? <path d={line(ghost, clock)} fill="none" stroke="var(--lab-ink-2)" strokeWidth={1.5} strokeDasharray="1.5 3.5" strokeLinecap="round" /> : null}
        {fut.length ? <path d={line(fut, clock)} fill="none" stroke="var(--lab-scenario)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" className="game-forecast-line" /> : null}
        <path d={line(past, 0)} fill="none" stroke="var(--lab-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <g fontSize={fs} stroke="var(--lab-paper)" strokeWidth={5} strokeLinejoin="round" paintOrder="stroke">
          <text x={start.x} y={start.y} fontWeight={600} fill="var(--lab-ink)">{startText}</text>
          {goal ? <text x={goal.x} y={goal.y} fontWeight={700} fill="var(--lab-ink)">{goalWords}</text> : null}
        </g>
        <circle cx={x(0)} cy={y0} r={3} fill="var(--lab-ink)" />
        <circle cx={x(clock)} cy={y(lastPast)} r={3.5} fill="var(--lab-ink)" stroke="var(--lab-paper)" strokeWidth={1.5} />
        {fut.length ? <circle cx={x(end)} cy={y(last)} r={4} fill="var(--lab-scenario)" stroke="var(--lab-paper)" strokeWidth={1.5} /> : null}
        {ends.map((e) => (
          <text key={e.key} x={x(end) + 8} y={e.y} fontSize={fs} fontWeight={700} fill={e.fill}>{e.text}</text>
        ))}
      </svg>
    </span>
  );
}
