"use client";

// The "next" play screen: one beat at a time.
//
//   news     something hit; call what it will do, then see the forecast
//   decide   the goal charts bend as the levers move; advisors offer plans
//   result   the quarter plays out on the same charts
//   debrief  the mission's end: your path against doing nothing (and history)
//
// The beats follow the game store's modal (shock / none / recap / debrief), so
// the rules, the clock and the scoring are exactly the classic screen's.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { quarterLabel, simulate } from "../model/economy";
import { SHOCKS } from "../model/shocks";
import type { QuarterState } from "../model/types";
import { ADVISORS } from "../game/advisors";
import { explain, type ExplainKey } from "../game/explain";
import { deltaUnit, fmtNum, GAME_METRICS, unitShort } from "../game/metrics";
import { MISSIONS, type MetricKey, type Objective, type ObjectiveStatus } from "../game/missions";
import { useSettings } from "../game/settings";
import { useGame, type Recap } from "../game/store";
import { useTurn } from "../game/useTurn";
import Levers from "../game/ui/Levers";
import Reforms from "../game/ui/Reforms";
import { sound } from "../game/audio";
import GoalChart, { EffectBars, type ChartLine } from "./Chart";
import { advisorPlans, advisorRun, goalMetrics, journey, judged, lagCall, moveName, policyIn, shockCall, withChanges, type AdvisorRun, type Call, type Plan } from "./logic";
import { useNext } from "./state";
import "./next.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const StoryMap = dynamic(() => import("../scenes/story"), { ssr: false, loading: () => <p className="nx-note">Drawing the map…</p> });

const shortQ = (t: number) => {
  const l = quarterLabel(t);
  return `${l.slice(4)} '${l.slice(2, 4)}`;
};

const STATUS: Record<ObjectiveStatus, { word: string; mark: string }> = {
  "on-track": { word: "On track", mark: "●" },
  "at-risk": { word: "At risk", mark: "▲" },
  met: { word: "Met", mark: "✓" },
  failed: { word: "Missed", mark: "✕" },
};

function Status({ status }: { status: ObjectiveStatus }) {
  const s = STATUS[status];
  return (
    <span className={`nx-status is-${status}`}>
      <span aria-hidden="true">{s.mark}</span> {s.word}
    </span>
  );
}

function signed(v: number, digits: number, unit: string) {
  const d = Math.abs(v) < 0.095 && digits === 1 ? 2 : digits;
  const a = Math.abs(v);
  const zero = a < 0.5 * Math.pow(10, -d);
  return `${zero ? "" : v > 0 ? "+" : "−"}${a.toFixed(d)}${unit}`;
}

/** Count a number from one value to another while a quarter plays out. */
function useProgress(key: string | number, ms: number): number {
  const reduced = useSettings((s) => s.reducedMotion);
  const [p, setP] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      setP(1);
      return;
    }
    setP(0);
    const start = performance.now() + 250;
    let raf = 0;
    const step = (now: number) => {
      const q = Math.min(1, Math.max(0, (now - start) / ms));
      setP(q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2);
      if (q < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key, ms, reduced]);
  return p;
}

// ---- Root ---------------------------------------------------------------------------

export default function NextPlay() {
  const turn = useTurn();
  const { mission, clock } = turn;
  const modal = useGame((s) => s.modal);
  const run = useGame((s) => s.run);
  const why = useNext((s) => s.why);
  const begin = useNext((s) => s.begin);
  useEffect(() => begin(mission.id), [begin, mission.id]);

  const tense = mission.objectives.some((o) => !o.bonus && (turn.statuses[o.id] === "at-risk" || turn.statuses[o.id] === "failed"));
  useEffect(() => sound.setTense(tense), [tense]);

  const beat = modal?.kind === "shock" ? "news" : modal?.kind === "recap" ? "result" : modal?.kind === "debrief" ? "debrief" : "decide";

  // Enter runs the beat's main button, unless a control that uses Enter has the focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input:not([type=range]), select, textarea") || t.isContentEditable)) return;
      const game = useGame.getState();
      const next = useNext.getState();
      if (e.key === "Escape") {
        if (next.why) next.setWhy(false);
        else if (game.run) game.stopRun();
        return;
      }
      if (game.framework || next.why) return;
      if (game.run) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          game.stopRun();
        }
        return;
      }
      if ((e.key === "w" || e.key === "W") && !e.repeat) {
        e.preventDefault();
        // The map explains the quarter being decided; with a card up, the decomposition explains what happened.
        if (game.modal) game.setFramework(true);
        else next.setWhy(true);
        return;
      }
      if ((e.key === "f" || e.key === "F") && !game.modal) {
        e.preventDefault();
        game.skipAhead();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const el = document.querySelector<HTMLButtonElement>(`.nx [data-key="${e.key}"]:not(:disabled)`);
        if (el) {
          e.preventDefault();
          el.click();
        }
        return;
      }
      if (e.key !== "Enter") return;
      if (t?.closest("button, a, [role=slider], input[type=range], summary")) return;
      const primary = document.querySelector<HTMLButtonElement>(".nx [data-primary]:not(:disabled)");
      if (primary) {
        e.preventDefault();
        primary.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`nx is-${beat}`}>
      <Header />
      {beat === "news" ? <NewsBeat key={`news-${clock}`} /> : null}
      {beat === "decide" ? <DecideBeat /> : null}
      {beat === "result" && modal?.kind === "recap" ? <ResultBeat key={`result-${modal.recap.quarter}`} recap={modal.recap} /> : null}
      {beat === "debrief" ? <DebriefBeat /> : null}
      {run ? <RunBanner /> : null}
      {why ? <WhyDrawer /> : null}
    </div>
  );
}

