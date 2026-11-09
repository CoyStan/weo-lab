"use client";

// The three gauges (inflation, growth, output gap) and the lag ribbon that
// shows when a lever's push lands, quarter by quarter.

import { useRef, type MutableRefObject } from "react";
import { useTick } from "./anim";
import { fmt, signed, type Gauge, type Move, type ShockView } from "./data";

export const INFL_MAX = 12;

type GaugeText = { x: number; y: number; title: string; g: Gauge; unit?: string; cause?: string; small?: boolean };

/** "Inflation 7.2% ▲" over "mostly the food shock (+2.0 pp)". */
export function GaugeLabel({ x, y, title, g, cause, small = false }: GaugeText) {
  const why = cause ?? (g.cause ? `${g.cause} (${signed(g.causeValue)} pp)` : "steady this quarter");
  return (
    <g className="m-gauge-label">
      <text x={x} y={y} className={`${small ? "m-t-xs" : "m-t-sm"} m-strong`}>
        {title} {fmt(g.value)}%
        {g.arrow ? <tspan className={`m-tone-${g.tone}`}> {g.arrow}</tspan> : <tspan className="m-muted"> steady</tspan>}
      </text>
      {wrap(why, small ? 21 : 32).map((line, i) => (
        <text key={i} x={x} y={y + (small ? 15 : 18) + i * 15} className="m-t-xs m-muted">
          {line}
        </text>
      ))}
    </g>
  );
}

/** Splits text into at most two lines of about `n` characters, at a space. */
function wrap(text: string, n: number): string[] {
  if (text.length <= n) return [text];
  const cut = text.lastIndexOf(" ", n);
  return cut > 0 ? [text.slice(0, cut), text.slice(cut + 1)] : [text];
}

/** A thermometer lying down: the liquid is inflation, the tick is the target, and a cost shock's push shows as its own coloured slice. */
export function Thermometer({ x, y, w, h, infl, target, shock }: { x: number; y: number; w: number; h: number; infl: number; target: number; shock: ShockView | undefined }) {
  const bulbR = h * 0.95;
  const x0 = x + bulbR * 0.7;
  const len = w - bulbR * 0.7;
  const at = (v: number) => x0 + len * Math.max(0, Math.min(1, v / INFL_MAX));
  const fillW = at(infl) - x0;
  const slice = shock && shock.size > 0.05 ? Math.min(fillW, at(infl) - at(infl - shock.size)) : 0;
  const tx = at(target);
  return (
    <g className="m-thermo">
      <rect x={x0 - 4} y={y - h / 2} width={len + 4} height={h} rx={h / 2} className="m-tank-body" />
      <circle cx={x} cy={y} r={bulbR} className="m-tank-body" />
      <circle cx={x} cy={y} r={bulbR - 4} className="m-thermo-liquid" />
      <rect x={0} y={y - h / 2 + 3} width={1} height={h - 6} className="m-thermo-liquid m-grow" style={{ transform: `translateX(${x0 - 4}px) scaleX(${fillW + 4})` }} />
      {slice > 0 ? <rect x={0} y={y - h / 2 + 3} width={1} height={h - 6} className="m-thermo-shock m-grow" style={{ transform: `translateX(${at(infl) - slice}px) scaleX(${slice})` }} /> : null}
      <rect x={x0 - 4} y={y - h / 2} width={len + 4} height={h} rx={h / 2} className="m-tank-rim" />
      <line x1={tx} x2={tx} y1={y - h / 2 - 5} y2={y + h / 2 + 5} className="m-target" />
      <text x={tx} y={y - h / 2 - 9} className="m-t-xs m-muted" textAnchor="middle">
        target {fmt(target, 0)}%
      </text>
    </g>
  );
}

/** A speedometer for growth: −4% … +8% a year. */
export function Dial({ x, y, r, value }: { x: number; y: number; r: number; value: number }) {
  const a = -90 + 180 * Math.max(0, Math.min(1, (value + 4) / 12));
  const zero = (-90 + 180 * (4 / 12)) * (Math.PI / 180);
  return (
    <g className="m-dial">
      <path d={`M${x - r} ${y} A${r} ${r} 0 0 1 ${x + r} ${y} Z`} className="m-tank-body" />
      <path d={`M${x - r} ${y} A${r} ${r} 0 0 1 ${x + r} ${y} Z`} className="m-tank-rim" />
      <line x1={x + Math.sin(zero) * (r - 9)} y1={y - Math.cos(zero) * (r - 9)} x2={x + Math.sin(zero) * (r - 3)} y2={y - Math.cos(zero) * (r - 3)} className="m-target" />
      <g className="m-needle" style={{ transform: `translate(${x}px, ${y}px) rotate(${a}deg)` }}>
        <path d={`M-3 0 L0 ${-(r - 6)} L3 0 Z`} />
        <circle r={4} />
      </g>
    </g>
  );
}

