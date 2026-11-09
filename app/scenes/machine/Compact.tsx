"use client";

// The machine on a small screen: only the main loop. Income drains into
// consumption and (through the rate valve) investment, the basin is demand
// against capacity, demand and any cost shock pour into the inflation gauge,
// and the pump lifts spending back up as income. The board is 240 high and
// as wide as the slot allows.

import { useRef } from "react";
import { signed, type MachineView } from "./data";
import { GaugeLabel, Q0, QSTEP, Thermometer } from "./gauges";
import { Pipe, Pulse, Pump, Valve, flowSpeed, pipeW } from "./parts";

export const COMPACT_H = 240;

type Pt = [number, number];
const poly = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

/** Causes in fewer words for the narrow text column. */
const short = (cause: string) => (cause ? cause.replace("interest rates", "rates").replace(/\bthe /g, "") : "steady");

export default function Compact({ v, w }: { v: MachineView; w: number }) {
  const phase = useRef(0);
  const f = v.flows;
  const pace = Math.max(0.5, Math.min(1.6, 1 + v.growth.value / 10));
  const sp = (x: number) => flowSpeed(x, pace);
  const textX = w - 150;
  const right = textX - 14;
  const L = 52;
  const xCons = L + (right - L) * 0.3;
  const xInv = L + (right - L) * 0.82;
  const basin = { x: L, y: 100, w: right - L, h: 38 };
  const capY = 112;
  const level = Math.max(basin.y + 5, Math.min(basin.y + basin.h - 5, capY - v.gap.value * 4));
  const xPrices = L + (right - L) * 0.55;
  const thermo = { x: 22, y: 186, w: right - 22, h: 13 };
  const priceShock = v.shocks.find((s) => s.place === "prices");
  const thermoX = thermo.x + 14 + (thermo.w - 14) * Math.min(1, Math.max(0.05, v.infl.value / 12));
  const isRate = v.move?.lever === "rate";
  const route: Pt[] = [[xInv, 64], [xInv, 116], [xPrices, 116], [xPrices, thermo.y], [thermoX, thermo.y]];
  const seg = route.slice(1).map(([x, y], i) => Math.hypot(x - route[i][0], y - route[i][1]));
  const tot = seg.reduce((a, b) => a + b, 0);
  let acc = 0;
  const fr = [0, ...seg.map((s) => (acc += s) / tot)];
  const keys: [number, number][] = [[0, 0], [0.05, 0], [Q0, fr[1]], [Q0 + QSTEP, fr[2]], [Q0 + 2 * QSTEP, fr[3]], [Q0 + 2.4 * QSTEP, 1]];
  const demandStop = v.move?.stops.find((s) => /demand/i.test(s.name));
  const lastQ = v.move ? v.move.quarters.length - 1 : 0;

  return (
    <g>
      <Pipe d={poly([[basin.x + 4, 120], [26, 120], [26, 22], [L + 4, 22]])} w={pipeW(f.income, 0.55)} speed={sp(f.income)} />
      <Pump x={26} y={72} r={13} growth={v.growth.value} />
      <Pipe d={poly([[xCons, 30], [xCons, basin.y + 4]])} w={pipeW(f.cons, 0.7)} speed={sp(f.cons)} />
      <Pipe d={poly([[xInv, 30], [xInv, basin.y + 4]])} w={pipeW(f.inv, 0.7)} speed={sp(f.inv)} />
      <Pipe d={poly([[xPrices, basin.y + basin.h - 4], [xPrices, thermo.y - 6]])} w={6} speed={sp(Math.max(0.6, 2 + v.gap.value))} />

      <rect x={L} y={10} width={right - L} height={24} rx={12} className="m-tank-body" />
      <rect x={L + 3} y={16} width={right - L - 6} height={14} rx={7} className="m-tank-water" />
      <rect x={L} y={10} width={right - L} height={24} rx={12} className="m-tank-rim" />
      <text x={L + 12} y={27} className="m-t-xs m-strong">Income (GDP)</text>

      <rect x={basin.x} y={basin.y} width={basin.w} height={basin.h} rx={16} className="m-tank-body" />
      <rect x={0} y={0} width={1} height={1} className="m-tank-water m-grow" style={{ transform: `translate(${basin.x + 3}px, ${level}px) scale(${basin.w - 6}, ${basin.y + basin.h - 3 - level})` }} />
      <rect x={basin.x} y={basin.y} width={basin.w} height={basin.h} rx={16} className="m-tank-rim" />
      <line x1={basin.x + 8} x2={basin.x + basin.w - 8} y1={capY} y2={capY} className="m-capacity" />
      <text x={basin.x + 10} y={basin.y + basin.h - 8} className="m-t-xs m-strong">Demand</text>
      <text x={xCons - 8} y={70} className="m-t-xs" textAnchor="end">Spend</text>

      <Valve x={xInv} y={64} {...v.levers.rate} label="Rate" r={11} side="left" />

      <Thermometer {...thermo} infl={v.infl.value} target={v.infl.target} shock={priceShock} />
      {priceShock ? <Pipe d={`M4 150 Q${thermo.x} 150 ${thermo.x} ${thermo.y - 11}`} w={Math.min(10, 4 + priceShock.size * 2)} speed={26} kind="shock" /> : null}
      {isRate || v.move ? <Pulse d={poly(route)} cycle={9} keys={keys} onPhase={(t) => (phase.current = t)} /> : null}

      <GaugeLabel x={textX} y={22} title="Inflation" g={v.infl} small cause={short(v.infl.cause)} />
      <GaugeLabel x={textX} y={70} title="Growth" g={v.growth} small cause={short(v.growth.cause)} />
      <GaugeLabel x={textX} y={118} title="Gap" g={v.gap} small cause={v.gap.value < -0.05 ? "below capacity" : v.gap.value > 0.05 ? "above capacity" : "at capacity"} />
      {priceShock ? (
        <text x={textX} y={160} className="m-t-xs m-strong">
          {priceShock.name.replace(" surge", "")}
          <tspan className="m-tone-warn"> ▲ {signed(priceShock.size)}</tspan>
        </text>
      ) : null}

      {v.move ? (
        <text x={8} y={226} className="m-t-xs">
          <tspan className="m-strong">{v.move.lever === "rate" ? "Rate" : "Move"}: </tspan>
          demand {signed(v.move.demand[0] ?? 0)} {demandStop?.when ?? ""}, inflation {signed(v.move.infl[Math.min(3, lastQ)] ?? 0)} by {v.move.quarters[Math.min(3, lastQ)]}
        </text>
      ) : (
        <text x={8} y={226} className="m-t-xs m-muted">Rates reach demand next quarter, inflation 2–4 quarters later.</text>
      )}
    </g>
  );
}