// ---- Header ---------------------------------------------------------------------------

function Header() {
  const { mission, clock, books, config } = useTurn();
  const calls = useNext((s) => s.calls);
  const setWhy = useNext((s) => s.setWhy);
  const setScreen = useGame((s) => s.setScreen);
  const restart = useGame((s) => s.restart);
  const rewind = useGame((s) => s.rewind);
  const setFramework = useGame((s) => s.setFramework);
  const setSettingsOpen = useSettings((s) => s.setOpen);
  const muted = useSettings((s) => s.muted);
  const setSettings = useSettings((s) => s.set);
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => menu.current?.removeAttribute("open");
  const end = mission.quarters;
  const right = calls.filter((c) => c.right).length;
  const classic = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("ui");
    window.location.href = url.toString();
  };
  return (
    <header className="nx-head">
      <div className="nx-head-title">
        <img src={`${base}/brand/palari-logo.svg`} alt="Palari" className="nx-logo" />
        <div>
          <p className="nx-kicker">{mission.number ? `Mission ${mission.number} of ${MISSIONS.length}` : "Scenario"}</p>
          <h1 className="nx-mission">{mission.title}</h1>
        </div>
      </div>
      <ol className="nx-track" aria-label={`Quarter ${Math.min(clock + 1, end)} of ${end}`}>
        {Array.from({ length: end }, (_, i) => i + 1).map((t) => {
          const shock = config.shocks.find((s) => s.quarter === t && (!s.id.startsWith("surprise") || t <= clock + 1));
          return (
            <li key={t} className={`nx-track-q ${t <= clock ? "is-done" : t === clock + 1 ? "is-now" : ""} ${shock ? "has-news" : ""}`} title={`${quarterLabel(t)}${shock ? `: ${SHOCKS[shock.kind].name}` : ""}`}>
              {(t - 1) % 4 === 0 ? <span className="nx-track-year">{quarterLabel(t).slice(0, 4)}</span> : null}
            </li>
          );
        })}
      </ol>
      <div className="nx-head-side">
        {calls.length ? (
          <span className="nx-score" title="Predictions you called right">
            Calls <strong>{right}</strong> of {calls.length}
          </span>
        ) : null}
        {books ? (
          <span className="nx-score" title="Political capital: votes pay for reforms and win elections; trust keeps markets calm">
            Votes <strong>{books.votes}</strong> · Trust <strong>{books.trust}</strong>
          </span>
        ) : null}
        <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={() => (useGame.getState().modal ? setFramework(true) : setWhy(true))} title="Why it moves: causes, channels and your levers (W)">
          Why? <kbd aria-hidden="true">W</kbd>
        </button>
        <details className="game-menu" ref={menu}>
          <summary className="lab-btn lab-btn-ghost lab-btn-sm" aria-label="Menu">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M2 3.5h12v1.5H2zM2 7.25h12v1.5H2zM2 11h12v1.5H2z" /></svg>
            <span className="game-menu-label">Menu</span>
          </summary>
          <div className="game-menu-list" role="menu">
            {clock > 0 ? <button type="button" role="menuitem" onClick={() => { close(); rewind(); }}>Rewind one quarter</button> : null}
            <button type="button" role="menuitem" onClick={() => { close(); setFramework(true); }}>Every sector (macro framework)</button>
            <button type="button" role="menuitemcheckbox" aria-checked={!muted} onClick={() => { sound.unlock(); setSettings({ muted: !muted }); }}>Sound: {muted ? "off" : "on"}</button>
            <button type="button" role="menuitem" onClick={() => { close(); setSettingsOpen(true); }}>Settings</button>
            <button type="button" role="menuitem" onClick={classic}>Classic screen</button>
            <button type="button" role="menuitem" onClick={() => setScreen("missions")}>All missions</button>
            <button type="button" role="menuitem" onClick={restart}>Restart this mission</button>
          </div>
        </details>
      </div>
    </header>
  );
}

// ---- Goal panel: a chart with its goal, status and the move's journey -----------------

