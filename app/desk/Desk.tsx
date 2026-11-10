"use client";

// The scenario desk screen: pick an economy, set up to three scenarios (each
// with a size and a policy response), argue about them, then compare the model's
// answer with the baseline in charts and a WEO-style annual table.

import { useEffect, useMemo, useState } from "react";
import { quarterLabel } from "../model/economy";
import { FRAMEWORK, WEO } from "../game/data";
import { sectorTables } from "./framework";
import { useGame } from "../game/store";
import { useBox } from "../next/Chart";
import { annual, baselineFor, DESK_METRICS, DESK_QUARTERS, deviation, economies, findings, layered, responsesFor, run, SCENARIOS, SIZES, slotConfig, slotLabel, toCsv, years, type DeskMetric, type Run, type Size, type Slot } from "./logic";
import "./desk.css";

const LETTERS = ["A", "B", "C"];
const DEFAULTS: Slot[] = [
  { scenario: "tight-money", size: "standard", response: "none" },
  { scenario: "oil", size: "standard", response: "none" },
  { scenario: "world-slowdown", size: "standard", response: "support" },
];

const fmt = (v: number, digits: number) => (Math.abs(v) < 0.5 * Math.pow(10, -digits) ? (0).toFixed(digits) : v.toFixed(digits));
const signed = (v: number, digits: number) => `${v > 0 && fmt(v, digits) !== (0).toFixed(digits) ? "+" : ""}${fmt(v, digits).replace("-", "−")}`;

