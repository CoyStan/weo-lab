"use client";

// The machine's building blocks: pipes with moving water, tanks, valves, a
// pump wheel, gauges, leaks and the pulse that carries a lever's effect.

import { createContext, useContext, useId, useRef } from "react";
import { useTick } from "./anim";
import type { Tone } from "./data";

/** Motion on (false when reduced motion is asked for). */
export const MotionCtx = createContext(true);
const useMotion = () => useContext(MotionCtx);

const DASH = 14;
const GAP = 12;
const PERIOD = DASH + GAP;

/** Pipe width for a flow in % of GDP. */
export const pipeW = (v: number, k = 1) => Math.max(5, (4 + Math.sqrt(Math.abs(v)) * 1.5) * k);
/** Water speed, px/s, for a flow in % of GDP (the sign sets the direction). */
export const flowSpeed = (v: number, pace = 1) => (Math.abs(v) < 0.05 ? 0 : Math.sign(v) * (14 + Math.sqrt(Math.abs(v)) * 6) * pace);

type PipeProps = { d: string; w: number; speed: number; kind?: "water" | "shock" | "leak"; dim?: boolean; className?: string };

/** A rounded pipe: wall, inside and blobs of water that move along it at `speed` px/s. */
export function Pipe({ d, w, speed, kind = "water", dim = false, className = "" }: PipeProps) {
  const motion = useMotion();
  const water = useRef<SVGPathElement>(null);
  const st = useRef({ off: 0, v: speed });
  useTick((dt) => {
    const s = st.current;
    s.v += (speed - s.v) * Math.min(1, dt * 2.5);
    s.off = (((s.off + s.v * dt) % PERIOD) + PERIOD) % PERIOD;
    if (water.current) water.current.style.strokeDashoffset = String(-s.off);
  }, motion && speed !== 0);
  return (
    <g className={`m-pipe is-${kind}${dim ? " is-dim" : ""} ${className}`}>
      <path d={d} className="m-pipe-wall" strokeWidth={w + 5} />
      <path d={d} className="m-pipe-in" strokeWidth={w} />
      {speed !== 0 ? <path ref={water} d={d} className="m-pipe-water" strokeWidth={Math.max(2, w - 4)} strokeDasharray={`${DASH} ${GAP}`} /> : null}
    </g>
  );
}

type TankProps = { x: number; y: number; w: number; h: number; frac: number; name: string; value: string; arrow: string; tone: Tone };

/** A stock: a rounded tank whose water level is the data, named and valued inside. */
export function Tank({ x, y, w, h, frac, name, value, arrow, tone }: TankProps) {
  const id = useId().replace(/:/g, "");
  const top = y + h * (1 - Math.max(0.02, Math.min(0.98, frac)));
  return (
    <g className="m-tank">
      <defs>
        <clipPath id={`tk${id}`}>
          <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={14} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={17} className="m-tank-body" />
      <g clipPath={`url(#tk${id})`}>
        <g className="m-level" style={{ transform: `translateY(${top}px)` }}>
          <g className="m-wave">
            <path d={wavePath(x - 40, w + 80)} className="m-tank-water" />
          </g>
        </g>
      </g>
      <rect x={x} y={y} width={w} height={h} rx={17} className="m-tank-rim" />
      <text x={x + w / 2} y={y + 22} className="m-t-xs m-strong" textAnchor="middle">
        {name}
      </text>
      <text x={x + w / 2} y={y + 39} className="m-t-xs" textAnchor="middle">
        {value}
        {arrow ? <tspan className={`m-tone-${tone}`}> {arrow}</tspan> : null}
      </text>
    </g>
  );
}

/** A water body whose top edge is a gentle wave; one wavelength is 40 px so the CSS loop is seamless. */
function wavePath(x0: number, width: number): string {
  let d = `M${x0} 0`;
  for (let x = x0; x < x0 + width; x += 40) d += ` q10 -4 20 0 t20 0`;
  return `${d} V600 H${x0} Z`;
}

type ValveProps = { x: number; y: number; angle: number; label: string; value: string; unlocked: boolean; changed: boolean; side?: "left" | "right" | "below"; r?: number };

