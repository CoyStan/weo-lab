"use client";

import { useMemo, useState } from "react";
import { decompose, DECOMP_METRICS, type Component, type DecompMetric } from "../decompose";
import { knownConfig } from "../missions";
import { useGame } from "../store";
import { useTurn } from "../useTurn";

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

const W = 760;
const H = 250;
const PAD = { l: 40, r: 10, t: 14, b: 26 };

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
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const comps = d.components.filter((c) => c.id === "momentum" || c.values[metric].some((v) => Math.abs(v) > 0.005));
  const shown = comps.filter((c) => !hidden.has(c.id));
  const total = (t: number) => d.path[t][metric] - d.start[metric];

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
      <div className="game-dc-metrics" role="tablist" aria-label="Variable to decompose">
        {DECOMP_METRICS.map((m) => (
          <button key={m.key} type="button" role="tab" aria-selected={m.key === metric} className={m.key === metric ? "is-on" : ""} onClick={() => setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <p className="game-dc-lede">
        {meta.label} has moved <strong>{fmt(total(at), meta.digits)} {meta.unit}</strong> from {fmt0(d.start[metric], meta.digits)} at the start to {fmt0(d.path[at][metric], meta.digits)} in {d.path[at].label}
        {at > clock ? " (forecast)" : ""}. The bars split that change: <span className="game-dc-key is-env">warm colours</span> are what hit the economy,{" "}
        <span className="game-dc-key is-pol">cool colours</span> are your instruments, grey is where the economy was heading anyway.
      </p>

      <div className="game-dc-chart" onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${meta.label}: contributions to the change since the start, by quarter`}>
          {clock < end ? <rect x={x(clock + 1) - band * 0.2} y={PAD.t} width={x(end) + band - x(clock + 1) + band * 0.2} height={H - PAD.t - PAD.b} fill="color-mix(in srgb, var(--lab-ink) 4%, transparent)" /> : null}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--lab-ink)" : "var(--lab-line)"} strokeOpacity={v === 0 ? 0.45 : 1} />
              <text x={PAD.l - 6} y={y(v) + 3} fontSize={10} textAnchor="end" fill="var(--lab-ink-2)">
                {fmt(v, Math.abs(ticks[1] - ticks[0]) < 1 ? 1 : 0)}
              </text>
            </g>
          ))}
          {years.map((t) => (
            <text key={t} x={x(t) + 2} y={H - 8} fontSize={10} fill="var(--lab-ink-2)">
              {d.path[t].label.slice(0, 4)}
            </text>
          ))}
          {clock < end ? (
            <text x={x(clock + 1) + 4} y={PAD.t + 10} fontSize={10} fill="var(--lab-ink-2)">
              Forecast →
            </text>
          ) : null}
          {Array.from({ length: end }, (_, i) => i + 1).map((t) => {
            let pos = 0;
            let neg = 0;
            const cx = x(t) + (band - barW) / 2;
            return (
              <g key={t} opacity={hover === null || hover === t ? 1 : 0.45}>
                {shown.map((c) => {
                  const v = c.values[metric][t];
                  if (Math.abs(v) < 1e-4) return null;
                  const from = v > 0 ? pos : neg;
                  const to = from + v;
                  if (v > 0) pos = to;
                  else neg = to;
                  const top = y(Math.max(from, to));
                  const h = Math.max(0.5, Math.abs(y(from) - y(to)) - 1);
                  return <rect key={c.id} x={cx} y={top + (v > 0 ? 0 : 1)} width={barW} height={h} rx={1.5} fill={SLOT[c.slot]} />;
                })}
              </g>
            );
          })}
          <path d={Array.from({ length: end }, (_, i) => i + 1).map((t, i) => `${i ? "L" : "M"}${(x(t) + band / 2).toFixed(1)},${y(total(t)).toFixed(1)}`).join(" ")} fill="none" stroke="var(--lab-ink)" strokeWidth={2} strokeLinejoin="round" />
          {Array.from({ length: end }, (_, i) => i + 1).map((t) => (
            <circle key={t} cx={x(t) + band / 2} cy={y(total(t))} r={t === at ? 4.5 : 2.5} fill="var(--lab-ink)" stroke="var(--lab-paper)" strokeWidth={1.5} />
          ))}
          {Array.from({ length: end }, (_, i) => i + 1).map((t) => (
            <rect key={`hit-${t}`} x={x(t)} y={PAD.t} width={band} height={H - PAD.t - PAD.b} fill="transparent" onPointerEnter={() => setHover(t)} onClick={() => setHover(t)} />
          ))}
        </svg>
        <p className="game-dc-axis">Change since the start, {meta.unit}. Line = total change; bars = what caused it. Hover a quarter for the numbers.</p>
      </div>

      <div className="game-dc-legend">
        <LegendGroup title="Where it was heading" items={[momentum]} metric={metric} at={at} digits={meta.digits} hidden={hidden} toggle={toggle} />
        {env.length ? <LegendGroup title="What hit the economy" items={env} metric={metric} at={at} digits={meta.digits} hidden={hidden} toggle={toggle} /> : null}
        <LegendGroup title="Your instruments" items={pol} metric={metric} at={at} digits={meta.digits} hidden={hidden} toggle={toggle} empty="You haven't moved a lever yet: nothing to attribute to policy." />
        <div className="game-dc-total">
          <span>Total change by {d.path[at].label}</span>
          <strong className="tabular-nums">
            {fmt(total(at), meta.digits)} {meta.unit}
          </strong>
        </div>
      </div>
      <p className="game-dc-note">
        How it is measured: shocks are switched on one by one under the policy you inherited; then your instruments are switched on with the shocks in place, so each instrument shows how much it offset or added to them. Click a legend item to hide it from the chart.
      </p>
    </div>
  );
}

function LegendGroup({ title, items, metric, at, digits, hidden, toggle, empty }: { title: string; items: Component[]; metric: DecompMetric; at: number; digits: number; hidden: Set<string>; toggle: (id: string) => void; empty?: string }) {
  const max = Math.max(0.01, ...items.map((c) => Math.abs(c.values[metric][at])));
  return (
    <div className="game-dc-group">
      <h5>{title}</h5>
      {items.length ? (
        <ul>
          {items.map((c) => {
            const v = c.values[metric][at];
            return (
              <li key={c.id}>
                <button type="button" className={hidden.has(c.id) ? "is-off" : ""} onClick={() => toggle(c.id)} aria-pressed={!hidden.has(c.id)} title={hidden.has(c.id) ? "Show in the chart" : "Hide from the chart"}>
                  <i style={{ background: SLOT[c.slot] }} aria-hidden="true" />
                  <span className="truncate">{c.label}</span>
                  <span className="game-dc-mini" aria-hidden="true">
                    <span style={{ width: `${(Math.abs(v) / max) * 100}%`, background: SLOT[c.slot], marginLeft: v < 0 ? "auto" : undefined }} />
                  </span>
                  <span className="tabular-nums">{fmt(v, digits)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

const fmt0 = (v: number, d: number) => v.toFixed(d);

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