export default function Desk() {
  const setScreen = useGame((s) => s.setScreen);
  const list = useMemo(() => economies(WEO), []);
  const [economyId, setEconomyId] = useState("aurelia");
  const [slots, setSlots] = useState<Slot[]>([DEFAULTS[0]]);
  const [view, setView] = useState<"diff" | "levels">("diff");
  // Teaching: the result stays covered until the room has made its call.
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const economy = list.find((e) => e.id === economyId) ?? list[0];
  const base = useMemo(() => run(baselineFor(WEO, economyId)), [economyId]);
  const responses = useMemo(() => responsesFor(base.config), [base]);
  // A response the new economy cannot use falls back to "no extra response".
  const clean = slots.map((s) => (responses.some((r) => r.id === s.response) ? s : { ...s, response: "none" }));
  const runs = useMemo(() => clean.map((slot) => ({ slot, label: slotLabel(slot), run: layered(base, slotConfig(base.config, slot)) })), [base, JSON.stringify(clean)]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSlot = (i: number, patch: Partial<Slot>) => {
    setSlots(clean.map((s, k) => (k === i ? { ...s, ...patch } : s)));
    setRevealed(false);
  };
  const ys = years(base.config);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target as HTMLElement | null)?.closest("button, select, a, summary, input")) setRevealed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const csv = () => {
    const text = toCsv(economy.name, base, runs.map((r) => ({ label: r.label, run: r.run })));
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `scenario-desk-${economy.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    const lines = [`${economy.name}: scenarios against baseline (illustrative model results, not a forecast)`];
    for (const r of runs) {
      lines.push(`\n${r.label}`);
      for (const f of findings(base.path, r.run.path)) lines.push(`- ${f.label}: ${signed(f.peak, f.unit === "bp" ? 0 : 1)} ${f.unit} at its largest (${quarterLabel(f.t)}), ${signed(f.end, f.unit === "bp" ? 0 : 1)} ${f.unit} after five years`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the CSV export still works.
    }
  };

  return (
    <div className="dk">
      <header className="dk-head">
        <div>
          <p className="dk-kicker">Scenario desk</p>
          <h1 className="dk-title">What if? Scenarios against the baseline</h1>
        </div>
        <label className="dk-pick">
          <span>Economy</span>
          <select className="lab-select" value={economyId} onChange={(e) => { setEconomyId(e.target.value); setRevealed(false); }}>
            {(["Stylised economies", "Countries (WEO baseline)"] as const).map((g) => (
              <optgroup key={g} label={g}>
                {list.filter((e) => e.group === g).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="dk-head-actions">
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={() => setScreen("missions")}>Back to the game</button>
        </div>
      </header>

      <p className="dk-honest">
        <strong>Read this as a teaching model, not a forecast.</strong> {economy.note}{" "}Each scenario is the model&apos;s response layered on that baseline, as in a WEO scenario box. Sizes are illustrative.
      </p>

      <main className="dk-body">
        <aside className="dk-setup" aria-label="Scenarios">
          {clean.map((slot, i) => {
            const sc = SCENARIOS.find((s) => s.id === slot.scenario) ?? SCENARIOS[0];
            const r = responses.find((x) => x.id === slot.response) ?? responses[0];
            return (
              <section key={i} className={`dk-slot is-${LETTERS[i].toLowerCase()}`}>
                <header className="dk-slot-head">
                  <span className="dk-letter" aria-hidden="true">{LETTERS[i]}</span>
                  <h2>Scenario {LETTERS[i]}</h2>
                  {clean.length > 1 ? (
                    <button type="button" className="dk-remove" onClick={() => { setSlots(clean.filter((_, k) => k !== i)); }} aria-label={`Remove scenario ${LETTERS[i]}`}>Remove</button>
                  ) : null}
                </header>
                <label className="dk-field">
                  <span>What happens</span>
                  <select className="lab-select" value={slot.scenario} onChange={(e) => setSlot(i, { scenario: e.target.value })}>
                    {SCENARIOS.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </label>
                <p className="dk-assumes">{sc.assumes}</p>
                <div className="dk-row">
                  <label className="dk-field">
                    <span>How big</span>
                    <select className="lab-select" value={slot.size} onChange={(e) => setSlot(i, { size: e.target.value as Size })}>
                      {(Object.keys(SIZES) as Size[]).map((k) => (
                        <option key={k} value={k}>{SIZES[k].label}{k === "standard" ? "" : ` (×${SIZES[k].scale})`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="dk-field">
                    <span>Policy response</span>
                    <select className="lab-select" value={slot.response} onChange={(e) => setSlot(i, { response: e.target.value })}>
                      {responses.map((x) => (
                        <option key={x.id} value={x.id}>{x.title}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="dk-assumes">{r.plain}</p>
                <details className="dk-discuss" open={i === 0}>
                  <summary>Before you look: channels and questions</summary>
                  <p className="dk-sub">How it reaches the economy</p>
                  <ul>{sc.channels.map((c) => <li key={c}>{c}</li>)}</ul>
                  <p className="dk-sub">Argue about</p>
                  <ul>{sc.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                </details>
              </section>
            );
          })}
          {clean.length < 3 ? (
            <button type="button" className="lab-btn lab-btn-soft lab-btn-md dk-add" onClick={() => { setSlots([...clean, DEFAULTS[clean.length]]); setRevealed(false); }}>
              + Add scenario {LETTERS[clean.length]} to compare
            </button>
          ) : null}
        </aside>

        <section className="dk-results" aria-label="Results">
          {economyId.startsWith("today:") ? <CountryData iso={economyId.slice(6)} name={economy.name} /> : null}
          {!revealed ? (
            <div className="dk-cover">
              <h2>Make your call first</h2>
              <p>Which indicators will move most, in which direction, and when? Say it out loud, then look.</p>
              <button type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={() => setRevealed(true)}>
                Show what the model says <kbd aria-hidden="true">Enter</kbd>
              </button>
            </div>
          ) : (
            <>
              <div className="dk-findings">
                {runs.map((r, i) => {
                  const f = findings(base.path, r.run.path);
                  return (
                    <article key={i} className={`dk-finding is-${LETTERS[i].toLowerCase()}`}>
                      <h3><span className="dk-letter" aria-hidden="true">{LETTERS[i]}</span> {r.label}</h3>
                      {f.length ? (
                        <ul>
                          {f.map((x) => (
                            <li key={x.key}>
                              <strong>{x.label}</strong> {x.peak > 0 ? "▲" : "▼"} {signed(x.peak, x.unit === "bp" ? 0 : 1)} {x.unit} at its largest, in {quarterLabel(x.t)}
                              {Math.abs(x.end) < Math.abs(x.peak) * 0.25 ? "; it fades" : `; ${signed(x.end, x.unit === "bp" ? 0 : 1)} ${x.unit} after five years`}.
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Barely moves this economy.</p>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="dk-toolbar">
                <div className="dk-toggle" role="group" aria-label="What the charts show">
                  <button type="button" aria-pressed={view === "diff"} onClick={() => setView("diff")}>Difference from baseline</button>
                  <button type="button" aria-pressed={view === "levels"} onClick={() => setView("levels")}>Levels</button>
                </div>
                <p className="dk-legend" aria-hidden="true">
                  <span><i className="dk-key is-base" /> baseline</span>
                  {runs.map((_, i) => (
                    <span key={i}><i className={`dk-key is-${LETTERS[i].toLowerCase()}`} /> scenario {LETTERS[i]}</span>
                  ))}
                </p>
                <div className="dk-head-actions">
                  <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={copy}>{copied ? "Copied" : "Copy summary"}</button>
                  <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={csv}>Download table (CSV)</button>
                </div>
              </div>

              <div className="dk-charts">
                {DESK_METRICS.map((m) => (
                  <DeskChart key={m.key} metric={m.key} label={m.label} unit={view === "diff" ? (m.key === "rer" ? "% vs baseline" : `${m.diff} vs baseline`) : m.unit} digits={m.digits} base={base} runs={runs.map((r) => r.run)} view={view} startYear={ys[0]} />
                ))}
              </div>

              <div className="dk-table-wrap">
                <table className="dk-table">
                  <caption>Annual figures: baseline, each scenario, and the difference. Stocks (debt, reserves, exchange rate) are year-end; the rest are yearly averages.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Indicator</th>
                      <th scope="col">Path</th>
                      {ys.map((y) => <th key={y} scope="col">{y}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {DESK_METRICS.map((m) => {
                      const b = annual(base.path, m.key, m.agg);
                      return [
                        <tr key={`${m.key}-b`} className="is-first">
                          <th scope="row" rowSpan={1 + runs.length * 2}>{m.label}<span>{m.unit}</span></th>
                          <td>Baseline</td>
                          {b.map((v, i) => <td key={i}>{fmt(v, m.digits)}</td>)}
                        </tr>,
                        ...runs.flatMap((r, k) => {
                          const a = annual(r.run.path, m.key, m.agg);
                          return [
                            <tr key={`${m.key}-${k}`}>
                              <td><span className={`dk-letter is-small is-${LETTERS[k].toLowerCase()}`} aria-hidden="true">{LETTERS[k]}</span> Scenario {LETTERS[k]}</td>
                              {a.map((v, i) => <td key={i}>{fmt(v, m.digits)}</td>)}
                            </tr>,
                            <tr key={`${m.key}-${k}-d`} className="is-diff">
                              <td>difference</td>
                              {a.map((v, i) => {
                                const d = m.key === "rer" ? (v / b[i] - 1) * 100 : v - b[i];
                                return <td key={i}>{signed(d, m.digits === 0 ? 0 : 1)}</td>;
                              })}
                            </tr>,
                          ];
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function DeskChart({ metric, label, unit, digits, base, runs, view, startYear }: { metric: DeskMetric; label: string; unit: string; digits: number; base: Run; runs: Run[]; view: "diff" | "levels"; startYear: number }) {
  const [ref, box] = useBox<HTMLDivElement>();
  const W = box.w;
  const H = 150;
  const PAD = { l: 38, r: 10, t: 8, b: 22 };
  const n = DESK_QUARTERS;
  const series = runs.map((r) => (view === "diff" ? deviation(base.path, r.path, metric) : r.path.map((s) => s[metric])));
  const baseLine = view === "diff" ? base.path.map(() => 0) : base.path.map((s) => s[metric]);
  const all = [...baseLine, ...series.flat()];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const min = digits === 0 ? 10 : 0.2;
  if (hi - lo < min) {
    const mid = (hi + lo) / 2;
    lo = mid - min / 2;
    hi = mid + min / 2;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const x = (t: number) => PAD.l + ((W - PAD.l - PAD.r) * t) / n;
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - lo) / (hi - lo));
  const d = (vals: number[]) => vals.map((v, t) => `${t ? "L" : "M"}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const summary = `${label}: ${runs.map((_, i) => `scenario ${LETTERS[i]} ${view === "diff" ? "differs from baseline by" : "ends at"} ${fmt(series[i][n], digits === 0 ? 0 : 1)} after five years`).join("; ")}.`;
  return (
    <figure className="dk-chart">
      <figcaption>
        <strong>{label}</strong> <span>{unit}</span>
      </figcaption>
      <div ref={ref} style={{ height: H }}>
        {W > 40 ? (
          <svg width={W} height={H} role="img" aria-label={summary}>
            {ticks.map((v, i) => (
              <g key={i}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="dk-grid" />
                <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="dk-tick">{fmt(v, digits === 0 ? 0 : 1)}</text>
              </g>
            ))}
            {Array.from({ length: n / 4 }, (_, i) => (
              <text key={i} x={x(1 + 4 * i)} y={H - 6} className="dk-tick">{String(startYear + i).slice(2).padStart(3, "'")}</text>
            ))}
            <path d={d(baseLine)} className="dk-line is-base" />
            {series.map((vals, i) => (
              <path key={i} d={d(vals)} className={`dk-line is-${LETTERS[i].toLowerCase()}`} />
            ))}
          </svg>
        ) : null}
      </div>
    </figure>
  );
}

