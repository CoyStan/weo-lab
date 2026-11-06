"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decompose, DECOMP_METRICS, type Component, type DecompMetric } from "../decompose";
import { knownConfig } from "../missions";
import { useGame } from "../store";
import { useTurn } from "../useTurn";
import { useStripOverflow } from "../../components/strip";

// Categorical slots (validated light palette, fixed order). Environment pieces
// take the warm slots and instruments the cool ones; momentum is neutral grey.
const SLOT: Record<number, string> = {
  0: "var(--dc-momentum)",
  1: "var(--dc-1)",
  2: "var(--dc-2)",
  3: "var(--dc-3)",
  4: "var(--dc-4)",
  5: "var(--dc-5)",
  6: "var(--dc-6)",
  7: "var(--dc-7)",
  8: "var(--dc-8)",
};

const fmt = (v: number, d: number) => {
  const s = (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
  return v > 0 && Number(s) !== 0 ? `+${s}` : s;
};

const W_MAX = 1400;
/** Chart text, never under the type scale's smallest step. */
const FS = 15;
const H = 228;
const PAD = { l: 40, r: 44, t: 26, b: 36 };

/** Stacked contributions to the change in one variable, quarter by quarter. */
export default function Decomp() {
  const metric = useGame((s) => s.frameworkMetric);
  const setMetric = useGame((s) => s.setFrameworkMetric);
  const turns = useGame((s) => s.turns);
  const { mission, config, clock } = useTurn();
  const end = mission.quarters;
  const start = turns[0] ?? config;
  const d = useMemo(() => decompose(knownConfig(config, clock), start, end), [config, clock, start, end]);
  const meta = DECOMP_METRICS.find((m) => m.key === metric) ?? DECOMP_METRICS[0];
  const [hover, setHover] = useState<number | null>(null);
  const [W, setW] = useState(W_MAX);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.min(W_MAX, Math.round(e.contentRect.width)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const metricsRef = useRef<HTMLDivElement>(null);
  useStripOverflow(metricsRef, metric);

  const comps = d.components.filter((c) => c.id === "momentum" || c.values[metric].some((v) => Math.abs(v) > 0.005));
  const shown = comps.filter((c) => !hidden.has(c.id));
  const total = (t: number) => d.path[t][metric] - d.start[metric];
  const stackTop = (t: number) => shown.reduce((a, c) => a + Math.max(0, c.values[metric][t]), 0);
  const stackBottom = (t: number) => shown.reduce((a, c) => a + Math.min(0, c.values[metric][t]), 0);

  // Scale over every stack and the total line.
  let lo = 0;
  let hi = 0;
  for (let t = 1; t <= end; t++) {
    let pos = 0;
    let neg = 0;
    for (const c of shown) {
      const v = c.values[metric][t];
      if (v > 0) pos += v;
      else neg += v;
    }
    hi = Math.max(hi, pos, total(t));
    lo = Math.min(lo, neg, total(t));
  }
  if (hi - lo < 0.2) {
    hi += 0.1;
    lo -= 0.1;
  }
  const span = hi - lo;
  hi += span * 0.06;
  lo -= span * 0.06;
  // The instruments' share at the last quarter is labelled on the bar ("Your rates −2.4"):
  // leave a line of room beyond the stack for it.
  const polEnd = shownPolicy(shown, metric, end);
  if (Math.abs(polEnd) >= 0.05) {
    if (polEnd < 0) lo -= span * 0.16;
    else hi += span * 0.16;
  }
  const band = (W - PAD.l - PAD.r) / end;
  const x = (t: number) => PAD.l + (t - 1) * band;
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const barW = Math.max(4, band * 0.62);
  const ticks = niceTicks(lo, hi);
  const years = Array.from({ length: end }, (_, i) => i + 1).filter((t) => (t - 1) % 4 === 0);

  const at = hover ?? Math.max(1, clock);
  const env = comps.filter((c) => c.kind === "environment");
  const pol = comps.filter((c) => c.kind === "policy");
  const momentum = comps.find((c) => c.kind === "momentum")!;
  const toggle = (id: string) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="game-dc">
      <div className="game-strip game-dc-metrics-strip">
        <div ref={metricsRef} className="game-dc-metrics" role="tablist" aria-label="Variable to decompose">
          {DECOMP_METRICS.map((m) => (
            <button key={m.key} type="button" role="tab" aria-selected={m.key === metric} className={m.key === metric ? "is-on" : ""} onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="game-dc-lede">
        {meta.label} has moved <strong>{fmt(total(at), meta.digits)} {meta.unit}</strong> from {fmt0(d.start[metric], meta.digits)} at the start to {fmt0(d.path[at][metric], meta.digits)} in {d.path[at].label}
        {at > clock ? " (forecast)" : ""}. Here is what caused it:
      </p>

      <div className="game-dc-chart" ref={boxRef} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${meta.label}: contributions to the change since the start, by quarter`}>
          <defs>
            <pattern id="dc-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="7" fill="color-mix(in srgb, var(--dc-momentum) 22%, var(--lab-paper))" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="var(--dc-momentum)" strokeWidth="1.5" />
            </pattern>
          </defs>
          {clock < end ? <line x1={x(clock + 1)} x2={x(clock + 1)} y1={PAD.t - 2} y2={H - PAD.b} stroke="var(--lab-ink)" strokeDasharray="4 3" /> : null}
          {ticks.map((v, i) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--lab-ink)" : "var(--lab-line)"} strokeOpacity={v === 0 ? 0.55 : 1} />
              <text x={PAD.l - 6} y={y(v) + 4} fontSize={FS} textAnchor="end" fill="var(--lab-ink-2)">
                {fmt(v, tickDigits(ticks))}
              </text>
              {i === ticks.length - 1 ? (
                <text x={4} y={PAD.t - 12} fontSize={FS} fill="var(--lab-ink-2)">
                  {meta.unit} vs start
                </text>
              ) : null}
            </g>
          ))}
          {Array.from({ length: end }, (_, i) => i + 1).map((t) => (
            <line key={`q-${t}`} x1={x(t) + band / 2} x2={x(t) + band / 2} y1={H - PAD.b} y2={H - PAD.b + ((t - 1) % 4 === 0 ? 6 : 3)} stroke="var(--lab-ink-2)" strokeOpacity={0.5} />
          ))}
          {band >= 26
            ? Array.from({ length: end }, (_, i) => i + 1).map((t) => (
                <text key={`ql-${t}`} x={x(t) + band / 2} y={H - PAD.b + 16} fontSize={FS} textAnchor="middle" fill="var(--lab-ink-2)">
                  {d.path[t].label.slice(4)}
                </text>
              ))
            : null}
          {years.map((t) => (
            <text key={t} x={x(t) + band / 2} y={H - 2} fontSize={FS} fontWeight={600} textAnchor={band >= 26 ? "middle" : "start"} fill="var(--lab-ink-2)">
              {d.path[t].label.slice(0, 4)}
            </text>
          ))}
          {clock < end ? (
            <text x={x(clock + 1) + 5} y={PAD.t - 8} fontSize={FS} fontWeight={600} fill="var(--lab-ink)">
              Forecast
            </text>
          ) : null}
          {Array.from({ length: end }, (_, i) => i + 1).map((t) => {
            let pos = 0;
            let neg = 0;
            const cx = x(t) + (band - barW) / 2;
            return (
              <g key={t}>
                {shown.map((c) => {
                  const v = c.values[metric][t];
                  if (Math.abs(v) < 1e-4) return null;
                  const from = v > 0 ? pos : neg;
                  const to = from + v;
                  if (v > 0) pos = to;
                  else neg = to;
                  const top = y(Math.max(from, to));
                  const h = Math.max(0.5, Math.abs(y(from) - y(to)) - 1);
                  return <rect key={c.id} x={cx} y={top + (v > 0 ? 0 : 1)} width={barW} height={h} rx={1.5} fill={c.kind === "momentum" ? "url(#dc-hatch)" : SLOT[c.slot]} stroke={t === at ? "var(--lab-ink)" : "none"} strokeWidth={t === at ? 0.8 : 0} />;
                })}
              </g>
            );
          })}
          <path d={Array.from({ length: end }, (_, i) => i + 1).map((t, i) => `${i ? "L" : "M"}${(x(t) + band / 2).toFixed(1)},${y(total(t)).toFixed(1)}`).join(" ")} fill="none" stroke="var(--lab-ink)" strokeWidth={2} strokeLinejoin="round" />
          {Array.from({ length: end }, (_, i) => i + 1).map((t) => (
            <circle key={t} cx={x(t) + band / 2} cy={y(total(t))} r={t === at ? 4.5 : 2.5} fill="var(--lab-ink)" stroke="var(--lab-paper)" strokeWidth={1.5} />
          ))}
          {at !== end ? (
            <text x={x(at) + band / 2} y={Math.min(y(total(at)), y(stackTop(at))) - 8} fontSize={FS} fontWeight={700} textAnchor="middle" fill="var(--lab-ink)" paintOrder="stroke" stroke="var(--lab-paper)" strokeWidth={4}>
              {fmt(total(at), meta.digits)}
            </text>
          ) : null}
          <text x={x(end) + band / 2 + 8} y={y(total(end)) + 4} fontSize={FS} fontWeight={700} textAnchor="start" fill="var(--lab-ink)" paintOrder="stroke" stroke="var(--lab-paper)" strokeWidth={4}>
            {fmt(total(end), meta.digits)}
          </text>
          {Math.abs(polEnd) >= 0.05 ? (
            <text
              x={x(end) + band / 2}
              y={polEnd < 0 ? y(stackBottom(end)) + FS + 4 : y(stackTop(end)) - 8}
              fontSize={FS}
              fontWeight={700}
              textAnchor="middle"
              fill="var(--lab-ink)"
              paintOrder="stroke"
              stroke="var(--lab-paper)"
              strokeWidth={4}
            >
              {pol.length === 1 && /rate/i.test(pol[0].label) ? "Your rates" : "Your instruments"} {fmt(polEnd, meta.digits)}
            </text>
          ) : null}
          {Array.from({ length: end }, (_, i) => i + 1).map((t) => (
            <rect key={`hit-${t}`} x={x(t)} y={PAD.t} width={band} height={H - PAD.t - PAD.b} fill="transparent" onPointerEnter={() => setHover(t)} onClick={() => setHover(t)} />
          ))}
        </svg>
        <p className="game-dc-axis">Change since the start, {meta.unit}. Line = total change; bars = what caused it. Outlined bar = the quarter in the table ({d.path[at].label}{at <= clock ? ", this quarter's outturn" : ", forecast"}). Point at (or tap) a quarter for its numbers.</p>
      </div>

      <div className="game-dc-key">
      <table className="game-dc-table">
        <caption className="sr-only">What caused the change by {d.path[at].label}</caption>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Cause</span></th>
            <th scope="col">{d.path[at].label} ({at <= clock ? "played" : "forecast"})</th>
            {at !== end ? <th scope="col">{d.path[end].label} (forecast)</th> : null}
          </tr>
        </thead>
        <tbody>
          <LegendRows title="Where it was heading" items={[momentum]} metric={metric} at={at} end={at !== end ? end : null} digits={meta.digits} hidden={hidden} toggle={toggle} />
          {env.length ? <LegendRows title="What hit the economy" items={env} metric={metric} at={at} end={at !== end ? end : null} digits={meta.digits} hidden={hidden} toggle={toggle} /> : null}
          <LegendRows title="Your instruments" items={pol} metric={metric} at={at} end={at !== end ? end : null} digits={meta.digits} hidden={hidden} toggle={toggle} empty="You haven't moved a lever yet: nothing to attribute to policy." />
          <tr className="game-dc-total-row">
            <th scope="row">Total change, {meta.unit}</th>
            <td className="tabular-nums">{fmt(total(at), meta.digits)}</td>
            {at !== end ? <td className="tabular-nums">{fmt(total(end), meta.digits)}</td> : null}
          </tr>
        </tbody>
      </table>
      <p className="game-dc-note">
        <strong>How it is measured:</strong> shocks are switched on one by one under the policy you inherited; then your instruments are switched on with the shocks in place, so each instrument shows how much it offset or added to them. Click a legend item to hide it from the chart.
      </p>
      </div>
    </div>
  );
}

function LegendRows({ title, items, metric, at, end, digits, hidden, toggle, empty }: { title: string; items: Component[]; metric: DecompMetric; at: number; end: number | null; digits: number; hidden: Set<string>; toggle: (id: string) => void; empty?: string }) {
  const cols = end === null ? 2 : 3;
  return (
    <>
      <tr className="game-dc-group-row">
        <th scope="rowgroup" colSpan={cols}>{title}</th>
      </tr>
      {items.length ? (
        items.map((c) => {
          const v = c.values[metric][at];
          return (
            <tr key={c.id} className={hidden.has(c.id) ? "is-off" : ""}>
              <th scope="row">
                <button type="button" onClick={() => toggle(c.id)} aria-pressed={!hidden.has(c.id)} title={hidden.has(c.id) ? "Show in the chart" : "Hide from the chart"}>
                  <i className={c.kind === "momentum" ? "is-hatch" : ""} style={c.kind === "momentum" ? undefined : { background: SLOT[c.slot] }} aria-hidden="true" />
                  <span className="game-dc-label">{c.label}</span>
                </button>
              </th>
              <td className="tabular-nums">{fmt(v, digits)}</td>
              {end !== null ? <td className="tabular-nums">{fmt(c.values[metric][end], digits)}</td> : null}
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan={cols} className="game-dc-empty">{empty}</td>
        </tr>
      )}
    </>
  );
}

const fmt0 = (v: number, d: number) => v.toFixed(d);

/** The instruments' summed contribution at quarter t, over the components on the chart. */
function shownPolicy(shown: Component[], metric: DecompMetric, t: number) {
  return shown.filter((c) => c.kind === "policy").reduce((a, c) => a + c.values[metric][t], 0);
}

function tickDigits(ticks: number[]): number {
  const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;
  return step >= 1 && Number.isInteger(step) ? 0 : step >= 0.1 ? 1 : 2;
}

function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  const raw = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
  if (!out.some((v) => Math.abs(v) < 1e-9)) out.push(0);
  return out.sort((a, b) => a - b);
}