function GoalPanel({
  metric,
  height,
  now,
  ghost,
  extra,
  showJourney = true,
  hint = false,
  compact = false,
  moved: movedDelta,
  children,
}: {
  metric: MetricKey;
  height: number;
  now?: number;
  ghost?: QuarterState[] | null;
  extra?: ChartLine[];
  showJourney?: boolean;
  /** Show the "move a lever" hint while nothing has moved (one panel carries it). */
  hint?: boolean;
  compact?: boolean;
  /** Result beat: the hero figure is the quarter's outturn, counting up from `from` to `to`. */
  moved?: { from: number; to: number; p: number };
  children?: ReactNode;
}) {
  const { mission, actual, forecast, forecastStart, clock, statuses, changed } = useTurn();
  const meta = GAME_METRICS[metric];
  const end = mission.quarters;
  const objectives = mission.objectives.filter((o) => o.metric === metric);
  const main = objectives.find((o) => !o.bonus) ?? objectives[0];
  const j = main ? judged(main, mission, actual, forecast, clock) : null;
  const unit = unitShort(meta.unit);
  const trip = journey(metric, forecast, forecastStart, clock, end);
  const moved = changed && Math.abs(trip.peak) >= 0.5 * Math.pow(10, -meta.digits);
  const du = deltaUnit(meta.unit);
  const d = movedDelta ? movedDelta.to - movedDelta.from : 0;
  const good = main && movedDelta ? (main.op === "<=" ? d < 0 : d > 0) : null;
  const flat = Math.abs(d) < 0.5 * Math.pow(10, -meta.digits);
  return (
    <section className={`nx-goal-panel ${compact ? "is-compact" : ""}`} aria-label={meta.label}>
      <header className="nx-goal-head">
        <h2 className="nx-goal-name">{meta.label}</h2>
        {movedDelta ? (
          <p className="nx-goal-value">
            {fmtNum(movedDelta.from + d * movedDelta.p, meta.digits)}
            <span className="nx-goal-unit">{unit}</span>
          </p>
        ) : main && j ? (
          <p className="nx-goal-value">
            {fmtNum(j.value, meta.digits)}
            <span className="nx-goal-unit">{unit}</span>
          </p>
        ) : null}
        {main ? <p className="nx-goal-label">Goal: {main.label.charAt(0).toLowerCase() + main.label.slice(1)}</p> : null}
        {movedDelta ? (
          <p className={`nx-goal-when nx-delta ${good === null || flat ? "" : good ? "is-good" : "is-bad"}`}>
            {flat ? "•" : d > 0 ? "▲" : "▼"} {signed(d, meta.digits, du)}
            {good === null || flat ? " this quarter" : good ? " helps" : " hurts"}
          </p>
        ) : main && j ? (
          <p className="nx-goal-when">
            {clock >= end ? "final" : main.when === "every" ? `${main.op === ">=" ? "lowest" : "highest"}, ${shortQ(j.t)}` : `forecast for ${shortQ(j.t)}`} · <Status status={statuses[main.id]} />
          </p>
        ) : null}
      </header>
      <GoalChart mission={mission} metric={metric} actual={actual} forecast={forecast} ghost={ghost === undefined ? forecastStart : ghost} clock={clock} now={now} extra={extra} height={height} compact={compact} />
      {showJourney && clock < end ? (
        <p className={`nx-journey ${moved ? "is-on" : ""}`} aria-live="polite">
          {moved ? (
            <>
              <span className="nx-journey-swatch" aria-hidden="true" /> <strong>Your move:</strong> {signed(trip.next, meta.digits, du)} this quarter
              {trip.peakT > clock + 1 ? <>, {signed(trip.peak, meta.digits, du)} at its strongest in {shortQ(trip.peakT)}</> : null}
              {trip.peakT !== end && end > clock + 1 ? <>, {signed(trip.end, meta.digits, du)} by {shortQ(end)}</> : null}.
            </>
          ) : hint ? (
            <>Back a plan or move a lever, and watch where the line bends: that is when your move arrives.</>
          ) : null}
        </p>
      ) : null}
      {movedDelta && main && j ? (
        <p className="nx-bonus">
          Goal: {clock >= end ? "final" : main.when === "every" ? `${main.op === ">=" ? "lowest" : "highest"} ${fmtNum(j.value, meta.digits)}${unit} in ${shortQ(j.t)}` : `forecast ${fmtNum(j.value, meta.digits)}${unit} for ${shortQ(j.t)}`} · <Status status={statuses[main.id]} />
        </p>
      ) : null}
      {objectives.filter((o) => o.bonus).map((o) => (
        <p key={o.id} className="nx-bonus">
          <span aria-hidden="true">★</span> {o.label} · <Status status={statuses[o.id]} />
        </p>
      ))}
      {children}
    </section>
  );
}