/** A lever as a valve: the handle turns with the lever's setting. */
export function Valve({ x, y, angle, label, value, unlocked, changed, side = "left", r = 15 }: ValveProps) {
  const tx = side === "left" ? x - r - 9 : side === "right" ? x + r + 9 : x;
  const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
  const ty = side === "below" ? y + r + 18 : y - 2;
  return (
    <g className={`m-valve${unlocked ? "" : " is-locked"}${changed ? " is-changed" : ""}`}>
      {changed ? <circle cx={x} cy={y} r={r + 7} className="m-valve-ring" /> : null}
      <circle cx={x} cy={y} r={r} className="m-valve-body" />
      <g className="m-valve-handle" style={{ transform: `translate(${x}px, ${y}px) rotate(${angle}deg)` }}>
        <rect x={-r - 6} y={-3.5} width={2 * r + 12} height={7} rx={3.5} />
        <circle r={4.5} className="m-valve-hub" />
      </g>
      <text x={tx} y={ty} className="m-t-xs m-strong" textAnchor={anchor}>
        {label}
      </text>
      <text x={tx} y={ty + 16} className="m-t-xs" textAnchor={anchor}>
        {unlocked ? value : "locked"}
      </text>
    </g>
  );
}

/** The pump that lifts spending back up as income; it turns faster when growth is higher. */
export function Pump({ x, y, r, growth }: { x: number; y: number; r: number; growth: number }) {
  const motion = useMotion();
  const g = useRef<SVGGElement>(null);
  const st = useRef({ a: 0, v: 0 });
  const target = Math.max(0, 25 + growth * 22);
  useTick((dt) => {
    const s = st.current;
    s.v += (target - s.v) * Math.min(1, dt * 2);
    s.a = (s.a + s.v * dt) % 360;
    if (g.current) g.current.style.transform = `translate(${x}px, ${y}px) rotate(${s.a}deg)`;
  }, motion);
  return (
    <g className="m-pump">
      <circle cx={x} cy={y} r={r} className="m-pump-body" />
      <g ref={g} style={{ transform: `translate(${x}px, ${y}px)` }}>
        {[0, 60, 120].map((a) => (
          <rect key={a} x={-r + 5} y={-2.5} width={2 * r - 10} height={5} rx={2.5} transform={`rotate(${a})`} className="m-pump-blade" />
        ))}
        <circle r={4} className="m-valve-hub" />
      </g>
    </g>
  );
}

/** Drops falling from a crack: a shock leaking out (or a coloured inflow pouring in). */
export function Drops({ x, y, kind, n = 3, spread = 10 }: { x: number; y: number; kind: "leak" | "shock"; n?: number; spread?: number }) {
  return (
    <g className={`m-drops is-${kind}`}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} className="m-drop" style={{ animationDelay: `${(-i * 1.2) / n}s` }} d={`M${x + (i - (n - 1) / 2) * spread} ${y} q-4 6 0 9 q4 -3 0 -9 z`} />
      ))}
    </g>
  );
}

type PulseProps = { d: string; cycle: number; /** Progress (0–1) along the path at each fraction of the cycle: [[t, p], …]. */ keys: [number, number][]; onPhase?: (t: number) => void };

/**
 * A marker that carries a lever's push along its channel. It moves along `d`
 * with the timing in `keys`, so a long lag is a long stretch of the cycle.
 */
export function Pulse({ d, cycle, keys, onPhase }: PulseProps) {
  const motion = useMotion();
  const path = useRef<SVGPathElement>(null);
  const dot = useRef<SVGGElement>(null);
  const st = useRef({ t: 0, len: 0 });
  useTick((dt) => {
    const s = st.current;
    const p = path.current;
    if (!p || !dot.current) return;
    if (!s.len) s.len = p.getTotalLength();
    s.t = (s.t + dt / cycle) % 1;
    let prog = 1;
    for (let i = 1; i < keys.length; i++) {
      const [t0, p0] = keys[i - 1];
      const [t1, p1] = keys[i];
      if (s.t <= t1) {
        const u = (s.t - t0) / Math.max(1e-6, t1 - t0);
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        prog = p0 + (p1 - p0) * e;
        break;
      }
    }
    const pt = p.getPointAtLength(prog * s.len);
    // Fade in at the valve and out at the end of the cycle, so the restart never jumps.
    const fade = Math.min(1, s.t / 0.04, (1 - s.t) / 0.06);
    dot.current.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
    dot.current.style.opacity = String(Math.max(0, fade));
    onPhase?.(s.t);
  }, motion);
  return (
    <g className="m-pulse">
      <path ref={path} d={d} className={motion ? "m-route" : "m-route is-static"} />
      {motion ? (
        <g ref={dot} style={{ opacity: 0 }}>
          <circle r={15} className="m-pulse-halo" />
          <circle r={7} className="m-pulse-dot" />
        </g>
      ) : null}
    </g>
  );
}
