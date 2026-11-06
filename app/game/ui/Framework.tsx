"use client";

import { useEffect, useMemo, useRef } from "react";
import { getPreset } from "../../model/presets";
import type { QuarterState } from "../../model/types";
import { explain } from "../explain";
import { channels, deltaTail, diagnose, policyTouched, SECTORS, unitTail, untouchedConfig, type Channel, type ChannelStatus, type FrameworkInput, type RowMeta, type Sector } from "../framework";
import { forecastFor, useGame, type FrameworkTab } from "../store";
import { useTurn } from "../useTurn";
import Decomp from "./Decomp";

const TABS: { id: FrameworkTab; label: string; sub: string }[] = [
  { id: "why", label: "Why", sub: "Is it moving, or not?" },
  { id: "path", label: "Shocks vs policy", sub: "What caused the path" },
  { id: "channels", label: "Channels", sub: "How levers reach the economy" },
  { id: "accounts", label: "Sector accounts", sub: "Every indicator, every sector" },
];

/** One headline indicator per sector for the overview. */
const OVERVIEW: { sector: Sector["id"]; key: RowMeta["key"] }[] = [
  { sector: "real", key: "growth" },
  { sector: "prices", key: "infl" },
  { sector: "fiscal", key: "debt" },
  { sector: "external", key: "ca" },
];

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
  const tab = useGame((s) => s.frameworkTab);
  const setTab = useGame((s) => s.setFrameworkTab);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setFramework(false);
      }
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length && !(e.target as HTMLElement | null)?.closest("input, textarea")) setTab(TABS[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFramework, setTab]);

  return (
    <div className="game-modal-backdrop game-fw-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setFramework(false)}>
      <div className="game-card game-fw" role="dialog" aria-modal="true" aria-labelledby="fw-title">
        <header className="game-fw-head">
          <div className="min-w-0">
            <p className="game-eyebrow !mb-0">Macro framework · {preset.name}</p>
            <h2 id="fw-title" className="font-display text-(length:--t-lg) font-semibold leading-tight">How the whole economy fits together</h2>
            <p className="mt-1 text-(length:--t-xs) leading-snug text-[var(--lab-ink-2)]">
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

        <nav className="game-fw-tabs" role="tablist" aria-label="Macro framework views">
          {TABS.map((t, i) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
              <span className="game-fw-tab-n" aria-hidden="true">{i + 1}</span>
              <span>
                <strong>{t.label}</strong>
                <small>{t.sub}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="game-fw-body">
        {tab === "why" ? (
          <section className="game-fw-section" aria-label="Why is it moving, or not?">
            {notes.length ? (
              <ul className="game-fw-notes">
                {notes.map((n) => (
                  <li key={n.id} className={`game-fw-note is-${n.tone}`}>
                    <strong>{n.title}</strong>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="game-fw-sub">Nothing unusual: the economy is responding the way the channels suggest.</p>
            )}
            <div className="game-fw-legend mt-3" aria-hidden="true">
              <span><i className="is-actual" /> Outturn</span>
              <span><i className="is-forecast" /> Forecast with your policies</span>
              {touched ? <span><i className="is-untouched" /> Had you changed nothing</span> : null}
            </div>
            <div className="game-fw-overview">
              {OVERVIEW.map(({ sector, key }) => {
                const row = SECTORS.find((x) => x.id === sector)!.rows.find((r) => r.key === key)!;
                const effect = forecast[end][key] - untouched[end][key];
                return (
                  <button key={key} type="button" className="game-fw-tile" onClick={() => { setTab("accounts"); window.setTimeout(() => document.getElementById(`fw-sector-${sector}`)?.scrollIntoView({ block: "start" }), 50); }} title="Open this sector's accounts">
                    <span className="game-fw-tile-sector">
                      {SECTORS.find((x) => x.id === sector)!.title}
                      <span aria-hidden="true" className="game-fw-tile-go">→</span>
                    </span>
                    <span className="game-fw-tile-label">{row.label}</span>
                    <span className="game-fw-tile-value">
                      {shown[key].toFixed(row.digits)}
                      <small>{unitTail(row.unit)}</small>
                    </span>
                    <Spark rowKey={key} actual={actual} forecast={forecast} untouched={touched ? untouched : null} clock={clock} end={end} />
                    <span className="game-fw-tile-foot">
                      {forecast[end].label}: {forecast[end][key].toFixed(row.digits)}
                      {touched && Math.abs(effect) >= 0.05 ? <b className={row.good ? (Math.sign(effect) === row.good ? "is-good" : "is-bad") : ""}> · yours {effect > 0 ? "+" : ""}{effect.toFixed(row.digits)}</b> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="game-fw-next">
              <span>Dig deeper:</span>
              <button type="button" onClick={() => setTab("path")}>2 · What caused the path</button>
              <button type="button" onClick={() => setTab("channels")}>3 · How your levers reach the economy</button>
              <button type="button" onClick={() => setTab("accounts")}>4 · Every indicator</button>
            </div>
          </section>
        ) : null}

        {tab === "path" ? (
          <section className="game-fw-section" aria-label="Shocks against your instruments">
            <Decomp />
          </section>
        ) : null}

        {tab === "channels" ? (
          <section className="game-fw-section" aria-label="How policy and shocks reach each sector">
            <PaletteKey />
            <p className="game-fw-sub">Each channel is a chain from a lever or a shock to the economy. Bars show what flowed through it in {shown.label}: demand in pp of the output gap, inflation in pp, debt in pp of GDP.</p>
            <div className="game-fw-channels">
              {chans.map((c) => (
                <ChannelCard key={c.id} channel={c} />
              ))}
            </div>
          </section>
        ) : null}

        {tab === "accounts" ? (
          <section className="game-fw-section" aria-label="The four sector accounts">
            <div className="game-fw-legend" aria-hidden="true">
              <span><i className="is-actual" /> Outturn</span>
              <span><i className="is-forecast" /> Forecast with your policies</span>
              {touched ? <span><i className="is-untouched" /> Had you changed nothing</span> : null}
              <span className="ml-auto">“Your policies” = forecast minus the no-change path, at {forecast[end].label}</span>
              <span className="game-fw-valence"><b className="game-fw-effect is-good">▲▼ helps a goal</b><b className="game-fw-effect is-bad">▲▼ hurts a goal</b><b className="game-fw-effect is-neutral">▲▼ neither</b></span>
            </div>
            <nav className="game-fw-jump" aria-label="Jump to a sector">
              {SECTORS.map((sec) => (
                <button key={sec.id} type="button" onClick={() => document.getElementById(`fw-sector-${sec.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  {sec.title}
                </button>
              ))}
            </nav>
            <div className="game-fw-sectors">
              {SECTORS.map((s) => (
                <SectorCard key={s.id} sector={s} actual={actual} forecast={forecast} untouched={untouched} clock={clock} end={end} touched={touched} shown={shown} />
              ))}
            </div>
          </section>
        ) : null}

        {tab === "accounts" ? (
          <p className="game-fw-foot">
            The same accounts must add up across sectors: a budget deficit is borrowed (fiscal) at a spread set by markets (external), a weaker currency raises inflation (prices) and foreign-currency debt (fiscal), and every demand push shows up in output and jobs (real). That is why one lever moves everything.
          </p>
        ) : null}
        </div>
      </div>
    </div>
  );
}

function PaletteKey() {
  return (
    <p className="game-fw-palette" aria-label="Colour key">
      <span><i className="is-policy" /> Your instruments</span>
      <span><i className="is-env" /> Shocks and the world</span>
      <span><i className="is-mixed" /> Expectations, markets, the currency</span>
    </p>
  );
}

function ChannelCard({ channel: c }: { channel: Channel }) {
  const max = Math.max(0.25, ...c.links.map((l) => Math.abs(l.value)));
  return (
    <article className={`game-fw-channel is-${c.status} ${c.id === "world" ? "is-env" : c.id === "confidence" || c.id === "currency" || c.status === "idle" || c.status === "blocked" ? "is-mixed" : "is-policy"}`}>
      <header className="flex items-start justify-between gap-2">
        <h4 className="text-(length:--t-xs) font-semibold leading-tight">{c.title}</h4>
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
      <p className="game-fw-note-clamp text-(length:--t-xs) leading-snug text-[var(--lab-ink-2)]" title={c.note}>{c.note}</p>
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

/** Which family a driver belongs to, so bars share the decomposition's colours. */
const DRIVER_KIND: Record<string, "policy" | "env" | "mixed" | "momentum"> = {
  monetary: "policy",
  fiscal: "policy",
  primary: "policy",
  external: "env",
  commodities: "env",
  shocks: "env",
  oil: "env",
  fading: "momentum",
};

function Bar({ value, max, kind }: { value: number; max: number; kind?: "policy" | "env" | "mixed" | "momentum" }) {
  return (
    <span className="game-why-track" aria-hidden="true">
      {Math.abs(value) >= 0.005 ? <span className={`game-why-bar ${value > 0 ? "is-pos" : "is-neg"} ${kind ? `is-kind-${kind}` : ""}`} style={{ width: `${Math.min(50, (Math.abs(value) / max) * 50)}%`, [value > 0 ? "left" : "right"]: "50%" }} /> : null}
    </span>
  );
}

function SectorCard({ sector, actual, forecast, untouched, clock, end, touched, shown }: { sector: Sector; actual: QuarterState[]; forecast: QuarterState[]; untouched: QuarterState[]; clock: number; end: number; touched: boolean; shown: QuarterState }) {
  const prevShown = clock > 0 ? actual[clock - 1] : actual[0];
  return (
    <article className="game-fw-sector" id={`fw-sector-${sector.id}`}>
      <h4 className="text-(length:--t-sm) font-semibold">{sector.title}</h4>
      <p className="mb-2 text-(length:--t-xs) leading-snug text-[var(--lab-ink-2)]">{sector.blurb}</p>
      <table className="game-fw-table">
        <thead>
          <tr>
            <th scope="col">Indicator</th>
            <th scope="col" className="game-fw-spark-col">
              <span className="sr-only">Path</span>
            </th>
            <th scope="col">Now</th>
            <th scope="col" className="game-fw-dq" title="Change on the previous quarter">Δ qtr</th>
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
      <td className={`tabular-nums game-fw-dq ${Math.abs(dq) < 0.5 * Math.pow(10, -row.digits) ? "is-flat" : ""}`}>
        {signed(dq, row.digits)}
      </td>
      <td className="tabular-nums">{fmt(endV, row.digits)}</td>
      <td className={`tabular-nums game-fw-effect ${!touched || Math.abs(effect) < 0.5 * Math.pow(10, -row.digits) ? "is-flat" : `${effect > 0 ? "is-up" : "is-down"} ${row.good ? (Math.sign(effect) === row.good ? "is-good" : "is-bad") : ""}`}`} title={row.good ? (row.good > 0 ? "Higher is better" : "Lower is better") : "Neither direction is good in itself"}>
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
      <line x1={0} x2={SW} y1={y(past[0])} y2={y(past[0])} stroke="var(--lab-line)" strokeDasharray="2 2" />
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
                <Bar value={p.value} max={max} kind="mixed" />
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
            <Bar value={p.value} max={max} kind={DRIVER_KIND[p.key] ?? "mixed"} />
            <span className="text-right font-mono tabular-nums">{signed(p.value, 2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