function useViewport() {
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    // On a TV the whole screen is zoomed (next.css), so it has fewer layout pixels than the window.
    const on = () => {
      const zoom = window.innerWidth >= 2000 ? 1.3 : 1;
      setVp({ w: window.innerWidth / zoom, h: window.innerHeight / zoom });
    };
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

function Legend({ moved }: { moved: boolean }) {
  return (
    <p className="nx-legend" aria-hidden="true">
      <span><i className="nx-key is-actual" /> so far</span>
      <span><i className="nx-key is-forecast" /> staff forecast</span>
      {moved ? <span><i className="nx-key is-ghost" /> before this quarter&apos;s move</span> : null}
      <span><i className="nx-key is-gate" /> goal</span>
    </p>
  );
}

// ---- Decide ---------------------------------------------------------------------------

function DecideBeat() {
  const turn = useTurn();
  const { mission, clock, deciding, changed, statuses, config, actual, forecast, forecastStart, policy, policyStart } = turn;
  const turns = useGame((s) => s.turns);
  const endQuarter = useGame((s) => s.endQuarter);
  const skipAhead = useGame((s) => s.skipAhead);
  const run = useGame((s) => s.run);
  const decide = useGame((s) => s.decide);
  const resetTurn = useGame((s) => s.resetTurn);
  const calls = useNext((s) => s.calls);
  const answer = useNext((s) => s.answer);
  const vp = useViewport();
  const narrow = vp.w <= 760;
  const [asking, setAsking] = useState<Call | null>(null);
  const metrics = goalMetrics(mission);
  const end = mission.quarters;
  const done = clock >= end;
  const turnStart = turns[turns.length - 1] ?? config;

  const plans = useMemo(() => {
    if (done) return [];
    const list = advisorPlans(mission, turnStart, actual, clock);
    // Doing nothing is always on the table, so every plan has something to be compared with.
    if (!list.some((p) => p.hold) && list[0]) list.push({ advisors: [], title: "Change nothing this quarter", changes: {}, hold: true, effects: list[0].effects.map((e) => ({ ...e, value: e.base, ok: e.baseOk })) });
    return list;
  }, [mission, turnStart, actual, clock, done]);
  const policyKey = JSON.stringify(policy);
  const backing = (p: Plan) => JSON.stringify(policyIn(withChanges(turnStart, clock + 1, p.changes), clock + 1)) === policyKey && config.oneOffs.length === turnStart.oneOffs.length && (config.institutions?.length ?? 0) === (turnStart.institutions?.length ?? 0);
  const back = (p: Plan) => {
    resetTurn();
    if (!p.hold) decide(p.changes);
    else sound.play("tick");
  };

  const landing = config.shocks.filter((s) => s.quarter === clock + 1 && !s.id.startsWith("surprise"));
  const atRisk = mission.objectives.filter((o) => !o.bonus && statuses[o.id] === "at-risk");

  const finish = () => {
    if (run) return;
    const call = changed ? lagCall(mission, forecast, forecastStart, clock, moveName(policyStart, policy)) : null;
    if (call && !calls.some((c) => c.id === call.id)) {
      setAsking(call);
      return;
    }
    endQuarter();
  };

  const reforms = mission.politics.institutions.length > 0;
  const [coach, closeCoach] = useCoach(mission.number === 1 && clock === 0);
  const shown = narrow ? metrics.slice(0, 3) : metrics.slice(0, 4);
  // Charts share the height the window leaves, so the whole decision fits one screen on a laptop.
  const rows = shown.length === 4 ? 2 : shown.length;
  const bonusRows = Math.max(...shown.map((m) => mission.objectives.filter((o) => o.metric === m && o.bonus).length));
  const h = narrow ? 132 : Math.round(Math.min(400, Math.max(120, (vp.h - 66 - 82 - 46 - (coach ? 122 : 0) - (rows - 1) * 16) / rows - (140 + bonusRows * 24))));
  const agree = plans.filter((p) => p.advisors.length).length === 1 && mission.advisors.length > 1;

  return (
    <main className="nx-decide">
      <div className="nx-main">
        <section className="nx-brief" aria-label="This quarter">
          <p className="nx-beat">Deciding {deciding} · quarter {clock + 1} of {end}</p>
          <p className="nx-brief-line">
            {landing.length ? <><strong>{landing.map((s) => SHOCKS[s.kind].name).join(", ")}</strong> lands now ({landing.map((s) => SHOCKS[s.kind].short.toLowerCase().replace("gdp", "GDP")).join("; ")}). </> : null}
            {atRisk.length ? (
              <><Status status="at-risk" /> On the staff forecast you miss: {atRisk.map((o) => o.label.charAt(0).toLowerCase() + o.label.slice(1)).join("; ")}.</>
            ) : (
              <><Status status="on-track" /> Every goal is on track on the staff forecast{landing.length ? "." : ". Nothing new this quarter."}</>
            )}
          </p>
        </section>
        {coach ? <Coach close={closeCoach} /> : null}
        <div className="nx-charts" data-count={shown.length}>
          {shown.map((m, i) => (
            <GoalPanel key={m} metric={m} height={h} hint={i === 0} compact={narrow || shown.length > 2} />
          ))}
        </div>
        <Legend moved={changed} />
      </div>

      <aside className="nx-side" aria-label="Your decision">
        <div className="nx-side-scroll">
          {plans.length ? (
            <section className="nx-plans" aria-label="What your advisors would do">
              <h2 className="nx-side-title">{agree ? "Your advisors agree" : "Whose plan do you back?"}</h2>
              {plans.map((p, i) => (
                <PlanCard key={p.title} plan={p} index={i + 1} active={backing(p)} onBack={() => back(p)} />
              ))}
            </section>
          ) : null}

          <section className="nx-levers">
            <h2 className="nx-side-title">Or set it yourself</h2>
            <Levers />
            {reforms ? (
              <details className="nx-reforms">
                <summary>Reforms and institutions</summary>
                <Reforms />
              </details>
            ) : null}
          </section>
        </div>

        <div className="nx-end">
          <button type="button" data-primary className="nx-end-btn game-end-btn" onClick={finish} disabled={done || Boolean(run)}>
            End {deciding} <kbd aria-hidden="true">Enter</kbd>
          </button>
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={skipAhead} disabled={done || Boolean(run)} title="Play quarters until something needs a decision (F)">
            Skip quiet quarters »
          </button>
        </div>
      </aside>

      {asking ? (
        <div className="nx-overlay" role="dialog" aria-modal="true" aria-label="Call it">
          <CallCard
            call={asking}
            onAnswer={answer}
            detail={<LagDetail call={asking} />}
            doneLabel={`See ${deciding} play out`}
            onDone={() => {
              setAsking(null);
              endQuarter();
            }}
          />
        </div>
      ) : null}
    </main>
  );
}

const COACH_KEY = "weo-lab.next.coach.v1";

/** First play only: whether the three-line guide is still to be read. */
function useCoach(wanted: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!wanted) {
      setOpen(false);
      return;
    }
    try {
      setOpen(window.localStorage.getItem(COACH_KEY) !== "done");
    } catch {
      setOpen(true);
    }
  }, [wanted]);
  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(COACH_KEY, "done");
    } catch {
      // Storage blocked: the guide shows again next time.
    }
  };
  return [open, close];
}

