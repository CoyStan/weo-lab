"use client";

import { useId, useRef, useState } from "react";
import { getStartYear, HORIZON, quarterLabel } from "../model/economy";
import { fmt } from "./format";

export type ChartSeries = { key: string; label: string; color: string; dashed?: boolean; values: number[] };
export type ChartThreshold = { value: number; op: "<=" | ">="; label: string };
/** Shaded uncertainty band, e.g. the 10th–90th percentile of the risk fan. */
export type ChartBand = { lo: number[]; hi: number[]; color: string; label: string };

const W = 236;
const H = 128;
const PAD = { top: 10, right: 8, bottom: 18, left: 34 };

function niceTicks(min: number, max: number): number[] {
  const span = max - min || 1;
  const raw = span / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export default function LineChart({
  id,
  title,
  unit,
  digits,
  series,
  clock,
  thresholds = [],
  breachQuarters = [],
  focused,
  onFocus,
  band,
}: {
  id: string;
  title: string;
  unit: string;
  digits: number;
  series: ChartSeries[];
  clock: number;
  thresholds?: ChartThreshold[];
  breachQuarters?: number[];
  focused?: boolean;
  onFocus?: () => void;
  band?: ChartBand;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId();

  const all = series.flatMap((s) => s.values).concat(thresholds.map((t) => t.value), band ? [...band.lo, ...band.hi] : []);
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (max - min < 1e-6) {
    min -= 1;
    max += 1;
  }
  const padding = (max - min) * 0.1;
  min -= padding;
  max += padding;
  const ticks = niceTicks(min, max);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + (t / HORIZON) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  const pathFor = (values: number[]) => values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const breachSet = new Set(breachQuarters);
  const breachBands: { from: number; to: number }[] = [];
  for (let t = 1; t <= HORIZON; t++) {
    if (!breachSet.has(t)) continue;
    const last = breachBands[breachBands.length - 1];
    if (last && last.to === t - 1) last.to = t;
    else breachBands.push({ from: t, to: t });
  }

  const activeT = hover ?? clock;

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = Math.round(((px - PAD.left) / plotW) * HORIZON);
    setHover(Math.max(0, Math.min(HORIZON, t)));
    setShowTip(true);
  };

  const tipLeftPct = ((x(activeT) / W) * 100);

  return (
    <div
      id={id}
      className={`lab-chart relative ${focused ? "is-focus" : ""}`}
      tabIndex={0}
      role="group"
      aria-label={`${title} chart`}
      onFocus={() => {
        setShowTip(true);
        onFocus?.();
      }}
      onBlur={() => setShowTip(false)}
      onPointerLeave={() => {
        setHover(null);
        setShowTip(false);
      }}
    >
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--lab-ink-2)]">{title}</span>
        <span className="text-[0.62rem] text-[var(--lab-ink-2)]">{unit}</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onPointerMove={handlePointer} onPointerDown={handlePointer} aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        {breachBands.map((b) => (
          <rect key={`${b.from}-${b.to}`} x={x(b.from - 0.5)} y={PAD.top} width={x(b.to + 0.5) - x(b.from - 0.5)} height={plotH} fill="color-mix(in srgb, var(--lab-alert) 12%, transparent)" />
        ))}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="color-mix(in srgb, var(--lab-ink) 9%, transparent)" strokeWidth={1} />
            <text x={PAD.left - 4} y={y(v) + 3} textAnchor="end" fontSize={8} fill="var(--lab-ink-2)" className="tabular-nums">
              {fmt(v, Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : 1)}
            </text>
          </g>
        ))}
        {Array.from({ length: HORIZON / 4 + 1 }, (_, i) => i * 4).map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD.top + plotH} y2={PAD.top + plotH + 3} stroke="color-mix(in srgb, var(--lab-ink) 30%, transparent)" strokeWidth={1} />
            {t < HORIZON ? (
              <text x={x(t + 2)} y={H - 5} textAnchor="middle" fontSize={8} fill="var(--lab-ink-2)">
                {getStartYear() + t / 4}
              </text>
            ) : null}
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="color-mix(in srgb, var(--lab-ink) 30%, transparent)" strokeWidth={1} />
        {thresholds.map((th) => (
          <g key={th.label}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(th.value)} y2={y(th.value)} stroke="var(--lab-alert)" strokeWidth={1} />
            <text x={W - PAD.right} y={y(th.value) - 2} textAnchor="end" fontSize={7.5} fill="var(--lab-bad)" fontWeight={700}>
              {th.op === "<=" ? "≤" : "≥"} {th.label}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          {band ? (
            <path
              d={`${band.hi.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} ${band.lo
                .map((v, i) => [i, v] as const)
                .reverse()
                .map(([i, v]) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`)
                .join(" ")} Z`}
              fill={band.color}
              fillOpacity={0.14}
            />
          ) : null}
          {series.map((s) => (
            <path key={s.key} d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "4 3" : undefined} />
          ))}
        </g>
        <line x1={x(clock)} x2={x(clock)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--lab-ink)" strokeWidth={1} strokeOpacity={0.5} />
        {hover !== null && hover !== clock ? <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--lab-ink)" strokeWidth={1} strokeOpacity={0.25} /> : null}
        {series.map((s) => (
          <circle key={`${s.key}-dot`} cx={x(activeT)} cy={y(s.values[activeT])} r={4} fill={s.color} stroke="var(--lab-surface)" strokeWidth={2} />
        ))}
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="transparent" />
      </svg>
      {showTip ? (
        <div className="lab-tooltip" style={{ left: `min(max(${tipLeftPct}%, 4.5rem), calc(100% - 4.5rem))`, top: 22, transform: "translateX(-50%)" }} role="status">
          <div className="mb-0.5 text-[0.66rem] font-bold text-[var(--lab-ink-2)]">{quarterLabel(activeT)}</div>
          {series.map((s) => (
            <div key={s.key} className="lab-tooltip-row">
              <span className="text-[var(--lab-ink-2)]">
                <span className={`lab-tooltip-key ${s.dashed ? "is-dashed" : ""}`} style={{ color: s.color }} />
                {s.label}
              </span>
              <strong className="tabular-nums text-[var(--lab-ink)]">{fmt(s.values[activeT], digits)}</strong>
            </div>
          ))}
          {band ? (
            <div className="lab-tooltip-row">
              <span className="text-[var(--lab-ink-2)]">
                <span className="mr-1.5 inline-block h-2.5 w-3.5 rounded-sm align-middle" style={{ background: band.color, opacity: 0.3 }} />
                {band.label}
              </span>
              <strong className="tabular-nums text-[var(--lab-ink)]">
                {fmt(band.lo[activeT], digits)}–{fmt(band.hi[activeT], digits)}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