/** The country's own framework from public data: four sectors, each with its identity and whether the published numbers satisfy it. */
function CountryData({ iso, name }: { iso: string; name: string }) {
  const tables = useMemo(() => sectorTables(FRAMEWORK, WEO, iso), [iso]);
  const checks = tables.filter((t) => t.check);
  const held = checks.filter((t) => t.check!.ok).length;
  return (
    <details className="dk-data">
      <summary>
        <strong>{name}&apos;s macro framework, from public data</strong>
        <span> · four sectors · {held} of {checks.length} identities add up within tolerance</span>
      </summary>
      <div className="dk-sectors">
        {tables.map((t) => (
          <section key={t.id} className="dk-sector">
            <h3>{t.title}{t.year ? <span> · {t.year}</span> : null}</h3>
            <p className="dk-identity">{t.identity}</p>
            {t.lines.length ? (
              <table>
                <tbody>
                  {t.lines.map((l) => (
                    <tr key={l.label} className={l.total ? "is-total" : ""}>
                      <th scope="row">{l.label}{l.note ? <span>{l.note}</span> : null}</th>
                      <td>{l.value === null ? "n/a" : `${fmt(l.value, l.unit === "ratio" ? 2 : 1)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {t.check ? <p className={`dk-check ${t.check.ok ? "is-ok" : "is-off"}`}><span aria-hidden="true">{t.check.ok ? "✓" : "▲"}</span> {t.check.text}</p> : null}
            {t.missing ? <p className="dk-assumes">{t.missing}</p> : null}
            <p className="dk-source">Source: {t.source}. % of GDP unless noted.</p>
          </section>
        ))}
      </div>
      <p className="dk-assumes">Data fetched {FRAMEWORK.fetched}. The scenarios below start from these balances for government, investment, money, credit, FDI and remittances; the model&apos;s behaviour (how strongly things respond) still uses typical values for this kind of economy.</p>
    </details>
  );
}