function Coach({ close }: { close: () => void }) {
  return (
    <section className="nx-coach" aria-label="How to play">
      <ol>
        <li><strong>Read the lines.</strong> Solid is what has happened; dashed is the staff forecast. Land it in the green gate, and keep it off the hatched fence.</li>
        <li><strong>Make your move.</strong> Back an advisor&apos;s plan or drag a lever. The shaded wedge is what your move does, and where it widens is when it arrives.</li>
        <li><strong>End the quarter</strong> and watch it play out. You decide again every quarter.</li>
      </ol>
      <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={close}>Got it</button>
    </section>
  );
}

function LagDetail({ call }: { call: Call }) {
  const { mission, forecast, forecastStart, clock } = useTurn();
  const metric = call.id.slice(4) as MetricKey;
  const meta = GAME_METRICS[metric];
  if (!meta) return null;
  const trip = journey(metric, forecast, forecastStart, clock, mission.quarters);
  return (
    <div className="nx-call-detail">
      <p className="nx-note">What your move does to {meta.label.toLowerCase()}, quarter by quarter ({deltaUnit(meta.unit).trim()}):</p>
      <EffectBars series={trip.series} from={trip.from} digits={meta.digits} unit="" highlight={trip.peakT} />
    </div>
  );
}

function PlanCard({ plan, index, active, onBack }: { plan: Plan; index: number; active: boolean; onBack: () => void }) {
  const who = plan.advisors.map((id) => ADVISORS[id]);
  return (
    <button type="button" className={`nx-plan ${active ? "is-active" : ""}`} data-key={index} aria-pressed={active} onClick={onBack}>
      <span className="nx-plan-faces" aria-hidden="true">
        {who.length ? who.map((a) => <img key={a.id} src={`${base}${a.portrait}`} alt="" width={40} height={40} />) : <span className="nx-plan-noface">—</span>}
      </span>
      <span className="nx-plan-main">
        <span className="nx-plan-who">
          {who.length ? who.map((a) => a.name).join(" and ") : "Wait and see"}
          {who.length === 1 ? <span> · {who[0].cares.toLowerCase()}</span> : null}
        </span>
        <span className="nx-plan-title">{who.length ? `“${plan.title}.”` : plan.title}</span>
        <span className="nx-plan-effects">
          {plan.effects.slice(0, 3).map((e) => {
            const meta = GAME_METRICS[e.metric];
            return (
              <span key={e.objective.id} className={e.ok ? "is-ok" : "is-miss"}>
                <span aria-hidden="true">{e.ok ? "✓" : "✕"}</span> {meta.label} {e.objective.when === "every" ? (e.objective.op === ">=" ? "low " : "peak ") : ""}
                <strong>{fmtNum(e.value, meta.digits)}{meta.unit === "%" ? "%" : meta.unit === "bp" ? " bp" : meta.unit === "months of imports" ? " mo" : "%"}</strong>
                <span className="sr-only">{e.ok ? ", goal met" : ", goal missed"}</span>
              </span>
            );
          })}
        </span>
      </span>
      <span className="nx-plan-pick">
        {active ? "✓ Chosen" : who.length ? "Back" : "Choose"} <kbd aria-hidden="true">{index}</kbd>
      </span>
    </button>
  );
}

function useNarrow() {
  return useViewport().w <= 760;
}

// ---- Call it -----------------------------------------------------------------------------

function CallCard({ call, onAnswer, onDone, doneLabel, detail }: { call: Call; onAnswer: (picked: string) => void; onDone: () => void; doneLabel: string; detail?: ReactNode }) {
  const [picked, setPicked] = useState<string | null>(null);
  const right = picked === call.answer;
  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    onAnswer(id);
    sound.play(id === call.answer ? "choose" : "back");
  };
  return (
    <section className="nx-call">
      <p className="nx-beat">Call it before you see it</p>
      <h2 className="nx-call-prompt">{call.prompt}</h2>
      <div className="nx-call-options" role="group" aria-label="Your call">
        {call.options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            data-key={picked ? undefined : i + 1}
            className={`nx-call-option ${picked === o.id ? "is-picked" : ""} ${picked && o.id === call.answer ? "is-answer" : ""}`}
            aria-pressed={picked === o.id}
            disabled={Boolean(picked) && picked !== o.id && o.id !== call.answer}
            onClick={() => pick(o.id)}
          >
            <kbd aria-hidden="true">{i + 1}</kbd> {o.label}
            {picked && o.id === call.answer ? <span className="nx-call-tag"> ✓ what the model says</span> : null}
            {picked === o.id && o.id !== call.answer ? <span className="nx-call-tag"> your call</span> : null}
          </button>
        ))}
      </div>
      {picked ? (
        <div className="nx-call-reveal" aria-live="polite">
          <p>
            <strong>{right ? "Good call." : "Not this time."}</strong> {call.reveal}
          </p>
          {detail}
          <button type="button" data-primary autoFocus className="lab-btn lab-btn-primary lab-btn-md" onClick={onDone}>
            {doneLabel} <kbd aria-hidden="true">Enter</kbd>
          </button>
        </div>
      ) : (
        <button type="button" className="nx-skip" onClick={onDone}>
          Skip the question
        </button>
      )}
    </section>
  );
}

