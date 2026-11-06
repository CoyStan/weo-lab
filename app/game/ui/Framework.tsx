"use client";

import { useEffect, useMemo, useRef } from "react";
import { getPreset } from "../../model/presets";
import type { QuarterState } from "../../model/types";
import { explain } from "../explain";
import { channels, deltaTail, diagnose, policyTouched, SECTORS, unitTail, untouchedConfig, type Channel, type ChannelStatus, type FrameworkInput, type RowMeta, type Sector } from "../framework";
import { forecastFor, useGame } from "../store";
import { useTurn } from "../useTurn";
import Decomp from "./Decomp";

const STATUS_WORD: Record<ChannelStatus, string> = { active: "Working", weak: "Muted", blocked: "Blocked", idle: "Idle" };

const fmt = (v: number, d: number) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : v.toFixed(d));
const signed = (v: number, d: number) => {
  const s = fmt(v, d);
  return v > 0 && s !== (0).toFixed(d) ? `+${s}` : s;
};

/** Every sector, every channel, and why things are (or aren't) moving. */
export default function Framework() {
  const open = useGame((s) => s.framework);
  if (!open) return null;
  return <FrameworkPanel />;
}

function FrameworkPanel() {
  const setFramework = useGame((s) => s.setFramework);
  const turns = useGame((s) => s.turns);
  const { mission, config, clock, actual, forecast, policy, policyStart } = useTurn();
  const start = turns[0] ?? config;
  const end = mission.quarters;
  const touched = policyTouched(config, start);
  const untouched = useMemo(() => (touched ? forecastFor(untouchedConfig(config, start), clock) : forecast), [touched, config, start, clock, forecast]);
  const input: FrameworkInput = { config, actual, forecast, untouched, clock, end, policy, policyStart, changedSinceStart: touched };
  const chans = channels(input);
  const notes = diagnose(input);
  const preset = getPreset(config.presetId);
  const shown = clock > 0 ? actual[clock] : forecast[1];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setFramework(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFramework]);

  return (
    <div className="game-modal-backdrop game-fw-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setFramework(false)}>
      <div className="game-card game-fw" role="dialog" aria-modal="true" aria-labelledby="fw-title">
        <header className="game-fw-head">
          <div className="min-w-0">
            <p className="game-eyebrow !mb-0">Macro framework · {preset.name}</p>
            <h2 id="fw-title" className="font-display text-[1.35rem] font-semibold leading-tight">How the whole economy fits together</h2>
            <p className="mt-1 text-[0.74rem] leading-snug text-[var(--lab-ink-2)]">
              {clock > 0 ? (
                <>Mechanics of <strong>{shown.label}</strong>, the quarter just played. Forecasts run to {forecast[end].label}, the end of the mission.</>
              ) : (
                <>Nothing has been played yet: mechanics shown are the forecast for <strong>{shown.label}</strong>. Forecasts run to {forecast[end].label}.</>
              )}
            </p>
          </div>
          <button ref={closeRef} type="button" className="lab-btn lab-btn-soft lab-btn-sm shrink-0" onClick={() => setFramework(false)}>
            Close <kbd className="game-fw-kbd">Esc</kbd>
          </button>
        </header>

        {notes.length ? (
          <section className="game-fw-section" aria-labelledby="fw-why">
            <h3 id="fw-why" className="game-fw-h">Why is it moving, or not?</h3>
            <ul className="game-fw-notes">
              {notes.map((n) => (
                <li key={n.id} className={`game-fw-note is-${n.tone}`}>
                  <strong>{n.title}</strong>
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="game-fw-section" aria-labelledby="fw-dc">
          <h3 id="fw-dc" className="game-fw-h">Where the path comes from: shocks against your instruments</h3>
          <Decomp />
        </section>

        <section className="game-fw-section" aria-labelledby="fw-chan">
          <h3 id="fw-chan" className="game-fw-h">How policy and shocks reach each sector</h3>
          <p className="game-fw-sub">Each channel is a chain. Bars show what flowed through it in {shown.label}: demand in pp of the output gap, inflation in pp, debt in pp of GDP.</p>
          <div className="game-fw-channels">
            {chans.map((c) => (
              <ChannelCard key={c.id} channel={c} />
            ))}
          </div>
        </section>

        <section className="game-fw-section" aria-labelledby="fw-sec">
          <h3 id="fw-sec" className="game-fw-h">The four sector accounts</h3>
          <div className="game-fw-legend" aria-hidden="true">
            <span><i className="is-actual" /> Outturn</span>
            <span><i className="is-forecast" /> Forecast with your policies</span>
            {touched ? <span><i className="is-untouched" /> Had you changed nothing</span> : null}
            <span className="ml-auto">“Your policies” = forecast minus the no-change path, at {forecast[end].label}</span>
          </div>
          <div className="game-fw-sectors">
            {SECTORS.map((s) => (
              <SectorCard key={s.id} sector={s} actual={actual} forecast={forecast} untouched={untouched} clock={clock} end={end} touched={touched} shown={shown} />
            ))}
          </div>
        </section>

        <p className="game-fw-foot">
          The same accounts must add up across sectors: a budget deficit is borrowed (fiscal) at a spread set by markets (external), a weaker currency raises inflation (prices) and foreign-currency debt (fiscal), and every demand push shows up in output and jobs (real). That is why one lever moves everything.
        </p>
      </div>
    </div>
  );
}

function ChannelCard({ channel: c }: { channel: Channel }) {
  const max = Math.max(0.25, ...c.links.map((l) => Math.abs(l.value)));
  return (
    <article className={`game-fw-channel is-${c.status}`}>
      <header className="flex items-start justify-between gap-2">
        <h4 className="text-[0.82rem] font-semibold leading-tight">{c.title}</h4>
        <span className={`game-fw-pill is-${c.status}`}>{STATUS_WORD[c.status]}</span>
      </header>
      <ol className="game-fw-chain" aria-label="Transmission chain">
        {c.chain.map((step, i) => (
          <li key={step}>
            {step}
            {i < c.chain.length - 1 ? <span aria-hidden="true"> →</span> : null}
          </li>
        ))}
      </ol>
      <p className="text-[0.7rem] leading-snug text-[var(--lab-ink-2)]">{c.note}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {c.links.map((l) => (
          <li key={l.label} className="game-fw-link">
            <span className="truncate" title={l.label}>{l.label}</span>
            <Bar value={l.value} max={max} />
            <span className="text-right font-mono tabular-nums">{signed(l.value, 2)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="game-why-track" aria-hidden="true">
      {Math.abs(value) >= 0.005 ? <span className={`game-why-bar ${value > 0 ? "is-pos" : "is-neg"}`} style={{ width: `${Math.min(50, (Math.abs(value) / max) * 50)}%`, [value > 0 ? "left" : "right"]: "50%" }} /> : null}
    </span>
  );
}

function SectorCard({ sector, actual, forecast, untouched, clock, end, touched, shown }: { sector: Sector; actual: QuarterState[]; forecast: QuarterState[]; untouched: QuarterState[]; clock: number; end: number; touched: boolean; shown: QuarterState }) {
  const prevShown = clock > 0 ? actual[clock - 1] : actual[0];
  return (
    <article className="game-fw-sector">
      <h4 className="text-[0.92rem] font-semibold">{sector.title}</h4>
      <p className="mb-2 text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">{sector.blurb}</p>
      <table className="game-fw-table">
        <thead>
          <tr>
            <th scope="col">Indicator</th>
            <th scope="col" className="game-fw-spark-col">
              <span className="sr-only">Path</span>
            </th>
            <th scope="col">Now</th>
            <th scope="col" title="Change on the previous quarter">Δ qtr</th>
            <th scope="col" title={`Forecast for ${forecast[end].label}`}>{forecast[end].label}</th>
            <th scope="col" title="Forecast with your policies minus forecast had you changed nothing">Your policies</th>
          </tr>
        </thead>
        <tbody>
          {sector.rows.map((r) => (
            <Row key={r.key} row={r} actual={actual} forecast={forecast} untouched={untouched} clock={clock} end={end} touched={touched} shown={shown} prev={prevShown} />
          ))}
        </tbody>
      </table>
      <SectorDrivers id={sector.id} shown={shown} prev={prevShown} />
    </article>
  );
}

function Row({ row, actual, forecast, untouched, clock, end, touched, shown, prev }: { row: RowMeta; actual: QuarterState[]; forecast: QuarterState[]; untouched: QuarterState[]; clock: number; end: number; touched: boolean; shown: QuarterState; prev: QuarterState }) {
  const v = shown[row.key];
  const dq = v - prev[row.key];
  const endV = forecast[end][row.key];
  const effect = endV - untouched[end][row.key];
  return (
    <tr>
      <th scope="row" title={row.plain}>
        {row.label}
      </th>
      <td className="game-fw-spark-col">
        <Spark rowKey={row.key} actual={actual} forecast={forecast} untouched={touched ? untouched : null} clock={clock} end={end} />
      </td>
      <td className="tabular-nums">
        {fmt(v, row.digits)}
        <span className="game-fw-unit">{unitTail(row.unit)}</span>
      </td>
      <td className={`tabular-nums ${Math.abs(dq) < 0.5 * Math.pow(10, -row.digits) ? "is-flat" : ""}`}>
        {signed(dq, row.digits)}
      </td>
      <td className="tabular-nums">{fmt(endV, row.digits)}</td>
      <td className={`tabular-nums game-fw-effect ${!touched || Math.abs(effect) < 0.5 * Math.pow(10, -row.digits) ? "is-flat" : effect > 0 ? "is-up" : "is-down"}`}>
        {touched ? (
          <>
            {Math.abs(effect) >= 0.5 * Math.pow(10, -row.digits) ? (effect > 0 ? "▲ " : "▼ ") : ""}
            {signed(effect, row.digits)}
            {deltaTail(row.unit)}
          </>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

const SW = 96;
const SH = 26;

function Spark({ rowKey, actual, forecast, untouched, clock, end }: { rowKey: RowMeta["key"]; actual: QuarterState[]; forecast: QuarterState[]; untouched: QuarterState[] | null; clock: number; end: number }) {
  const past = actual.slice(0, clock + 1).map((s) => s[rowKey]);
  const fut = forecast.slice(clock, end + 1).map((s) => s[rowKey]);
  const un = untouched ? untouched.slice(0, end + 1).map((s) => s[rowKey]) : [];
  const differs = un.some((v, i) => Math.abs(v - (i <= clock ? past[i] : fut[i - clock])) > 0.01);
  const values = [...past, ...fut, ...(differs ? un : [])];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1e-6) {
    lo -= 0.5;
    hi += 0.5;
  }
  const x = (t: number) => 2 + (t / end) * (SW - 4);
  const y = (v: number) => 2 + (1 - (v - lo) / (hi - lo)) * (SH - 4);
  const line = (vals: number[], from: number) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(from + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} width={SW} height={SH} className="block" aria-hidden="true">
      {lo < 0 && hi > 0 ? <line x1={0} x2={SW} y1={y(0)} y2={y(0)} stroke="var(--lab-line)" strokeDasharray="2 2" /> : null}
      {differs ? <path d={line(un, 0)} fill="none" stroke="var(--lab-ink-2)" strokeOpacity={0.6} strokeWidth={1.4} strokeDasharray="1.2 2.4" strokeLinecap="round" /> : null}
      {fut.length > 1 ? <path d={line(fut, clock)} fill="none" stroke="var(--lab-scenario)" strokeWidth={1.6} strokeDasharray="4 2.5" /> : null}
      <path d={line(past, 0)} fill="none" stroke="var(--lab-ink)" strokeWidth={1.7} strokeLinejoin="round" />
      <circle cx={x(clock)} cy={y(past[past.length - 1])} r={2} fill="var(--lab-ink)" />
    </svg>
  );
}

/** What moved the sector's headline variable in the quarter shown. */
function SectorDrivers({ id, shown, prev }: { id: Sector["id"]; shown: QuarterState; prev: QuarterState }) {
  if (id === "external") {
    const absorbed = shown.pressure - shown.dE;
    const parts = [
      { label: "Pressure on the currency, %", value: shown.pressure },
      { label: "… taken as depreciation, %", value: shown.dE },
      { label: "… absorbed with reserves, %", value: absorbed },
      { label: "Reserves, change in months", value: shown.reserves - prev.reserves },
      { label: "IMF money in, % of GDP", value: shown.imfDisb },
    ].filter((p) => Math.abs(p.value) >= 0.01);
    const max = Math.max(0.25, ...parts.map((p) => Math.abs(p.value)));
    return (
      <div className="game-fw-drivers">
        <p>Where currency pressure went in {shown.label} ({shown.regime === "peg" ? "pegged" : shown.regime === "managed" ? "managed float" : "floating"}):</p>
        {parts.length ? (
          <ul>
            {parts.map((p) => (
              <li key={p.label} className="game-fw-link">
                <span className="truncate" title={p.label}>{p.label}</span>
                <Bar value={p.value} max={max} />
                <span className="text-right font-mono tabular-nums">{signed(p.value, 2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No pressure this quarter.</p>
        )}
      </div>
    );
  }
  const key = id === "real" ? "growth" : id === "prices" ? "infl" : "debt";
  const { parts, subject, unit } = explain(key, shown);
  const total = key === "growth" ? shown.gap - prev.gap : key === "infl" ? shown.infl - prev.infl : shown.debt - prev.debt;
  const max = Math.max(0.1, ...parts.map((p) => Math.abs(p.value)));
  return (
    <div className="game-fw-drivers">
      <p>
        {subject} moved {signed(total, 2)} {unit} in {shown.label}. What pushed it:
      </p>
      <ul>
        {parts.slice(0, 5).map((p) => (
          <li key={p.key} className="game-fw-link">
            <span className="truncate" title={p.label}>{p.label}</span>
            <Bar value={p.value} max={max} />
            <span className="text-right font-mono tabular-nums">{signed(p.value, 2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
