"use client";

// The goal chart: one metric from the mission's start to its end.
//
//   thick ink line     what has happened
//   coloured line      the staff forecast with the levers as they are now
//   dotted line        the forecast had this quarter's levers not moved
//   tinted wedge       the gap between the two: what the player's move does, and when
//   gate / fence       the goal: a gate to land in at a date, or a fence to stay clear of
//
// Drawn in real pixels (the box is measured), so type is the same size at any width.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { quarterLabel } from "../model/economy";
import type { QuarterState } from "../model/types";
import { yearQuarters, type MetricKey, type Mission, type Objective } from "../game/missions";
import { fmtNum, GAME_METRICS, unitShort } from "../game/metrics";
import { useSettings } from "../game/settings";

export function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // clientWidth is in the element's own layout pixels, so the chart stays right when the screen is zoomed for a TV.
    const read = () => {
      const r = { width: el.clientWidth, height: el.clientHeight };
      setBox((b) => (Math.abs(b.w - r.width) < 0.5 && Math.abs(b.h - r.height) < 0.5 ? b : { w: r.width, h: r.height }));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/** Ease numbers toward their targets (the forecast bending under a lever). Arrays keep their length. */
export function useEased(target: number[], ms = 260): number[] {
  const reduced = useSettings((s) => s.reducedMotion);
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const live = useRef(target);
  const key = target.map((v) => v.toFixed(4)).join(",");
  useEffect(() => {
    if (reduced || live.current.length !== target.length) {
      live.current = target;
      setShown(target);
      return;
    }
    from.current = live.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const next = target.map((v, i) => from.current[i] + (v - from.current[i]) * e);
      live.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key, reduced, ms]);
  return shown.length === target.length ? shown : target;
}

function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

export type ChartLine = { label: string; values: number[]; tone: "compare" | "nothing" | "advisor" };

export default function GoalChart({
  mission,
  metric,
  actual,
  forecast,
  ghost,
  clock,
  now = clock,
  extra = [],
  height = 220,
  compact = false,
}: {
  mission: Mission;
  metric: MetricKey;
  actual: QuarterState[];
  forecast: QuarterState[];
  /** The forecast without this quarter's moves; null hides it. */
  ghost: QuarterState[] | null;
  clock: number;
  /** Where "today" is drawn; a fraction between two quarters while a quarter plays out. */
  now?: number;
  /** Whole-mission lines to compare against (history, doing nothing). */
  extra?: ChartLine[];
  height?: number;
  compact?: boolean;
}) {
  const [ref, box] = useBox<HTMLDivElement>();
  const uid = useId().replace(/:/g, "");
  const meta = GAME_METRICS[metric];
  const end = mission.quarters;
  const objectives = mission.objectives.filter((o) => o.metric === metric);
  const unit = unitShort(meta.unit);

  // One series over the whole mission: outturn up to the clock, forecast after it.
  const lineTarget: number[] = [];
  for (let t = 0; t <= end; t++) lineTarget.push((t <= clock ? actual[t] : forecast[t])[metric]);
  const ghostTarget: number[] = [];
  for (let t = 0; t <= end; t++) ghostTarget.push(ghost ? (t <= clock ? actual[t] : ghost[t])[metric] : lineTarget[t]);

  // The scale is eased with the lines, so a big move never snaps the axis.
  const all = [...lineTarget, ...ghostTarget, ...objectives.map((o) => o.threshold)];
  const mainLo = Math.min(...all);
  const mainHi = Math.max(...all);
  // Comparison lines may widen the scale, but only so far: a path that ran off a cliff must not flatten the player's own.
  const reach = Math.max(mainHi - mainLo, meta.digits === 0 ? 20 : 1) * 0.35;
  const others = extra.flatMap((x) => x.values.slice(0, end + 1));
  const rawLo = Math.max(mainLo - reach, Math.min(mainLo, ...others));
  const rawHi = Math.min(mainHi + reach, Math.max(mainHi, ...others));
  const step = niceStep(Math.max(rawHi - rawLo, meta.digits === 0 ? 20 : 1), compact ? 3 : 4);
  const loT = Math.floor((rawLo - step * 0.15) / step) * step;
  const hiT = Math.ceil((rawHi + step * 0.15) / step) * step;
  const eased = useEased([...lineTarget, ...ghostTarget, loT, hiT]);
  const line = eased.slice(0, end + 1);
  const ghostLine = eased.slice(end + 1, 2 * (end + 1));
  const lo = eased[2 * (end + 1)];
  const hi = eased[2 * (end + 1) + 1];

  const W = box.w;
  const H = height;
  const PAD = { l: compact ? 34 : 42, r: compact ? 66 : 80, t: 14, b: 26 };
  const x = (t: number) => PAD.l + ((W - PAD.l - PAD.r) * t) / end;
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - lo) / (hi - lo || 1));
  const at = (vals: number[], t: number) => {
    const i = Math.min(end, Math.max(0, Math.floor(t)));
    const j = Math.min(end, i + 1);
    return vals[i] + (vals[j] - vals[i]) * (t - i);
  };
  const pathOf = (vals: number[], from: number, to: number) => {
    if (to <= from) return "";
    const pts: string[] = [`M${x(from).toFixed(1)},${y(at(vals, from)).toFixed(1)}`];
    for (let t = Math.floor(from) + 1; t < to; t++) pts.push(`L${x(t).toFixed(1)},${y(vals[t]).toFixed(1)}`);
    pts.push(`L${x(to).toFixed(1)},${y(at(vals, to)).toFixed(1)}`);
    return pts.join(" ");
  };

  const ticks: number[] = [];
  for (let v = Math.ceil(loT / step) * step; v <= hiT + 1e-9; v += step) ticks.push(+v.toFixed(6));
  const startYear = mission.startYear ?? 2026;
  const years: { t: number; label: string }[] = [];
  for (let t = 1; t <= end; t += 4) years.push({ t, label: String(startYear + (t - 1) / 4) });

  const moved = ghost !== null && lineTarget.some((v, t) => t > clock && Math.abs(v - ghostTarget[t]) > 0.005);
  const wedge = moved ? `${pathOf(line, now, end)} ${[...Array(end - Math.ceil(now) + 1).keys()].map((k) => end - k).map((t) => `L${x(t).toFixed(1)},${y(ghostLine[t]).toFixed(1)}`).join(" ")} L${x(now).toFixed(1)},${y(at(ghostLine, now)).toFixed(1)} Z` : "";

  // End labels: the forecast's landing value, and the ghost's when it differs; kept from overlapping.
  const endV = lineTarget[end];
  const ghostV = ghostTarget[end];
  let endY = y(line[end]);
  let ghostY = y(ghostLine[end]);
  const showGhostLabel = moved && Math.abs(endV - ghostV) >= 0.5 * Math.pow(10, -meta.digits);
  if (showGhostLabel && Math.abs(endY - ghostY) < 17) {
    const mid = (endY + ghostY) / 2;
    const up = endY <= ghostY;
    endY = mid + (up ? -8.5 : 8.5);
    ghostY = mid + (up ? 8.5 : -8.5);
  }
  const clampY = (v: number) => Math.min(H - PAD.b - 2, Math.max(PAD.t + 6, v));

  // An every-quarter goal is decided at its worst quarter still ahead: mark it.
  const every = objectives.find((o) => o.when === "every" && !o.bonus) ?? objectives.find((o) => o.when === "every");
  let worstT: number | null = null;
  if (every) {
    worstT = Math.max(1, every.from ?? 1);
    for (let t = worstT; t <= end; t++) if (every.op === "<=" ? lineTarget[t] > lineTarget[worstT] : lineTarget[t] < lineTarget[worstT]) worstT = t;
    if (worstT === end) worstT = null;
  }

  const goalLabels: { key: string; x: number; y: number; text: string; cls: string }[] = [];
  const ok = (o: Objective, v: number) => (o.op === "<=" ? v <= o.threshold + 1e-9 : v >= o.threshold - 1e-9);
  const summary = `${meta.label}: ${fmtNum(actual[clock][metric], meta.digits)}${unit} now, forecast ${fmtNum(endV, meta.digits)}${unit} by ${quarterLabel(end)}${showGhostLabel ? `, ${fmtNum(ghostV, meta.digits)}${unit} had you changed nothing this quarter` : ""}. ${objectives.map((o) => o.label).join(". ")}.`;

  return (
    <div ref={ref} className="nx-chart" style={{ height: H }}>
      {W > 40 ? (
        <svg width={W} height={H} role="img" aria-label={summary}>
          <defs>
            <pattern id={`${uid}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" className="nx-hatch" />
            </pattern>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="nx-grid" />
              <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="nx-tick">{fmtNum(v, step < 1 ? 1 : 0)}</text>
            </g>
          ))}
          {years.map((yr) => (
            <text key={yr.t} x={x(yr.t)} y={H - 7} className="nx-tick">{yr.label}</text>
          ))}

          {/* Goals: a fence to stay clear of, or a gate to land in. Each says what it is. */}
          {objectives.map((o) => {
            const yy = y(o.threshold);
            const tone = o.when === "every" ? "is-fence" : "";
            const dir = o.op === "<=" ? -1 : 1; // which way is out of bounds on screen (up for a ceiling)
            const cls = o.bonus ? "nx-goal is-bonus" : "nx-goal";
            const num = `${o.op === "<=" ? "≤" : "≥"} ${fmtNum(o.threshold, o.threshold % 1 ? 1 : 0)}`;
            const star = o.bonus ? "★ " : "";
            // The label sits on the allowed side of the line, clear of the forbidden band.
            const labelY = dir < 0 ? yy + 16 : yy - 7;
            if (o.when === "every") {
              const x0 = x(Math.max(0, (o.from ?? 1) - 0.5));
              return (
                <g key={o.id} className={cls}>
                  <rect x={x0} width={x(end) - x0} y={dir < 0 ? yy - 14 : yy} height={14} fill={`url(#${uid}-hatch)`} className="nx-fence" />
                  <line x1={x0} x2={x(end)} y1={yy} y2={yy} className="nx-goal-line" />
                  {void goalLabels.push({ key: o.id, x: x(end) - 4, y: labelY, text: `${star}stay ${num}`, cls: `nx-goal-text ${tone} ${o.bonus ? "is-bonus" : ""}` })}
                </g>
              );
            }
            const qs = o.when === "year" ? yearQuarters(o, mission) : [end];
            const x0 = x(qs[0] - (o.when === "year" ? 0.45 : 0.9));
            const x1 = x(qs[qs.length - 1]) + (o.when === "year" ? x(0.45) - x(0) : 0);
            const far = dir < 0 ? H - PAD.b : PAD.t;
            return (
              <g key={o.id} className={cls}>
                <rect x={x0} width={Math.max(6, x1 - x0)} y={Math.min(yy, far)} height={Math.abs(far - yy)} className="nx-gate" />
                <line x1={x0} x2={x1} y1={yy} y2={yy} className="nx-goal-line" />
                {void goalLabels.push({ key: o.id, x: x0 - 6, y: [1, 2, 3].some((k) => Math.abs((dir < 0 ? yy + 12 : yy - 11) - y(line[Math.max(0, qs[0] - k)])) < 15) ? (dir < 0 ? yy - 7 : yy + 16) : dir < 0 ? yy + 16 : yy - 7, text: `${star}${o.when === "year" ? `${o.year} ` : "land "}${num}`, cls: `nx-goal-text ${o.bonus ? "is-bonus" : ""}` })}
              </g>
            );
          })}

          <clipPath id={`${uid}-plot`}>
            <rect x={PAD.l - 2} y={PAD.t - 2} width={Math.max(0, W - PAD.l - PAD.r + 4)} height={Math.max(0, H - PAD.t - PAD.b + 4)} />
          </clipPath>
          <g clipPath={`url(#${uid}-plot)`}>
            {extra.map((ex) => (
              <path key={ex.label} d={pathOf(ex.values, 0, end)} className={`nx-extra is-${ex.tone}`} />
            ))}
          </g>

          {moved ? <path d={wedge} className="nx-wedge" /> : null}
          {moved ? <path d={pathOf(ghostLine, now, end)} className="nx-ghost" /> : null}
          <path d={pathOf(line, now, end)} className="nx-forecast" />
          <path d={pathOf(line, 0, now)} className="nx-actual" />

          {/* Goal labels go on top of the lines, with a halo, so a line never strikes one through. */}
          {goalLabels.map((l, i) => {
            // Two goals close together (a goal and its bonus): the later label steps aside.
            const clash = goalLabels.slice(0, i).some((k) => Math.abs(k.y - l.y) < 15 && Math.abs(k.x - l.x) < 90);
            return clash ? { ...l, y: l.y + (l.y > H / 2 ? -17 : 17) } : l;
          }).map((l) => (
            <text key={l.key} x={l.x} y={l.y} textAnchor="end" className={l.cls}>{l.text}</text>
          ))}

          {/* Today */}
          <line x1={x(now)} x2={x(now)} y1={PAD.t} y2={H - PAD.b} className="nx-today" />
          <circle cx={x(now)} cy={y(at(line, now))} r={4.5} className="nx-dot" />

          {worstT !== null && every ? (
            <g>
              <circle cx={x(worstT)} cy={y(line[worstT])} r={4} className={`nx-ring ${ok(every, lineTarget[worstT]) ? "" : "is-bad"}`} />
              <text x={Math.max(x(worstT), PAD.l + 30)} y={y(line[worstT]) + ((every.op === ">=") !== objectives.some((o) => Math.abs(y(o.threshold) - (y(line[worstT!]) + (every.op === ">=" ? 15 : -14))) < 13) ? 19 : -10)} textAnchor="middle" className="nx-mark">
                {every.op === ">=" ? "low" : "peak"} {fmtNum(lineTarget[worstT], fmtNum(lineTarget[worstT], meta.digits) === fmtNum(every.threshold, meta.digits) && Math.abs(lineTarget[worstT] - every.threshold) > 1e-9 ? meta.digits + 1 : meta.digits)}
              </text>
            </g>
          ) : null}

          {/* Landing values */}
          <circle cx={x(end)} cy={y(line[end])} r={4} className="nx-end" />
          <text x={x(end) + 9} y={clampY(endY) + 5} className="nx-endv">{fmtNum(endV, meta.digits)}{unit === "%" ? "%" : ""}</text>
          {showGhostLabel ? (
            <text x={x(end) + 9} y={clampY(ghostY) + 4} className="nx-ghostv">was {fmtNum(ghostV, meta.digits)}</text>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}

/** A row of bars: the move's effect on one metric, quarter by quarter. */
export function EffectBars({ series, from, digits, unit, highlight }: { series: number[]; from: number; digits: number; unit: string; highlight?: number }) {
  const max = Math.max(...series.map((v) => Math.abs(v)), 1e-9);
  return (
    <div className="nx-bars" role="img" aria-label={`Effect by quarter: ${series.map((v, i) => `${quarterLabel(from + i)} ${fmtNum(v, digits, true)}${unit}`).join(", ")}`}>
      {series.map((v, i) => (
        <div key={i} className={`nx-bar ${from + i === highlight ? "is-peak" : ""}`}>
          <span className="nx-bar-v">{from + i === highlight || i === 0 || i === series.length - 1 ? fmtNum(v, Math.abs(v) < 0.1 && digits === 1 ? 2 : digits, true) : ""}</span>
          <span className="nx-bar-track">
            <span className={`nx-bar-fill ${v < 0 ? "is-down" : "is-up"}`} style={{ height: `${Math.max(3, (Math.abs(v) / max) * 100)}%` }} />
          </span>
          <span className="nx-bar-q">{series.length > 9 ? (quarterLabel(from + i).endsWith("Q1") ? `'${quarterLabel(from + i).slice(2, 4)}` : i === 0 ? quarterLabel(from + i).slice(4) : "") : quarterLabel(from + i).slice(2).replace("Q", " Q")}</span>
        </div>
      ))}
    </div>
  );
}