// ---- News --------------------------------------------------------------------------------

function NewsBeat() {
  const { mission, clock, config, actual, deciding } = useTurn();
  const modal = useGame((s) => s.modal);
  const closeModal = useGame((s) => s.closeModal);
  const calls = useNext((s) => s.calls);
  const answer = useNext((s) => s.answer);
  const narrow = useNarrow();
  const shocks = modal?.kind === "shock" ? modal.shocks : [];
  const main = shocks[0];
  const call = useMemo(() => (main ? shockCall(mission, config, actual, clock, main) : null), [mission, config, actual, clock, main]);
  useEffect(() => sound.stinger("shock"), []);
  const [phase, setPhase] = useState<"call" | "brief">(() => (call && !calls.some((c) => c.id === call.id) ? "call" : "brief"));
  if (!main) return null;
  const spec = SHOCKS[main.kind];
  const metrics = goalMetrics(mission).slice(0, 2);
  return (
    <main className="nx-stage">
      <article className="nx-news">
        <p className="nx-beat">News · {quarterLabel(main.quarter)}</p>
        <h2 className="nx-headline">{spec.name}</h2>
        <p className="nx-lede">{spec.description}</p>
        <p className="nx-news-size">{shocks.map((s) => SHOCKS[s.kind].short).join(" · ")}</p>

        {phase === "call" && call ? (
          <CallCard call={call} onAnswer={answer} doneLabel="See the staff forecast" onDone={() => setPhase("brief")} />
        ) : (
          <>
            <div className="nx-news-charts" data-count={metrics.length}>
              {metrics.map((m) => (
                <GoalPanel key={m} metric={m} height={narrow ? 150 : 190} ghost={null} showJourney={false} compact />
              ))}
            </div>
            <p className="nx-note">The dashed lines are the staff forecast if you keep policy as it is. Your advisors are waiting with their plans.</p>
            <div className="nx-actions">
              <button type="button" data-primary autoFocus className="lab-btn lab-btn-primary lab-btn-md" onClick={closeModal}>
                Decide for {deciding} <kbd aria-hidden="true">Enter</kbd>
              </button>
            </div>
          </>
        )}
      </article>
    </main>
  );
}

// ---- Result ----------------------------------------------------------------------------------

/** Metrics the framework's "shocks vs policy" tab can decompose. */
const DECOMP: string[] = ["infl", "growth", "debt", "unemp", "reserves", "ca", "spread", "rate", "ob"];
const WHY: Partial<Record<MetricKey, ExplainKey>> = { infl: "infl", growth: "growth", debt: "debt" };
const SHORT_DRIVER: Record<string, string> = {
  expectations: "expectations pulling toward the target",
  demand: "demand",
  currency: "the exchange rate",
  oil: "oil prices",
  shocks: "the shock",
  fading: "earlier swings fading",
  monetary: "interest rates",
  fiscal: "the budget",
  external: "trading partners",
  commodities: "commodity prices",
  confidence: "confidence and spreads",
  interestGrowth: "interest against growth",
  primary: "the budget before interest",
  other: "other things",
};