/** A spirit level for the output gap: the bubble sits on the mark when demand matches capacity. */
export function Level({ x, y, w, gap }: { x: number; y: number; w: number; gap: number }) {
  const cx = x + w / 2;
  const off = (Math.max(-5, Math.min(5, gap)) / 5) * (w / 2 - 14);
  return (
    <g className="m-level-gauge">
      <rect x={x} y={y - 9} width={w} height={18} rx={9} className="m-tank-body" />
      <rect x={x + 3} y={y - 6} width={w - 6} height={12} rx={6} className="m-level-fluid" />
      <line x1={cx} x2={cx} y1={y - 13} y2={y + 13} className="m-target" />
      <ellipse cx={0} cy={y} rx={11} ry={5} className="m-bubble" style={{ transform: `translateX(${cx + off}px)` }} />
      <rect x={x} y={y - 9} width={w} height={18} rx={9} className="m-tank-rim" />
      <text x={x} y={y - 15} className="m-t-xs m-muted">
        below
      </text>
      <text x={cx} y={y - 15} className="m-t-xs m-muted" textAnchor="middle">
        capacity
      </text>
      <text x={x + w} y={y - 15} className="m-t-xs m-muted" textAnchor="end">
        above
      </text>
    </g>
  );
}

/** Where the cursor of the lag ribbon is, as a fraction of the pulse cycle. Quarter i lands at Q0 + i·QSTEP. */
export const Q0 = 0.16;
export const QSTEP = 0.1;

type RibbonProps = { x: number; y: number; w: number; move: Move; phase: MutableRefObject<number>; motion: boolean };

/**
 * The lag ribbon: what the move does to demand and to inflation in each coming
 * quarter. A cursor sweeps it in step with the pulse in the pipes, so the
 * player sees demand respond first and inflation only later.
 */
export function Ribbon({ x, y, w, move, phase, motion }: RibbonProps) {
  const n = move.quarters.length;
  const labelW = 98;
  const valW = 40;
  const colW = (w - labelW - valW) / Math.max(1, n);
  const max = Math.max(0.3, ...move.demand.map(Math.abs), ...move.infl.map(Math.abs));
  const barH = 20;
  const rows: { name: string; when: string; series: number[] }[] = [
    { name: "Demand", when: move.stops.find((s) => /demand/i.test(s.name))?.when ?? "", series: move.demand },
    { name: "Inflation", when: move.stops.find((s) => /inflation/i.test(s.name))?.when ?? "", series: move.infl },
  ];
  const cursor = useRef<SVGLineElement>(null);
  const bars = useRef<(SVGRectElement | null)[]>([]);
  const lit = useRef(-2);
  useTick(() => {
    const t = phase.current;
    const q = (t - Q0) / QSTEP;
    const k = Math.floor(q + 0.5);
    if (cursor.current) {
      const cx = x + labelW + colW * Math.max(0, Math.min(n, q + 0.5));
      cursor.current.style.transform = `translateX(${cx}px)`;
      cursor.current.style.opacity = String(Math.max(0, Math.min(1, t / 0.04, (1 - t) / 0.06)));
    }
    if (k !== lit.current) {
      lit.current = k;
      bars.current.forEach((b, i) => b?.classList.toggle("is-lit", i % n <= k));
    }
  }, motion);
  const rowY = (r: number) => y + 28 + r * 38;
  return (
    <g className="m-ribbon">
      <text x={x} y={y + 6} className="m-t-xs m-strong">
        {move.title}: {move.change}
        <tspan className="m-muted" dx={8}>
          when it lands
        </tspan>
      </text>
      {rows.map((row, r) => {
        const base = rowY(r);
        const last = row.series[n - 1] ?? 0;
        return (
          <g key={row.name}>
            <text x={x} y={base + 4} className="m-t-xs m-strong">
              {row.name}
            </text>
            <text x={x} y={base + 18} className="m-t-xs m-muted">
              {row.when}
            </text>
            <line x1={x + labelW} x2={x + labelW + colW * n} y1={base} y2={base} className="m-axis" />
            {row.series.map((v, i) => {
              const h = (Math.abs(v) / max) * barH;
              return (
                <rect
                  key={i}
                  ref={(el) => {
                    bars.current[r * n + i] = el;
                  }}
                  className={`m-bar${motion ? "" : " is-lit"}`}
                  x={x + labelW + colW * i + colW * 0.2}
                  width={colW * 0.6}
                  y={v < 0 ? base : base - h}
                  height={Math.max(0.5, h)}
                  rx={2}
                />
              );
            })}
            <text x={x + w} y={base + 5} className="m-t-xs m-strong" textAnchor="end">
              {signed(last)}
            </text>
          </g>
        );
      })}
      <text x={x + labelW} y={rowY(1) + 32} className="m-t-xs m-muted">
        {move.quarters[0]}
      </text>
      <text x={x + labelW + colW * n} y={rowY(1) + 32} className="m-t-xs m-muted" textAnchor="end">
        {move.quarters[n - 1]} (pp)
      </text>
      {motion ? <line ref={cursor} x1={0} x2={0} y1={rowY(0) - 16} y2={rowY(1) + 18} className="m-cursor" style={{ opacity: 0 }} /> : null}
    </g>
  );
}
