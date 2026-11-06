"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { describeChanges, quarterLabel } from "../../model/economy";
import { SHOCKS } from "../../model/shocks";
import { getPreset } from "../../model/presets";
import { MISSIONS } from "../missions";
import { sound } from "../audio";
import { useSettings } from "../settings";
import { useGame } from "../store";
import { MoveStrip } from "./Goals";
import Glyph from "./Glyph";
import Capital from "./Capital";
import Reforms from "./Reforms";
import { Segmented } from "../../components/ui";
import { useTurn } from "../useTurn";
import { canAdopt } from "../politics";
import Advisors from "./Advisors";
import Goals from "./Goals";
import Levers from "./Levers";
import { attention } from "../pacing";
import { useLab, type FocusKey } from "../../store";
import { fmtNum, GAME_METRICS, unitShort } from "../metrics";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Play({ scene }: { scene: ReactNode }) {
  const { mission, clock, deciding, events, changed, statuses } = useTurn();
  const tips = useSettings((s) => s.tips);
  const [panel, setPanel] = useState<"levers" | "reforms">("levers");
  // Where the turn track's last fill started: when several quarters end at once
  // (Skip quiet quarters) they fill one after another instead of all together.
  const [sweep, setSweep] = useState({ clock, from: clock });
  if (sweep.clock !== clock) setSweep({ clock, from: Math.min(sweep.clock, clock) });
  const sweepStep = clock - sweep.from > 1 ? Math.min(60, 200 / (clock - sweep.from - 1)) : 0;
  const { books, config } = useTurn();
  const affordable = books
    ? mission.politics.institutions.filter((id) => canAdopt(id, mission.politics, config, { votes: books.votes, trust: books.trust }).ok).length
    : 0;
  const tense = mission.objectives.some((o) => !o.bonus && (statuses[o.id] === "at-risk" || statuses[o.id] === "failed"));
  useEffect(() => sound.setTense(tense), [tense]);
  // The island tags carry each goal's trouble too, so the map and the goal cards read as one system.
  const troubleKey = mission.objectives
    .filter((o) => !o.bonus && (statuses[o.id] === "at-risk" || statuses[o.id] === "failed"))
    .map((o) => `${o.metric}:${statuses[o.id]}`)
    .join("|");
  useEffect(() => {
    const out: Partial<Record<FocusKey, "at-risk" | "failed">> = {};
    for (const part of troubleKey ? troubleKey.split("|") : []) {
      const [metric, st] = part.split(":") as [FocusKey, "at-risk" | "failed"];
      if (out[metric] !== "failed") out[metric] = st;
    }
    useLab.setState({ districtStatus: out });
    return () => useLab.setState({ districtStatus: {} });
  }, [troubleKey]);
  const endQuarter = useGame((s) => s.endQuarter);
  const modal = useGame((s) => s.modal);
  const setScreen = useGame((s) => s.setScreen);
  const rewind = useGame((s) => s.rewind);
  const setFramework = useGame((s) => s.setFramework);
  const run = useGame((s) => s.run);
  const skipAhead = useGame((s) => s.skipAhead);
  const preset = getPreset(mission.presetId);
  const done = clock >= mission.quarters;
  const news = useMemo(() => events.filter((e) => e.quarter === clock && e.kind !== "decision"), [events, clock]);
  // Phones: the End bar is fixed to the bottom; its height becomes --game-footer-h, so the
  // scroll area can end clear of it (see game.css).
  const footRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = footRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => {
      const fixed = getComputedStyle(el).position === "fixed";
      root.style.setProperty("--game-footer-h", fixed ? `${Math.ceil(el.getBoundingClientRect().height)}px` : "0px");
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--game-footer-h");
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, select, textarea") || t.isContentEditable)) return;
      const game = useGame.getState();
      if (game.run) {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          game.stopRun();
        }
        return;
      }
      if ((e.key === "f" || e.key === "F") && !game.modal && !game.framework) {
        e.preventDefault();
        game.skipAhead();
        return;
      }
      if ((e.key === "m" || e.key === "M") && !game.modal) {
        e.preventDefault();
        game.setFramework(!game.framework);
        return;
      }
      if (e.key !== "Enter") return;
      if (t && t.closest("button, a, summary")) return;
      if (game.modal || game.framework) return;
      e.preventDefault();
      game.endQuarter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="game-play">
      <header className="game-hud">
        <button type="button" className="game-logo" onClick={() => setScreen("title")} aria-label="Back to the title screen">
          <img src={`${base}/brand/palari-logo.svg`} alt="" width={68} height={28} />
          <span className="game-wordmark" aria-hidden="true">
            <span className="is-long">WEO Scenario Lab</span>
            <span className="is-short">WEO Lab</span>
          </span>
        </button>
        <div className="min-w-0">
          <p className="game-eyebrow !mb-0">{mission.number ? `Mission ${mission.number} of ${MISSIONS.length} · ${preset.name}` : mission.kicker.length < 40 ? mission.kicker : preset.name}</p>
          <h1 className="truncate font-display text-(length:--t-lg) font-semibold leading-tight">{mission.title}</h1>
        </div>
        <div className="game-progress" aria-label={`Quarter ${Math.min(clock + 1, mission.quarters)} of ${mission.quarters}`}>
          <div className="game-progress-head">
            <strong>{done ? "Final quarter played" : `Deciding ${deciding}`}</strong>
            {!done ? <span className="tabular-nums">· {mission.quarters - clock - 1} left</span> : null}
          </div>
          <div className="game-progress-track">
            {Array.from({ length: mission.quarters }, (_, i) => {
              const q = i + 1;
              const shock = config.shocks.some((s) => !s.id.startsWith("surprise") && s.quarter === q);
              const election = mission.politics.elections.includes(q);
              return (
                <span
                  key={i}
                  className={`${i < clock ? "is-done" : i === clock ? "is-now" : ""} ${shock ? "has-shock" : ""} ${election ? "has-election" : ""}`}
                  style={i >= sweep.from && i < clock && sweepStep ? ({ "--sweep-delay": `${Math.round((i - sweep.from) * sweepStep)}ms` } as CSSProperties) : undefined}
                  title={`${quarterLabel(q)}${shock ? " · known shock" : ""}${election ? " · election" : ""}`}>
                  {(q - 1) % 4 === 0 ? <em>{quarterLabel(q).slice(0, 4)}</em> : null}
                </span>
              );
            })}
          </div>
          <NextUp />
        </div>
        <Capital />
        <div className="game-hud-actions ml-auto flex items-center justify-end gap-1.5">
          <button type="button" className="lab-btn lab-btn-sm game-fw-open" onClick={() => setFramework(true)} title="Every sector, every channel, and why things are or aren't moving (M)">
            <ChartIcon /> <span className="game-fw-open-label">Macro framework</span><span className="game-fw-open-short">Framework</span> <kbd className="game-fw-kbd">M</kbd>
          </button>
          {clock > 0 ? <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm game-hud-rewind" onClick={rewind} title="Go back one quarter and decide again">Rewind</button> : null}
          <HudMenu clock={clock} />
        </div>
      </header>

      <main id="main-content" className="game-grid">
        <aside className="game-col game-col-levers" aria-label="Your levers">
          <div className="game-levers-head mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            <h2 className="game-col-title !mb-0">{panel === "levers" ? "Your levers" : "Reforms"}</h2>
            <Segmented
              ariaLabel="Levers or reforms"
              value={panel}
              onChange={setPanel}
              options={[
                { value: "levers", label: "Levers" },
                { value: "reforms", label: affordable ? `Reforms · ${affordable}` : "Reforms" },
              ]}
            />
          </div>
          {tips && mission.number === 1 && clock === 0 && !changed ? <p className="game-coach">Move the policy rate and watch the blue forecast on each goal.</p> : null}
          <div className="game-agenda-top">
            <Agenda />
          </div>
          {panel === "levers" ? (
            <>
              <Levers />
              <DecisionLog />
              <Hint text={mission.hint} />
            </>
          ) : (
            <Reforms />
          )}
        </aside>

        <section className="game-stage" aria-label="Island">
          <div className="game-scene">
            {scene}
            <SceneStrip />
            {run ? <RunTicker /> : null}
            <div className="game-scene-news">
              {news.map((e, i) => (
                <div key={`${e.title}-${i}`} className={`game-toast is-${e.severity}`} role="status">
                  <strong>{e.title}</strong>
                  <span>{e.detail}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="game-stage-foot">
            <Advisors />
            <div className="game-end" ref={footRef}>
              <div className="game-agenda-bar">
                <Agenda />
              </div>
              <MoveStrip />
              <span className={`game-end-note ${modal || run ? "is-waiting" : ""}`}>
                {modal ? `Waiting: close the ${modal.kind === "recap" ? "recap" : modal.kind === "shock" ? "news card" : "debrief"} first.` : run ? "Waiting: quarters are playing." : changed ? "You changed policy this quarter." : "No changes: policy carries on as it is."}
              </span>
              <button type="button" className="game-end-btn" onClick={endQuarter} disabled={Boolean(modal) || done || Boolean(run)}>
                End {quarterLabel(clock + 1)}
                <kbd>Enter</kbd>
              </button>
              <button type="button" className="game-skip-btn" onClick={skipAhead} disabled={Boolean(modal) || done || Boolean(run)} title="Play quarter after quarter until something needs a decision (F)">
                Skip quiet quarters <Glyph name="skip" />
                <kbd>F</kbd>
              </button>
            </div>
          </div>
        </section>

        <aside className="game-col game-col-goals" aria-label="Goals">
          <h2 className="game-col-title">Goals</h2>
          <Goals />
          <FreePlayLink />
        </aside>
      </main>
    </div>
  );
}

/**
 * The goals' figures in one ruled strip along the island's top edge, so the island itself
 * keeps only the tag where something is happening (a pending decision or a district in
 * trouble) and the districts' animations carry the rest. Hidden when the player asks for
 * every tag on the island, or none.
 */
function SceneStrip() {
  const { actual, clock, policy } = useTurn();
  const spotlight = useLab((s) => s.spotlight);
  const labels = useLab((s) => s.labels);
  const troubled = useLab((s) => s.districtStatus);
  if (labels !== "focus") return null;
  const now = actual[clock];
  const pending = policy.rateMode === "manual" && now.regime !== "peg" && Math.abs(policy.manualRate - now.rate) > 0.01;
  const keys = spotlight.filter((k) => k in GAME_METRICS && !troubled[k] && !(k === "rate" && pending)) as (keyof typeof GAME_METRICS)[];
  if (!keys.length) return null;
  return (
    <p className="game-scene-strip" aria-label="On the island now">
      {keys.map((k) => {
        const meta = GAME_METRICS[k];
        const unit = unitShort(meta.unit);
        return (
          <span key={k}>
            {meta.label} <b className="tabular-nums">{fmtNum(now[k], k === "rate" ? 2 : meta.digits)}{unit === "%" ? "%" : unit}</b>
          </span>
        );
      })}
    </p>
  );
}

/** The next thing everyone can see coming: a known shock or an election. */
function NextUp() {
  const { mission, config, clock } = useTurn();
  const shock = config.shocks.filter((s) => !s.id.startsWith("surprise") && s.quarter > clock).sort((a, b) => a.quarter - b.quarter)[0];
  const election = mission.politics.elections.find((q) => q > clock);
  const items: { q: number; text: string; kind: string }[] = [];
  if (shock) items.push({ q: shock.quarter, text: SHOCKS[shock.kind].name, kind: "shock" });
  if (election) items.push({ q: election, text: "Election", kind: "election" });
  const next = items.sort((a, b) => a.q - b.q)[0];
  // An event this quarter is already on the agenda; the clock only names what's further out.
  if (!next || next.q === clock + 1) return null;
  return (
    <p className={`game-nextup is-${next.kind}`} title="Dots on the track: amber = known shock, violet = election">
      <span aria-hidden="true" className="game-nextup-dot" /> Next: {next.text}, {quarterLabel(next.q)}
      {next.q === clock + 1 ? <span className="game-nextup-now"> (this quarter)</span> : null}
    </p>
  );
}

/** The group's choices so far, newest first: a record to argue about. */
function DecisionLog() {
  const turns = useGame((s) => s.turns);
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  const start = turns[0];
  if (!start) return null;
  const inherited = new Set(start.decisions.map((d) => JSON.stringify(d)));
  const inheritedText = start.decisions.filter((d) => d.quarter === 0).map((d) => describeChanges(d.changes)).join(" · ");
  const mine = config.decisions.filter((d) => d.quarter >= 1 && d.quarter <= clock && !inherited.has(JSON.stringify(d))).sort((a, b) => b.quarter - a.quarter);
  return (
    <details className="game-log">
      <summary>Your decisions so far{mine.length ? ` · ${mine.length}` : ""}</summary>
      <table className="game-log-table">
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Decision</th>
          </tr>
        </thead>
        <tbody>
          {mine.slice(0, 8).map((d) => (
            <tr key={d.quarter}>
              <th scope="row">{quarterLabel(d.quarter)}</th>
              <td>{describeChanges(d.changes)}</td>
            </tr>
          ))}
          <tr className="is-start">
            <th scope="row">Start</th>
            <td>{inheritedText || "Policy as you found it"}</td>
          </tr>
        </tbody>
      </table>
    </details>
  );
}

/** Everything that isn't the turn: the framework (phones), sound, settings, missions, restart. */
function HudMenu({ clock }: { clock: number }) {
  const setScreen = useGame((s) => s.setScreen);
  const restart = useGame((s) => s.restart);
  const rewind = useGame((s) => s.rewind);
  const setFramework = useGame((s) => s.setFramework);
  const muted = useSettings((s) => s.muted);
  const setSettings = useSettings((s) => s.set);
  const setSettingsOpen = useSettings((s) => s.setOpen);
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");
  return (
    <details className="game-menu" ref={ref}>
      <summary className="lab-btn lab-btn-ghost lab-btn-sm" aria-label="Menu" title="Menu: framework, sound, settings, missions">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M2 3.5h12v1.5H2zM2 7.25h12v1.5H2zM2 11h12v1.5H2z" /></svg>
        <span className="game-menu-label">Menu</span>
      </summary>
      <div className="game-menu-list" role="menu">
        <button type="button" role="menuitem" className="game-menu-fw" onClick={() => { close(); setFramework(true); }}>Macro framework</button>
        {clock > 0 ? <button type="button" role="menuitem" className="game-menu-rewind" onClick={() => { close(); rewind(); }}>Rewind one quarter</button> : null}
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={!muted}
          onClick={() => {
            sound.unlock();
            setSettings({ muted: !muted });
            if (muted) window.setTimeout(() => sound.play("toggle"), 50);
          }}
        >
          Sound: {muted ? "off" : "on"}
        </button>
        <button type="button" role="menuitem" onClick={() => { close(); setSettingsOpen(true); }}>Settings</button>
        <button type="button" role="menuitem" onClick={() => setScreen("missions")}>All missions</button>
        <button type="button" role="menuitem" onClick={restart}>Restart this mission</button>
      </div>
    </details>
  );
}

function ChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M2 14h12M4 11V7M8 11V3M12 11V8" />
    </svg>
  );
}

/** What needs a decision this quarter, or a note that it is quiet. */
function Agenda() {
  const { mission, config, clock, statuses, forecast, actual, policy, books, deciding } = useTurn();
  if (clock >= mission.quarters) return null;
  const items = attention({ mission, config, clock, statuses, forecast, actual, policy, votes: books?.votes ?? 0 });
  if (!items.length) {
    return (
      <div className="game-agenda is-quiet" role="status">
        <strong>Quiet quarter</strong>
        <span>Nothing needs a decision. Skip ahead and the game stops when something happens.</span>
      </div>
    );
  }
  return (
    <div className="game-agenda" role="status">
      <strong>Decide now for {deciding}{items.length > 1 ? ` · ${items.length} things` : ""}</strong>
      {clock === 0 ? <span className="game-agenda-note">What you set stays in force until you change it.</span> : null}
      <ul>
        {items.slice(0, 3).map((a) => (
          <li key={a.key} className={`is-${a.tone}`}>{a.text}</li>
        ))}
      </ul>
    </div>
  );
}

/** Shown over the island while quarters play by themselves. */
function RunTicker() {
  const run = useGame((s) => s.run);
  const stopRun = useGame((s) => s.stopRun);
  const clock = useLab((s) => s.clock);
  if (!run) return null;
  const lines = run.lines.slice(-3);
  return (
    <div className="game-run" role="status" aria-live="polite">
      <div className="game-run-head">
        <span className="game-run-pulse" aria-hidden="true" />
        <strong>Fast-forwarding · {quarterLabel(clock)}</strong>
        <button type="button" className="lab-btn lab-btn-soft lab-btn-xs" onClick={stopRun}>
          Stop <kbd className="game-fw-kbd">Esc</kbd>
        </button>
      </div>
      {lines.length ? (
        <ul>
          {lines.map((l) => (
            <li key={l.label}>
              <span>{l.label}</span> {l.text}
            </li>
          ))}
        </ul>
      ) : (
        <p>Playing the next quarter…</p>
      )}
      <p className="game-run-foot">Stops at the next shock, goal at risk, election or big move.</p>
    </div>
  );
}

function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="game-hint-box">
      <button
        type="button"
        className="game-why"
        aria-expanded={open}
        onClick={() => {
          if (!open) sound.play("pluck");
          setOpen((v) => !v);
        }}
      >
        {open ? "Hide the hint" : "Need a hint?"}
      </button>
      {open ? <p>{text}</p> : null}
    </div>
  );
}

function FreePlayLink() {
  const openSandbox = useGame((s) => s.openSandbox);
  return (
    <button type="button" className="game-freeplay" onClick={() => openSandbox(true)}>
      Open this scenario in free play to see every indicator, chart and lever.
    </button>
  );
}