function ResultBeat({ recap }: { recap: Recap }) {
  const { mission, clock, statuses } = useTurn();
  const closeModal = useGame((s) => s.closeModal);
  const setFramework = useGame((s) => s.setFramework);
  const narrow = useNarrow();
  const from = recap.from ?? recap.quarter - 1;
  const p = useProgress(recap.quarter, 1100 + 250 * Math.min(6, recap.quarter - from - 1));
  const now = from + (clock - from) * p;
  const metrics = goalMetrics(mission).slice(0, narrow ? 2 : 3);
  const settled = p >= 1;
  const last = clock >= mission.quarters;
  return (
    <main className="nx-stage">
      <article className="nx-result">
        <p className="nx-beat">
          {recap.skipped?.length ? `${quarterLabel(from + 1)} to ${quarterLabel(recap.quarter)}` : quarterLabel(recap.quarter)} · what happened
        </p>
        <h2 className="nx-headline">{recap.headline.text}</h2>
        {recap.stopReasons?.length ? <p className="nx-lede">The clock stopped: {recap.stopReasons.join("; ").replace(/^./, (c) => c.toLowerCase())}.</p> : null}

        <div className="nx-result-charts" data-count={metrics.length}>
          {metrics.map((m) => {
            const key = WHY[m];
            const parts = key && !recap.skipped?.length ? explain(key, recap.now).parts.slice(0, 2) : [];
            return (
              <GoalPanel key={m} metric={m} height={narrow ? 140 : metrics.length > 2 ? 170 : 200} now={now} ghost={null} showJourney={false} compact moved={{ from: recap.prev[m], to: recap.now[m], p }}>
                {parts.length ? (
                  <p className="nx-moved">
                    <strong>Why:</strong> mostly {parts.map((x) => `${SHORT_DRIVER[x.key] ?? x.label.toLowerCase()} (${signed(x.value, 1, "")})`).join(" and ")}
                    {key === "growth" ? ", through demand" : ""}.
                  </p>
                ) : null}
              </GoalPanel>
            );
          })}
        </div>

        {recap.skipped?.length ? (
          <ul className="nx-skipped">
            {recap.skipped.map((l) => (
              <li key={l.label}>
                <strong>{l.label}</strong> {l.text}
              </li>
            ))}
          </ul>
        ) : null}

        <div className={`nx-result-foot ${settled ? "is-in" : ""}`}>
          <ul className="nx-verdicts">
            {recap.statuses
              .filter((s) => s.before !== s.after)
              .map((s) => {
                const o = mission.objectives.find((x) => x.id === s.id);
                return o ? (
                  <li key={s.id}>
                    {o.bonus ? "★ " : ""}
                    {o.label}: <Status status={s.before} /> → <Status status={statuses[s.id] ?? s.after} />
                  </li>
                ) : null;
              })}
            {recap.points.entries.map((e, i) => (
              <li key={`p${i}`}>
                {e.currency === "votes" ? "Votes" : "Trust"} {e.amount > 0 ? "+" : "−"}
                {Math.abs(e.amount)}: {e.reason.charAt(0).toLowerCase() + e.reason.slice(1)}
              </li>
            ))}
            {recap.election ? <li>{recap.election.won ? `You won the election with ${recap.election.votes} votes.` : `You lost the election with ${recap.election.votes} votes.`}</li> : null}
            {recap.crisis ? <li><Status status="at-risk" /> Trust has run out: markets turn on the country next quarter.</li> : null}
          </ul>
          <div className="nx-actions">
            <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setFramework(true, DECOMP.includes(metrics[0]) ? (metrics[0] as never) : undefined)}>
              Why did it move? <kbd aria-hidden="true">W</kbd>
            </button>
            <button type="button" data-primary autoFocus className="lab-btn lab-btn-primary lab-btn-md" onClick={closeModal}>
              {last ? "See how it ended" : `Plan ${quarterLabel(clock + 1)}`} <kbd aria-hidden="true">Enter</kbd>
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}

// ---- Debrief ---------------------------------------------------------------------------------

