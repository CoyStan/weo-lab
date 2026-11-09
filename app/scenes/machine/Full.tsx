"use client";

// The whole machine, drawn on a 780 × 680 board (laptop and TV). Income at the
// top drains into taxes, consumption and saving; government spending and
// investment pour back into the demand basin; exports come in and imports go
// out on the right; the pump lifts spending back up as income. The three
// gauges sit along the bottom, and the lag ribbon between them and the basin.

import { useContext, useRef } from "react";
import { fmt, type MachineView } from "./data";
import { Dial, GaugeLabel, Level, Q0, QSTEP, Ribbon, Thermometer } from "./gauges";
import { Drops, MotionCtx, Pipe, Pulse, Pump, Tank, Valve, flowSpeed, pipeW } from "./parts";

export const FULL_W = 780;
export const FULL_H = 680;

type Pt = [number, number];
const poly = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
/** Fraction of the polyline's length at each of its points. */
function cum(pts: Pt[]): number[] {
  const seg = pts.slice(1).map(([x, y], i) => Math.hypot(x - pts[i][0], y - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return [0, ...seg.map((s) => (acc += s) / total)];
}

// Geometry of the board.
const TROUGH = { x: 160, y: 50, w: 485, h: 32 };
const BASIN = { x: 160, y: 372, w: 485, h: 68 };
const CAP_Y = 394; // the "full capacity" line in the basin
const TREAS = { x: 168, y: 132, w: 112, h: 118 };
const MONEY = { x: 446, y: 132, w: 92, h: 118 };
const LOANS = { x: 552, y: 132, w: 92, h: 118 };
const RES = { x: 680, y: 150, w: 84, h: 104 };
const X_TAX = 222;
const X_GOV = 190;
const X_CONS = 390;
const X_SAVE = 492;
const X_INV = 624;
const X_FX = 722;
const Y_VALVE = 312;
const X_PRICES = 252;
const THERMO = { x: 40, y: 588, w: 262, h: 18 };

export default function Full({ v }: { v: MachineView }) {
  const motion = useContext(MotionCtx);
  const phase = useRef(0);
  const f = v.flows;
  const pace = Math.max(0.5, Math.min(1.6, 1 + v.growth.value / 10));
  const sp = (x: number) => flowSpeed(x, pace);
  const priceShock = v.shocks.find((s) => s.place === "prices");
  const otherShocks = v.shocks.filter((s) => s.place !== "prices");
  const capShock = otherShocks.find((s) => s.place === "capital");
  const expShock = otherShocks.find((s) => s.place === "exports");
  const credShock = otherShocks.find((s) => s.place === "credit");
  const demShock = otherShocks.find((s) => s.place === "demand");

  // Water in the basin: on the capacity line when the output gap is zero.
  const level = Math.max(BASIN.y + 8, Math.min(BASIN.y + BASIN.h - 8, CAP_Y - v.gap.value * 7));
  const basinFrac = 1 - (level - BASIN.y) / BASIN.h;

  // The lever's route through the machine, and when each stop is reached (in quarters).
  const thermoX = THERMO.x + 20 + (THERMO.w - 20) * Math.min(1, Math.max(0.05, v.infl.value / 12));
  const route: { pts: Pt[]; lands: number[] } | null = !v.move
    ? null
    : v.move.lever === "rate"
      ? { pts: [[X_INV, Y_VALVE], [X_INV, 408], [X_PRICES, 408], [X_PRICES, THERMO.y], [thermoX, THERMO.y]], lands: [-1, 0, 1, 2, 2.4] }
      : v.move.lever === "fiscal"
        ? { pts: [[X_GOV, Y_VALVE], [X_GOV, 408], [X_PRICES, 408], [X_PRICES, THERMO.y], [thermoX, THERMO.y]], lands: [-1, -0.4, 0.2, 2, 2.4] }
        : { pts: [[X_FX, 300], [X_FX, 338]], lands: [-1, 0] };
  const keys: [number, number][] | null = route ? [[0, 0], [0.05, 0], ...route.lands.slice(1).map((q, i): [number, number] => [Q0 + q * QSTEP, cum(route.pts)[i + 1]])] : null;

  return (
    <g>
      {/* The pump loop: spending comes back round as income. */}
      <Pipe d={poly([[BASIN.x + 4, 400], [96, 400], [96, 66], [TROUGH.x + 4, 66]])} w={pipeW(f.income, 0.8)} speed={sp(f.income)} />
      <Pump x={96} y={300} r={20} growth={v.growth.value} />
      <text x={74} y={190} className="m-t-xs m-muted" textAnchor="middle" transform="rotate(-90 74 190)">
        spending comes back as income
      </text>

      {/* Income drains into taxes, consumption and saving. */}
      <Pipe d={poly([[X_TAX, TROUGH.y + 20], [X_TAX, TREAS.y + 6]])} w={pipeW(f.taxes)} speed={sp(f.taxes)} />
      <Pipe d={poly([[X_CONS, TROUGH.y + 20], [X_CONS, BASIN.y + 6]])} w={pipeW(f.cons)} speed={sp(f.cons)} />
      <Pipe d={poly([[X_SAVE, TROUGH.y + 20], [X_SAVE, MONEY.y + 6]])} w={pipeW(f.saving)} speed={sp(f.saving)} />
      <text x={X_TAX + 13} y={112} className="m-t-xs">Taxes</text>
      <text x={X_SAVE + 13} y={112} className="m-t-xs">Saving</text>
      <text x={X_CONS - 16} y={265} className="m-t-xs" textAnchor="middle" transform={`rotate(-90 ${X_CONS - 16} 265)`}>
        Consumption
      </text>

      {/* Government: spending goes out through the budget valve; interest goes to the banks. */}
      <Pipe d={poly([[TREAS.x + TREAS.w - 6, 170], [MONEY.x + 6, 170]])} w={pipeW(f.interest)} speed={sp(f.interest)} />
      <text x={(TREAS.x + TREAS.w + X_CONS) / 2 - 6} y={159} className="m-t-xs" textAnchor="middle">Interest</text>
      <Pipe d={poly([[X_GOV, TREAS.y + TREAS.h - 6], [X_GOV, BASIN.y + 6]])} w={pipeW(f.gov)} speed={sp(f.gov)} />
      <text x={X_GOV + 16} y={BASIN.y - 10} className="m-t-xs">Government</text>

      {/* Banks: saving fills money; loans pour out as investment through the rate valve. */}
      <Pipe d={poly([[MONEY.x + MONEY.w - 6, 232], [LOANS.x + 6, 232]])} w={6} speed={sp(f.inv)} />
      <Pipe d={poly([[X_INV, LOANS.y + LOANS.h - 6], [X_INV, BASIN.y + 6]])} w={pipeW(f.inv)} speed={sp(f.inv)} />
      <text x={X_INV - 14} y={BASIN.y - 10} className="m-t-xs" textAnchor="end">Investment</text>

      {/* Rest of the world. */}
      <Pipe d={poly([[790, 104], [X_FX, 104], [X_FX, RES.y + 6]])} w={pipeW(f.capital)} speed={sp(f.capital)} kind={capShock ? "leak" : "water"} />
      {capShock ? (
        <g>
          <text x={772} y={76} className={`m-t-xs m-strong ${capShock.dir > 0 ? "m-tone-warn" : "m-tone-bad"}`} textAnchor="end">
            {capShock.name} {capShock.dir > 0 ? "▲" : "▼"}
          </text>
          <text x={772} y={94} className="m-t-xs" textAnchor="end">{capShock.dir > 0 ? "money pouring in" : "money pulling out"}</text>
          <Drops x={756} y={112} kind={capShock.dir > 0 ? "shock" : "leak"} n={2} />
        </g>
      ) : (
        <text x={772} y={94} className="m-t-xs" textAnchor="end">Money from abroad</text>
      )}
      {f.fxSales > 0.05 ? <Pipe d={poly([[X_FX, RES.y + RES.h - 6], [X_FX, 335]])} w={pipeW(f.fxSales)} speed={sp(f.fxSales)} /> : <Pipe d={poly([[X_FX, RES.y + RES.h - 6], [X_FX, 335]])} w={6} speed={0} />}
      <circle cx={X_FX} cy={338} r={12} className="m-tank-body" />
      <text x={X_FX} y={343} className="m-t-xs m-strong" textAnchor="middle">¤</text>
      <text x={X_FX} y={367} className="m-t-xs m-muted" textAnchor="middle">
        currency{Math.abs(v.dE) >= 0.2 ? <tspan className={v.dE > 0 ? "m-tone-bad" : "m-tone-good"}> {v.dE > 0 ? "▼" : "▲"} {fmt(Math.abs(v.dE))}%</tspan> : null}
      </text>
      <Pipe d={poly([[790, 398], [BASIN.x + BASIN.w - 6, 398]])} w={pipeW(f.exports)} speed={sp(f.exports)} kind={expShock ? "leak" : "water"} />
      <Pipe d={poly([[BASIN.x + BASIN.w - 6, 428], [790, 428]])} w={pipeW(f.imports)} speed={sp(f.imports)} />
      <text x={772} y={386} className="m-t-xs" textAnchor="end">Exports in</text>
      <text x={772} y={452} className="m-t-xs" textAnchor="end">Imports out</text>

      {/* Demand into prices. */}
      <Pipe d={poly([[X_PRICES, BASIN.y + BASIN.h - 6], [X_PRICES, THERMO.y - 8]])} w={7} speed={sp(Math.max(0.6, 2 + v.gap.value))} />
      <text x={X_PRICES - 12} y={500} className="m-t-xs m-muted" textAnchor="end">demand</text>
      <text x={X_PRICES - 12} y={516} className="m-t-xs m-muted" textAnchor="end">→ prices</text>

      {/* Stocks. */}
      <Tank {...TREAS} frac={v.stocks.debt.frac} name="Public debt" value={v.stocks.debt.text} arrow={arrow(v.stocks.debt.delta)} tone={v.stocks.debt.tone} />
      <Tank {...MONEY} frac={v.stocks.money.frac} name="Money" value={v.stocks.money.text.replace(" of GDP", " GDP")} arrow={arrow(v.stocks.money.delta)} tone="neutral" />
      <Tank {...LOANS} frac={v.stocks.credit.frac} name="Bank loans" value={v.stocks.credit.text.replace(" of GDP", " GDP")} arrow={arrow(v.stocks.credit.delta)} tone="neutral" />
      <Tank {...RES} frac={v.stocks.reserves.frac} name="Reserves" value={v.stocks.reserves.text.replace(" months", " mo")} arrow={arrow(v.stocks.reserves.delta)} tone={v.stocks.reserves.tone} />

      {/* Income trough and demand basin. */}
      <Trough {...TROUGH} label="Income (GDP)" />
      <Basin {...BASIN} frac={basinFrac} />
      <line x1={BASIN.x + 12} x2={BASIN.x + BASIN.w - 12} y1={CAP_Y} y2={CAP_Y} className="m-capacity" />
      <text x={X_INV - 30} y={CAP_Y - 5} className="m-t-xs m-muted" textAnchor="end">full capacity</text>
      <text x={BASIN.x + 16} y={BASIN.y + BASIN.h - 10} className="m-t-xs m-strong">Spending (demand)</text>

      {/* Valves: the player's levers. */}
      <Valve x={X_GOV} y={Y_VALVE} {...v.levers.fiscal} side="right" />
      <Valve x={X_INV} y={Y_VALVE} {...v.levers.rate} side="left" />
      <Valve x={X_FX} y={300} {...v.levers.fx} r={12} side="left" />

      {/* Shocks, poured in or leaking out where they hit. */}
      {priceShock ? (
        <g>
          <Pipe d={`M8 548 Q${THERMO.x - 2} 548 ${THERMO.x} ${THERMO.y - 14}`} w={Math.min(14, 5 + priceShock.size * 3)} speed={30} kind="shock" />
          <Drops x={THERMO.x} y={THERMO.y - 26} kind="shock" n={1} />
          <text x={10} y={512} className="m-t-xs m-strong">{priceShock.name}</text>
          <text x={10} y={528} className="m-t-xs m-tone-warn">▲ {priceShock.text}</text>
        </g>
      ) : null}
      {expShock ? <ShockTag x={772} y={472} anchor="end" shock={expShock} drops={[740, 406]} /> : null}
      {credShock ? <ShockTag x={LOANS.x + LOANS.w / 2} y={LOANS.y - 10} anchor="middle" shock={credShock} drops={[LOANS.x + LOANS.w - 20, LOANS.y + LOANS.h + 2]} /> : null}
      {demShock ? <ShockTag x={BASIN.x + BASIN.w / 2} y={BASIN.y + BASIN.h + 16} anchor="middle" shock={demShock} drops={[BASIN.x + BASIN.w / 2 + 60, BASIN.y + BASIN.h + 2]} /> : null}


      {/* What happens when: the lag ribbon, or a prompt to turn a valve. */}
      {v.move ? (
        <Ribbon x={300} y={470} w={472} move={v.move} phase={phase} motion={motion} />
      ) : (
        <g>
          <text x={300} y={484} className="m-t-xs m-strong">Turn a valve to see where it flows, and when.</text>
          <text x={300} y={502} className="m-t-xs m-muted">The policy rate reaches demand next quarter,</text>
          <text x={300} y={518} className="m-t-xs m-muted">and inflation over the 2–4 quarters after.</text>
        </g>
      )}

      {/* Gauges. */}
      <Thermometer {...THERMO} infl={v.infl.value} target={v.infl.target} shock={priceShock} />
      <GaugeLabel x={14} y={630} title="Inflation" g={v.infl} />
      <Dial x={360} y={606} r={30} value={v.growth.value} />
      <GaugeLabel x={326} y={630} title="Growth" g={v.growth} />
      <Level x={560} y={600} w={200} gap={v.gap.value} />
      <GaugeLabel x={556} y={630} title="Output gap" g={v.gap} cause={v.gap.value < -0.05 ? "demand below capacity" : v.gap.value > 0.05 ? "demand above capacity" : "demand matches capacity"} />

      {/* The lever's push travelling down its channel. */}
      {route && keys ? <Pulse d={poly(route.pts)} cycle={9} keys={keys} onPhase={(t) => (phase.current = t)} /> : null}
      <text x={14} y={24} className="m-t-xs m-muted">
        {v.label} · {v.played ? "the quarter just played" : "forecast for the quarter you are deciding"}
      </text>
    </g>
  );
}

const arrow = (d: number) => (d > 0.05 ? "▲" : d < -0.05 ? "▼" : "");

function Trough({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <g className="m-trough">
      <rect x={x} y={y} width={w} height={h} rx={h / 2} className="m-tank-body" />
      <rect x={x + 4} y={y + 8} width={w - 8} height={h - 12} rx={(h - 12) / 2} className="m-tank-water" />
      <rect x={x} y={y} width={w} height={h} rx={h / 2} className="m-tank-rim" />
      <text x={x + 18} y={y + h / 2 + 5} className="m-t-sm m-strong">
        {label}
      </text>
    </g>
  );
}

function Basin({ x, y, w, h, frac }: { x: number; y: number; w: number; h: number; frac: number }) {
  const top = y + h * (1 - frac);
  return (
    <g className="m-basin">
      <defs>
        <clipPath id="m-basin-clip">
          <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={20} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={22} className="m-tank-body" />
      <g clipPath="url(#m-basin-clip)">
        <g className="m-level" style={{ transform: `translateY(${top}px)` }}>
          <g className="m-wave">
            <path d={`M${x - 40} 0 ${Array.from({ length: Math.ceil((w + 80) / 40) }, () => "q10 -4 20 0 t20 0").join(" ")} V200 H${x - 40} Z`} className="m-tank-water" />
          </g>
        </g>
      </g>
      <rect x={x} y={y} width={w} height={h} rx={22} className="m-tank-rim" />
    </g>
  );
}

function ShockTag({ x, y, anchor, shock, drops }: { x: number; y: number; anchor: "start" | "middle" | "end"; shock: MachineView["shocks"][number]; drops: [number, number] }) {
  const up = shock.dir > 0;
  return (
    <g>
      <Drops x={drops[0]} y={drops[1]} kind={up ? "shock" : "leak"} />
      <text x={x} y={y} className="m-t-xs m-strong" textAnchor={anchor}>
        {shock.name}
        <tspan className={up ? "m-tone-warn" : "m-tone-bad"}> {up ? "▲" : "▼"} {shock.text}</tspan>
      </text>
    </g>
  );
}