function DebriefBeat() {
  const { mission, clock, comparison, comparisonLabel, statuses } = useTurn();
  const modal = useGame((s) => s.modal);
  const startMission = useGame((s) => s.startMission);
  const rewind = useGame((s) => s.rewind);
  const restart = useGame((s) => s.restart);
  const setScreen = useGame((s) => s.setScreen);
  const calls = useNext((s) => s.calls);
  const narrow = useNarrow();
  const nothing = useMemo(() => simulate(mission.setup()).path, [mission]);
  const runs = useAdvisorRuns(mission);
  const [shownAdvisor, setShownAdvisor] = useState<string | null>(null);
  const shownRun = runs.find((r) => r.advisor === shownAdvisor) ?? null;
  const outcomeKind = modal?.kind === "debrief" ? modal.outcome.kind : null;
  useEffect(() => {
    if (outcomeKind === "won") sound.stinger("win");
    else if (outcomeKind === "lost") sound.stinger("lose");
  }, [outcomeKind]);
  if (modal?.kind !== "debrief") return null;
  const outcome = modal.outcome;
  const won = outcome.kind === "won";
  const next = mission.number ? MISSIONS.find((m) => m.number === mission.number + 1) : undefined;
  const metrics = goalMetrics(mission).slice(0, narrow ? 2 : 3);
  const lines = (m: MetricKey): ChartLine[] => [
    { label: "Had you done nothing", values: nothing.map((s) => s[m]), tone: "nothing" },
    ...(shownRun ? [{ label: `Backing ${ADVISORS[shownRun.advisor].name}`, values: shownRun.path.map((s) => s[m]), tone: "compare" as const }] : comparison ? [{ label: comparisonLabel ?? "What happened", values: comparison.map((s) => s[m]), tone: "compare" as const }] : []),
  ];
  const right = calls.filter((c) => c.right).length;
  return (
    <main className="nx-stage">
      <article className={`nx-debrief ${won ? "is-won" : "is-lost"}`}>
        <p className="nx-beat">{mission.title} · {quarterLabel(clock)}</p>
        {won ? (
          <>
            <p className="nx-stars" aria-label={`${outcome.stars} of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= outcome.stars ? "is-on" : ""} style={{ animationDelay: `${n * 180}ms` }} aria-hidden="true">★</span>
              ))}
            </p>
            <h2 className="nx-headline">Mission complete</h2>
            <p className="nx-lede">{mission.lesson}</p>
          </>
        ) : (
          <>
            <h2 className="nx-headline">Mission failed</h2>
            <p className="nx-lede">{outcome.kind === "lost" ? outcome.reason : ""} Rewind one quarter to try a different decision, or start again.</p>
          </>
        )}

        <div className="nx-result-charts" data-count={metrics.length}>
          {metrics.map((m) => (
            <GoalPanel key={m} metric={m} height={narrow ? 140 : metrics.length > 2 ? 170 : 200} ghost={null} extra={lines(m)} showJourney={false} compact />
          ))}
        </div>
        <p className="nx-legend">
          <span><i className="nx-key is-actual" /> your path</span>
          <span><i className="nx-key is-nothing" /> had you done nothing</span>
          {shownRun ? <span><i className="nx-key is-compare" /> backing {ADVISORS[shownRun.advisor].name} every quarter</span> : comparison ? <span><i className="nx-key is-compare" /> {(comparisonLabel ?? "what happened").toLowerCase()}</span> : null}
          <span><i className="nx-key is-gate" /> goal</span>
        </p>

        <section className="nx-replay" aria-label="Whose advice was right?">
          <h3 className="nx-side-title">Whose advice was right?</h3>
          <p className="nx-note">The same mission, replayed backing one advisor&apos;s plan every quarter. Pick one to draw their path on the charts.</p>
          <div className="nx-replay-rows">
            {mission.advisors.map((id) => {
              const a = ADVISORS[id];
              const r = runs.find((x) => x.advisor === id);
              const on = shownAdvisor === id;
              return (
                <button key={id} type="button" className={`nx-replay-row ${on ? "is-active" : ""}`} aria-pressed={on} disabled={!r} onClick={() => setShownAdvisor(on ? null : id)}>
                  <img src={`${base}${a.portrait}`} alt="" width={36} height={36} />
                  <span>
                    <strong>{a.name}</strong>
                    {r ? (
                      r.outcome.kind === "won" ? (
                        <span className="nx-status is-met"> · ✓ would have won, {"★".repeat(r.outcome.stars)}<span className="sr-only">{r.outcome.stars} stars</span></span>
                      ) : (
                        <span className="nx-status is-failed"> · ✕ would have lost in {quarterLabel(r.endedAt)}</span>
                      )
                    ) : (
                      <span className="nx-note"> replaying…</span>
                    )}
                    {r ? <span className="nx-replay-moves">{r.moves.length ? r.moves.slice(0, 3).map((x) => `${shortQ(x.quarter)}: ${x.title.charAt(0).toLowerCase()}${x.title.slice(1)}`).join(" · ") + (r.moves.length > 3 ? ` · and ${r.moves.length - 3} more` : "") : "held policy throughout"}{r.outcome.kind === "lost" ? `. ${r.outcome.reason}` : ""}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <ul className="nx-verdicts is-in">
          {mission.objectives.map((o: Objective) => (
            <li key={o.id}>
              {o.bonus ? "★ " : ""}
              {o.label}: <Status status={statuses[o.id]} />
            </li>
          ))}
          {calls.length ? <li>Your calls: {right} of {calls.length} right.</li> : null}
        </ul>
        {mission.comparison?.story?.length ? <p className="nx-note">{mission.comparison.story[0]}</p> : null}

        <div className="nx-actions">
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>All missions</button>
          {won ? (
            <>
              <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={restart}>Play again</button>
              {next ? (
                <button type="button" data-primary autoFocus className="lab-btn lab-btn-primary lab-btn-md" onClick={() => startMission(next.id)}>
                  Next: {next.title} <kbd aria-hidden="true">Enter</kbd>
                </button>
              ) : (
                <button type="button" data-primary autoFocus className="lab-btn lab-btn-primary lab-btn-md" onClick={() => setScreen("missions")}>Choose another</button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={restart}>Restart mission</button>
              <button type="button" data-primary autoFocus className="lab-btn lab-btn-primary lab-btn-md" onClick={rewind}>
                Rewind one quarter <kbd aria-hidden="true">Enter</kbd>
              </button>
            </>
          )}
        </div>
      </article>
    </main>
  );
}

/** Replays the mission on each advisor's plans, a quarter per tick so the screen stays live. */
function useAdvisorRuns(mission: { id: string; advisors: (keyof typeof ADVISORS)[]; setup: () => unknown }): AdvisorRun[] {
  const [runs, setRuns] = useState<AdvisorRun[]>([]);
  useEffect(() => {
    let alive = true;
    let timer = 0;
    setRuns([]);
    const queue = mission.advisors.map((a) => advisorRun(mission as never, a));
    const tick = () => {
      if (!alive) return;
      const run = queue[0];
      if (!run) return;
      if (run.step()) {
        queue.shift();
        const result = run.result();
        setRuns((list) => [...list, result]);
      }
      timer = window.setTimeout(tick, 0);
    };
    timer = window.setTimeout(tick, 900);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id]);
  return runs;
}

// ---- Fast-forward banner and the "why" drawer ----------------------------------------------------

function RunBanner() {
  const run = useGame((s) => s.run);
  const stopRun = useGame((s) => s.stopRun);
  if (!run) return null;
  const last = run.lines[run.lines.length - 1];
  return (
    <div className="nx-run" role="status">
      <p>
        <strong>Skipping quiet quarters…</strong> {last ? `${last.label}: ${last.text}` : ""}
      </p>
      <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={stopRun}>
        Stop <kbd aria-hidden="true">Esc</kbd>
      </button>
    </div>
  );
}

function WhyDrawer() {
  const setWhy = useNext((s) => s.setWhy);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div className="nx-overlay" role="dialog" aria-modal="true" aria-label="Why it moves: the cause-and-effect map" onClick={(e) => { if (e.target === e.currentTarget) setWhy(false); }}>
      <div className="nx-why">
        <div className="nx-why-head">
          <h2 className="nx-side-title">Why it moves</h2>
          <button ref={ref} type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={() => setWhy(false)}>
            Close <kbd aria-hidden="true">Esc</kbd>
          </button>
        </div>
        <div className="nx-why-body game-scene">
          <StoryMap />
        </div>
      </div>
    </div>
  );
}
