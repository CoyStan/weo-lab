"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { describeChanges, quarterLabel } from "../../model/economy";
import { SHOCKS } from "../../model/shocks";
import { getPreset } from "../../model/presets";
import { MISSIONS } from "../missions";
import { sound } from "../audio";
import { useSettings } from "../settings";
import { useGame } from "../store";
import { decidingQuarter, goalEffect, useUntouched } from "./Goals";
import { useTween } from "./useTween";
import { Valence, type Tone } from "./Valence";
import type { Objective, ObjectiveStatus } from "../missions";
import Glyph from "./Glyph";
import Capital from "./Capital";
import Reforms from "./Reforms";
import { Segmented } from "../../components/ui";
import { useStickyH } from "../../components/strip";
import { useTurn } from "../useTurn";
import { canAdopt } from "../politics";
import Advisors from "./Advisors";
import Goals from "./Goals";
import Levers from "./Levers";
import { attention } from "../pacing";
import { useLab, type FocusKey, type SceneCue } from "../../store";
import { nameDistricts } from "../../scene/labelLayer";
import { PlayIsland, SCENES, setSceneView, toggleSceneView, useMapId, useSceneView } from "../../scenes/registry";
import StoryIslandLine from "../../scenes/story/IslandLine";
import { useStoryShown } from "../../scenes/story/shown";
import { useReducedMotionFlag } from "../../scene/useSmooth";
import { setUiMode } from "../../next/state";
import type { SimEvent } from "../../model/types";
import { deltaUnit, fmtNum, GAME_METRICS } from "../metrics";

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
  useSceneCues();
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
  // Known shocks that land in the quarter being decided: the island's news band names them while
  // the player decides (a surprise is news only once it has hit).
  const landing = useMemo(() => (done ? [] : config.shocks.filter((s) => s.quarter === clock + 1 && !s.id.startsWith("surprise")).map((s) => ({ name: SHOCKS[s.kind].name, short: SHOCKS[s.kind].short }))), [config, clock, done]);
  // Phones: the End bar is a fixed dock; its height becomes --sticky-h on the page, so the
  // scroll area ends clear of it and focused levers are never hidden under it (game.css).
  const footRef = useRef<HTMLDivElement>(null);
  // The HUD's height, published as --hud-h on the page: the news card hangs just under it,
  // so its top edge never cuts through the turn track.
  const hudRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = hudRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--hud-h", `${Math.ceil(el.getBoundingClientRect().height)}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--hud-h");
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // Typing: every key stays with the field. On a slider (native or custom) its navigation
      // keys stay with it and Enter never ends a quarter by accident; letters reach the shortcuts.
      if (t && (t.closest("input:not([type=range]), select, textarea") || t.isContentEditable)) return;
      if (t?.closest("input[type=range], [role=slider]") && (/^(Arrow|Home|End|Page)/.test(e.key) || e.key === "Enter")) return;
      const game = useGame.getState();
      // I: the scene slot switches between the map and the island.
      if ((e.key === "i" || e.key === "I") && !e.repeat && !game.modal && !game.framework) {
        e.preventDefault();
        toggleSceneView();
        return;
      }
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

  // Wide screens: the commit sits in the lever rail, right under the levers it commits;
  // narrower ones dock it to the bottom of the screen.
  const wide = useMedia("(min-width: 1180px)");
  useStickyH(footRef, wide);
  // Wide screens: the advisors' row under the slot keeps its tallest height, so the slot never jumps.
  const stageFootRef = useRef<HTMLDivElement>(null);
  useSteadyHeight(stageFootRef, ".game-advisors", wide);
  const commit = (
      <div className={`game-end ${wide ? "is-rail" : ""}`} ref={footRef}>
        <div className="game-agenda-bar">
          <Agenda />
        </div>
        <EndStrip />
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
  );

  return (
    <div className="game-play">
      <header ref={hudRef} className="game-hud">
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
              // A known shock is named under its square ("shock") only where no other label
              // sits within three squares; it is always in the square's tooltip.
              const labelled = (j: number) => j === clock || (j % 4 === 0 && j !== clock - 1);
              const flagClear = (k: number) => ![-3, -2, -1, 1, 2, 3].some((o) => k + o >= 0 && k + o < mission.quarters && labelled(k + o));
              const q = i + 1;
              const shock = config.shocks.some((s) => !s.id.startsWith("surprise") && s.quarter === q);
              const election = mission.politics.elections.includes(q);
              return (
                <span
                  key={i}
                  className={`${i < clock ? "is-done" : i === clock ? "is-now" : ""} ${shock ? "has-shock" : ""} ${election ? "has-election" : ""}`}
                  style={i >= sweep.from && i < clock && sweepStep ? ({ "--sweep-delay": `${Math.round((i - sweep.from) * sweepStep)}ms` } as CSSProperties) : undefined}
                  title={`${quarterLabel(q)}${shock ? " · known shock" : ""}${election ? " · election" : ""}`}>
                  {(q - 1) % 4 === 0 && i !== clock && i !== clock - 1 ? <em>{quarterLabel(q).slice(0, 4)}{shock && i > clock ? " · shock" : ""}</em> : shock && i > clock && flagClear(i) ? <em className="is-flag">shock</em> : null}
                  {i === clock ? <em className="is-code">{(q - 1) % 4 === 0 ? quarterLabel(q).replace("Q", " Q") : quarterLabel(q).slice(4)}</em> : null}
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
          {tips && mission.number === 1 && clock === 0 && !changed ? <p className="game-coach">Move the policy rate and watch the Forecast line on each goal.</p> : null}
          <div className="game-agenda-top">
            <Agenda />
          </div>
          {panel === "levers" ? <Levers /> : <Reforms />}
          {wide ? commit : null}
          {panel === "levers" && !wide ? <DecisionLog /> : null}
        </aside>

        <section className="game-stage" aria-label="Cause and effect map, or the island">
          <SceneSlot map={scene} news={news} landing={landing}>
            {run ? <RunTicker /> : null}
            {/* The quarter's news, for screen readers: on screen the map names it under its header
                and the island in a band along its top edge, so nothing floats over a card. */}
            <div className="sr-only">
              {news.map((e, i) => (
                <p key={`${e.title}-${i}`} role="status">
                  {e.title}: {e.detail}
                </p>
              ))}
            </div>
          </SceneSlot>
          <div className="game-stage-foot" ref={stageFootRef}>
            <Advisors />
            {wide ? null : commit}
          </div>
        </section>

        <aside className="game-col game-col-goals" aria-label="Goals">
          <h2 className="game-col-title" tabIndex={-1}>Goals</h2>
          <Goals />
          {wide ? <DecisionLog /> : null}
        </aside>
      </main>
    </div>
  );
}

/** One-time pointer to the island toggle, kept per browser (and for this page, if storage is blocked). */
const COACH_KEY = "palari.weo-lab.island-coach.v1";
let coachRetired = false;
const coachSeen = () => {
  if (coachRetired) return true;
  try {
    return window.localStorage.getItem(COACH_KEY) === "1";
  } catch {
    return false;
  }
};
const retireCoach = () => {
  coachRetired = true;
  try {
    window.localStorage.setItem(COACH_KEY, "1");
  } catch {
    // Storage blocked: the pointer may show again next visit.
  }
};

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

/** A known shock landing in the quarter being decided, for the island's news band. */
type Landing = { name: string; short: string };

/** What the one-time island pointer may not cover while a newcomer reads the map. */
const COACH_COVERS = ".st-title, .st-hint, .st-key, .st-colheads > span, .st-goal, .st-lgoal, .st-strip, .st-lfoot";

/**
 * The scene slot: the cause-and-effect map, or the island, switched with the Map / Island
 * control (top-left over the map; top-right over the goal-by-goal list on phones and short
 * slots) or the I key. The island warms up while the player reads the map: it mounts hidden
 * once the cards are closed and the browser is idle, draws its first frames, then pauses, so
 * the first switch is immediate; it stays mounted but paused while the map is up. The two
 * views cross-fade together (200 ms; at once with reduced motion).
 */
function SceneSlot({ map, news, landing, children }: { map: ReactNode; news: SimEvent[]; landing: Landing[]; children: ReactNode }) {
  const view = useSceneView();
  const mapId = useMapId();
  const reduced = useReducedMotionFlag();
  const modal = useGame((s) => s.modal);
  const list = useStoryShown((s) => s.list) && mapId === "story";
  const [mounted, setMounted] = useState(view === "island");
  if (view === "island" && !mounted) setMounted(true);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  // The paused island has not drawn since it was hidden: the views swap only once it has drawn
  // fresh frames (the control shows Island pressed at once; the map stays up until then).
  const [drawn, setDrawn] = useState(false);
  if (view !== "island" && drawn) setDrawn(false);
  const onDrawn = useCallback(() => setDrawn(true), []);
  // No WebGL: the island shows its own note instead of a canvas, and never draws a frame.
  const [noGL, setNoGL] = useState(false);
  useEffect(() => {
    if (mounted || modal) return;
    const w = window as IdleWindow;
    let idle = 0;
    const wait = window.setTimeout(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(() => setMounted(true), { timeout: 4000 }) : window.setTimeout(() => setMounted(true), 0);
    }, 2500);
    return () => {
      window.clearTimeout(wait);
      if (!idle) return;
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [mounted, modal]);
  // No WebGL (the island shows its own note instead of a canvas): show that after a moment, and
  // stop waiting for frames that will never come.
  useEffect(() => {
    if (!mounted || ready) return;
    const id = window.setTimeout(() => {
      setReady(true);
      if (!document.querySelector("#game-view-island canvas")) {
        setNoGL(true);
        setDrawn(true);
      }
    }, 1500);
    return () => window.clearTimeout(id);
  }, [mounted, ready]);
  const shownDrawn = drawn || noGL;
  const island = view === "island" && ready && shownDrawn;
  const building = view === "island" && !(ready && shownDrawn);

  // The view being left goes inert: if focus was in it, it moves to the control's pressed half
  // instead of dropping to the page (a keyboard player keeps their place).
  const tabsRef = useRef<HTMLDivElement>(null);
  const shown = island ? "island" : "map";
  const lastShown = useRef(shown);
  useLayoutEffect(() => {
    if (lastShown.current === shown) return;
    const left = document.getElementById(lastShown.current === "island" ? "game-view-island" : "game-view-map");
    lastShown.current = shown;
    const active = document.activeElement;
    if (left && active && left.contains(active)) tabsRef.current?.querySelector<HTMLButtonElement>(`button[data-view="${shown}"]`)?.focus({ preventScroll: true });
  }, [shown]);

  // The first play screen points at the toggle once, for a few seconds, once the map's cards have
  // come in (about 2 s); visiting the island retires it for good. It sits beside the control on
  // the title row where that is clear, else just under the control; where both would cover the
  // map's title, a column heading, the key line, a goal or the strip while a newcomer reads them,
  // it waits for the second quarter (after the first recap closes). Then, if neither spot is
  // clear, it sits beside the control over the map's title, which the player has read by then,
  // rather than over the quarter's news or a goal.
  const clock = useLab((s) => s.clock);
  const [coach, setCoach] = useState(false);
  const [defer, setDefer] = useState(false);
  const [spot, setSpot] = useState<"beside" | "under" | "over-title">("beside");
  const waiting = defer && clock < 1;
  useEffect(() => {
    if (modal || waiting || coachSeen()) return;
    const show = window.setTimeout(() => {
      if (!coachSeen()) setCoach(true);
    }, 2000);
    const hide = window.setTimeout(() => {
      setCoach(false);
      retireCoach();
    }, 9000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [modal, waiting]);
  useEffect(() => {
    if (view === "island") {
      retireCoach();
      setCoach(false);
    }
  }, [view]);
  const coachRef = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = coachRef.current;
    const slot = slotRef.current;
    if (!coach || !el || !slot || spot === "over-title") return;
    const r = el.getBoundingClientRect();
    const covers = [...slot.querySelectorAll<HTMLElement>(COACH_COVERS)].some((x) => {
      const b = x.getBoundingClientRect();
      return b.width > 0 && r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom;
    });
    if (!covers) return;
    // Beside the control first, then under it; then the first quarter waits, and later ones
    // take the title row.
    if (spot === "beside") setSpot("under");
    else if (clock < 1) {
      setCoach(false);
      setDefer(true);
    } else setSpot("over-title");
  }, [coach, clock, list, view, spot]);
  useEffect(() => {
    if (!coach) setSpot("beside");
  }, [coach]);

  // The map's header leaves room for the control, and the island's news band is as tall as it:
  // its size, as --scene-tabs-w and --scene-tabs-h on the slot.
  const slotRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const slot = slotRef.current;
    const tabs = tabsRef.current;
    if (!slot || !tabs || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const r = tabs.getBoundingClientRect();
      slot.style.setProperty("--scene-tabs-w", `${Math.ceil(r.width)}px`);
      slot.style.setProperty("--scene-tabs-h", `${Math.ceil(r.height)}px`);
    });
    ro.observe(tabs);
    return () => ro.disconnect();
  }, []);

  const mapLabel = mapId === "story" ? "Map" : SCENES[mapId].label;
  return (
    <div ref={slotRef} className={`game-scene has-tabs is-${island ? "island" : "map"}${mapId === "story" ? " is-story" : ""}${list ? " is-list" : ""}${reduced ? " is-instant" : ""}`}>
      {/* The control comes first in the tab order, as it sits first on screen (top corner). */}
      <div ref={tabsRef} className="game-scene-tabs" role="group" aria-label="Show the map or the island (key I)">
        <button type="button" data-view="map" aria-pressed={view === "map"} aria-controls="game-view-map" aria-keyshortcuts="I" onClick={() => setSceneView("map")}>
          <SlotIcon name="map" />
          {mapLabel}
        </button>
        {/* While the island builds, a turning ring takes the island picture's place: same box, so
            neither label moves. */}
        <button
          type="button"
          data-view="island"
          aria-pressed={view === "island"}
          aria-controls={mounted ? "game-view-island" : undefined}
          aria-keyshortcuts="I"
          aria-busy={building || undefined}
          title={building ? "Loading" : undefined}
          onClick={() => setSceneView("island")}
        >
          {building ? <span className="game-scene-tabs-spin" aria-hidden="true" /> : <SlotIcon name="island" />}
          Island
        </button>
        <kbd className="game-scene-tabs-kbd" title="Press I to switch">
          I
        </kbd>
      </div>
      <div className="game-scene-views">
        <div id="game-view-map" className={`game-scene-view is-map${island ? "" : " is-on"}`} inert={island} aria-hidden={island || undefined}>
          {map}
        </div>
        {mounted ? (
          <div id="game-view-island" className={`game-scene-view is-island${island ? " is-on" : " is-under"}`} inert={!island} aria-hidden={!island || undefined}>
            {/* The island and its tag layer in one box under the news band, which is always there
                during play: the island keeps one frame from quarter to quarter. */}
            <div className="game-scene-island">
              <PlayIsland paused={view !== "island" && ready} onReady={onReady} onDrawn={onDrawn} />
            </div>
            <IslandNews news={news} landing={landing} />
            {mapId === "story" ? <StoryIslandLine /> : null}
          </div>
        ) : null}
      </div>
      {building ? (
        <span className="sr-only" role="status">
          Building the island…
        </span>
      ) : null}
      {coach && !modal && view === "map" ? (
        <p ref={coachRef} className="game-scene-coach" data-spot={spot === "under" ? "under" : "beside"} role="status">
          Peek at the island:{" "}
          <span className="game-scene-coach-key">
            press <kbd>I</kbd>
          </span>
          <span className="game-scene-coach-tap">tap Island</span>
        </p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * The island view's news: one band along the island's top edge, beside the Map / Island control.
 * It names the known shock landing in the quarter being decided ("This quarter, 2026Q1 · Food
 * price surge: inflation +2 pp, subsidies 0.5% GDP") and the news of the quarter just played,
 * this quarter's first; with neither, a quiet "No news this quarter". The band is always there,
 * so the island under it never re-frames; the map names the same news under its own header.
 */
function IslandNews({ news, landing }: { news: SimEvent[]; landing: Landing[] }) {
  const clock = useLab((s) => s.clock);
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const parts: { key: string; head: ReactNode; items: { title: string; detail: string }[] }[] = [];
  if (landing.length)
    parts.push({
      key: "now",
      head: (
        <>
          This quarter<span className="game-scene-islandnews-q">, {quarterLabel(clock + 1)}</span>
        </>
      ),
      items: landing.map((l) => ({ title: l.name, detail: lower(l.short) })),
    });
  if (news.length)
    parts.push({
      key: "played",
      head: (
        <>
          News<span className="game-scene-islandnews-q">, {quarterLabel(clock)}</span>
        </>
      ),
      items: news.map((e) => ({ title: e.title, detail: e.detail })),
    });
  const text = parts.map((p) => p.items.map((it) => `${it.title}: ${it.detail}`).join(" · ")).join(" · ");
  // Narrow slots (phones) keep the titles alone, so the news reads in full beside the control.
  return (
    <p className={`game-scene-islandnews${parts.length ? "" : " is-quiet"}`} title={text || undefined} aria-hidden="true">
      {parts.length ? (
        <span className="game-scene-islandnews-text">
          {parts.map((p, k) => (
            <span key={p.key}>
              {k ? " · " : ""}
              <b>{p.head}</b>
              {p.items.map((it, i) => (
                <span key={`${it.title}-${i}`}>
                  {" · "}
                  {it.title}
                  <span className="game-scene-islandnews-detail">: {it.detail}</span>
                </span>
              ))}
            </span>
          ))}
        </span>
      ) : (
        <span className="game-scene-islandnews-text">No news this quarter</span>
      )}
    </p>
  );
}

/** The toggle's two small pictures: a cause-and-effect map, an island. */
function SlotIcon({ name }: { name: "map" | "island" }) {
  return (
    <svg className="game-scene-tabs-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "map" ? (
        <path d="M2 3.5h4v3H2Z M2 9.5h4v3H2Z M11 6.5h3v3h-3Z M6 5c2.5 0 2.5 3 5 3 M6 11c2.5 0 2.5-3 5-3" />
      ) : (
        <path d="M1.5 13c1.6 1 3.2 1 4.8 0s3.2-1 4.8 0 2.6.9 3.4.4 M3.5 11.5c1.2-2.8 3-4 4.5-4s3.3 1.2 4.5 4 M8 7.5V3 M8 3c1.3-.7 2.6-.4 3.3.6 M8 3c-1.3-.7-2.6-.4-3.3.6" />
      )}
    </svg>
  );
}

/**
 * The island names its districts while a lever moves and for a few seconds after a quarter
 * ends, and pins a delta tag to the district whose goal figure moved most; the tag stays up
 * through the recap and goes when the group starts planning again.
 */
function useSceneCues() {
  const { mission, actual, clock } = useTurn();
  const modal = useGame((s) => s.modal);
  const lastClock = useRef(clock);
  const hadModal = useRef(Boolean(modal));

  useEffect(() => {
    const isLever = (t: EventTarget | null) => t instanceof Element && Boolean(t.closest(".game-col-levers .lab-range, .game-col-levers .lab-step"));
    let dragging = false;
    const down = (e: PointerEvent) => {
      if (!isLever(e.target)) return;
      dragging = true;
      nameDistricts("hold");
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      nameDistricts(1500);
    };
    const key = (e: KeyboardEvent) => {
      if (isLever(e.target) && e.key.startsWith("Arrow")) nameDistricts(2000);
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
      nameDistricts("off");
      useLab.setState({ sceneCue: {} });
    };
  }, []);

  useEffect(() => {
    const prev = lastClock.current;
    lastClock.current = clock;
    if (clock <= prev || !actual[prev]) {
      if (clock < prev) useLab.setState({ sceneCue: {} });
      return;
    }
    nameDistricts(3000);
    const judged = Array.from(new Set(mission.objectives.filter((o) => !o.bonus).map((o) => o.metric)));
    const moves = judged
      .map((m) => ({ m, d: actual[clock][m] - actual[prev][m] }))
      .filter((x) => Math.abs(x.d) >= 0.1)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const cue: Partial<Record<FocusKey, SceneCue>> = {};
    // A callout on every district that moved (the two biggest moves), not just the first.
    for (const { m, d } of moves.slice(0, 2)) {
      const meta = GAME_METRICS[m];
      cue[m as FocusKey] = { label: meta.label.toLowerCase(), up: d > 0, size: `${fmtNum(Math.abs(d), meta.digits)}${deltaUnit(meta.unit)}` };
    }
    useLab.setState({ sceneCue: cue });
  }, [clock, actual, mission]);

  useEffect(() => {
    if (hadModal.current && !modal) useLab.setState({ sceneCue: {} });
    hadModal.current = Boolean(modal);
    useLab.setState({ sceneCalm: modal?.kind === "recap" });
  }, [modal]);
  useEffect(() => () => useLab.setState({ sceneCalm: false }), []);
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
  // Wide screens have the room: the record starts open in the lever column.
  const wide = useMedia("(min-width: 1180px) and (min-height: 760px)");
  const start = turns[0];
  if (!start) return null;
  const inherited = new Set(start.decisions.map((d) => JSON.stringify(d)));
  const inheritedText = start.decisions.filter((d) => d.quarter === 0).map((d) => describeChanges(d.changes)).join(" · ");
  const mine = config.decisions.filter((d) => d.quarter >= 1 && d.quarter <= clock && !inherited.has(JSON.stringify(d))).sort((a, b) => b.quarter - a.quarter);
  return (
    <details className="game-log" open={wide || undefined}>
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

/**
 * Keeps an element at the tallest height it has had at this window size (its min-height), so
 * whatever shares its column does not jump as its text shortens: the advisors' notes change
 * length as a lever moves, and the scene slot above them would grow and shrink by a line.
 * A new window size starts afresh.
 */
function useSteadyHeight(host: RefObject<HTMLElement | null>, selector: string, on: boolean) {
  useEffect(() => {
    const el = host.current?.querySelector<HTMLElement>(selector);
    if (!el || !on || typeof ResizeObserver === "undefined") return;
    let max = 0;
    const grow = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h <= max) return;
      max = h;
      el.style.minHeight = `${h}px`;
    };
    const reset = () => {
      max = 0;
      el.style.minHeight = "";
      grow();
    };
    const ro = new ResizeObserver(grow);
    ro.observe(el);
    window.addEventListener("resize", reset);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", reset);
      el.style.minHeight = "";
    };
  }, [host, selector, on]);
}

/** A media query, kept live (false on the server and in the first render). */
function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
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
  const openSandbox = useGame((s) => s.openSandbox);
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
        <MenuHint close={close} />
        <button type="button" role="menuitem" onClick={() => { close(); setUiMode("next"); }}>Back to the new screen</button>
        <button type="button" role="menuitem" onClick={() => { close(); openSandbox(true); }}>Open in free play</button>
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

/**
 * What needs a decision this quarter. When nothing does, the box still says what is happening:
 * the news that lands this quarter, else a goal in trouble; "Quiet quarter" (and the Skip
 * suggestion) only when there is neither. A quarter with news never says "Nothing needs a
 * decision": it says the goals stay on track as set, or names the goal in trouble.
 */
function Agenda() {
  const { mission, config, clock, statuses, forecast, actual, policy, books, deciding, events } = useTurn();
  const modal = useGame((s) => s.modal);
  if (clock >= mission.quarters) return null;
  const items = attention({ mission, config, clock, statuses, forecast, actual, policy, votes: books?.votes ?? 0 });
  if (!items.length) {
    // A shock landing in the quarter being decided (a surprise's news card has just been read:
    // the agenda leaves surprises out), else the news of the quarter just played.
    const landing = config.shocks.find((s) => s.quarter === clock + 1);
    const played = events.find((e) => e.quarter === clock && e.kind !== "decision");
    const trouble = mission.objectives.find((o) => !o.bonus && (statuses[o.id] === "at-risk" || statuses[o.id] === "failed"));
    if (landing || played || trouble) {
      const lead = landing
        ? `${landing.id === "surprise-confidence" ? "Markets lose trust" : SHOCKS[landing.kind].name} lands in ${deciding}`
        : played
          ? `${played.title}, ${quarterLabel(clock)}`
          : `${GAME_METRICS[trouble!.metric].label} ${statuses[trouble!.id] === "failed" ? "goal missed" : "at risk"}`;
      const rule = policy.rateMode === "rule" ? " (the rule sets the rate for you)" : "";
      const status = trouble ? (statuses[trouble.id] === "failed" ? "missed" : "at risk") : null;
      const goalWords = trouble ? `${trouble.label.charAt(0).toLowerCase()}${trouble.label.slice(1)}` : "";
      const body =
        landing || played
          ? trouble
            ? `Your ${GAME_METRICS[trouble.metric].label.toLowerCase()} goal is ${status}: ${goalWords}. The map shows what ${landing ? "it pushes" : "pushed it"}.`
            : `Your goals stay on track as set: no change needed${rule}. The map shows what ${landing ? "it pushes" : "it pushed"}.`
          : `Goal: ${goalWords}. The map shows what pushes it; your levers stay as set unless you change them.`;
      return (
        <div className="game-agenda is-news" role="status">
          <strong>{lead}</strong>
          <span>{body}</span>
        </div>
      );
    }
    return (
      <div className="game-agenda is-quiet" role="status">
        <strong>Quiet quarter</strong>
        <span>Nothing needs a decision. Skip ahead and the game stops when something happens.</span>
      </div>
    );
  }
  // One line leads; once the news card has been answered, its shock (already read in full on
  // the card) waits behind "More" so the lever sits right under the heading.
  const answered = !modal && items.every((a) => a.key.startsWith("shock:"));
  const list = (
    <ul>
      {items.slice(0, 3).map((a) => (
        <li key={a.key} className={`is-${a.tone}`}>{a.text}</li>
      ))}
    </ul>
  );
  return (
    <div className="game-agenda" role="status">
      <strong>
        Decide now for {deciding}
        {items.length > 1 ? ` · ${items.length} things` : ""}
        {clock === 0 ? <span className="game-agenda-note">: it stays in force until you change it.</span> : null}
      </strong>
      {answered ? (
        <details className="game-agenda-more">
          <summary>More</summary>
          {list}
        </details>
      ) : (
        list
      )}
    </div>
  );
}

const STATUS_WORD: Record<ObjectiveStatus, string> = { met: "met", failed: "missed", "on-track": "on track", "at-risk": "at risk" };
const STATUS_RANK: Record<ObjectiveStatus, number> = { failed: 0, "at-risk": 1, "on-track": 2, met: 3 };
/** A goal's name in the End bar: "Debt", "Jobless", never lower case. */
const stripName = (label: string) => {
  const s = label.replace("Public ", "").replace("Unemployment", "Jobless");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * The End bar's goal strip (laptops under 1180 px and phones, where the goals column is out of
 * sight): each goal's forecast at the quarter that decides it, dated ("Inflation 3.0 by 27Q4",
 * "Growth low 1.4 in 26Q4"), its status (dot and word), and what the player's moves since the
 * mission began do to it ("▼ 1.0 pp helps"), as the goal cards read them. Under 760 px only
 * the goals in trouble show, at most two rows: the rest fold into one line ("2 more on track")
 * that takes the player to the goals.
 */
function EndStrip() {
  const { mission, config, actual, forecast, clock, statuses } = useTurn();
  const { untouched } = useUntouched(config, clock, forecast, actual);
  const reduced = useReducedMotionFlag();
  const end = mission.quarters;
  if (clock >= end) return null;
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  const rows = metrics.map((metric, order) => {
    const objectives = mission.objectives.filter((o) => o.metric === metric);
    const main = objectives.find((o) => !o.bonus) ?? objectives[0];
    const status: ObjectiveStatus | undefined = main ? statuses[main.id] : undefined;
    // An every-quarter goal reads its low (or high) point, as its card does; others the end.
    const deciding = decidingQuarter(main, forecast, clock, end);
    const q = deciding ? deciding.worst : end;
    return { metric, order, main, objectives, status, deciding, q, d: goalEffect(main, forecast, untouched, clock, end, metric).d, value: forecast[q][metric] };
  });
  const troubled = (r: (typeof rows)[number]) => r.status === "at-risk" || r.status === "failed";
  // Phones: the goals in trouble, worst first; the strip keeps to two rows.
  const worst = rows.filter(troubled).sort((a, b) => STATUS_RANK[a.status!] - STATUS_RANK[b.status!] || a.order - b.order);
  const phone = new Set((worst.length === 2 && rows.length === 2 ? worst : worst.slice(0, 1)).map((r) => r.metric));
  const folded = rows.filter((r) => !phone.has(r.metric));
  const foldedTrouble = folded.filter(troubled).length;
  const foldedOk = folded.length - foldedTrouble;
  const more = !folded.length
    ? ""
    : !phone.size
      ? folded.length === 2
        ? "Both goals on track"
        : folded.length === 1
          ? `${stripName(GAME_METRICS[folded[0].metric].label)} on track`
          : `All ${folded.length} goals on track`
      : [foldedTrouble ? `${foldedTrouble} more in trouble` : "", foldedOk ? `${foldedOk} more on track` : ""].filter(Boolean).join(", ");
  const toGoals = () => {
    const col = document.querySelector<HTMLElement>(".game-col-goals");
    if (!col) return;
    col.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    col.querySelector<HTMLElement>(".game-col-title")?.focus({ preventScroll: true });
  };
  return (
    <div className="game-move-strip" aria-label="Your goals: the forecast and what your moves do">
      {rows.map((r) => {
        const meta = GAME_METRICS[r.metric];
        const tone = toneOf(r.main, r.d);
        return (
          <span key={r.metric} className={`game-move-strip-item${phone.has(r.metric) ? "" : " is-folded"}`}>
            {/* The status word goes with the level; the helps/hurts word goes with the move. */}
            <span className="game-move-strip-level">
              <b>{stripName(meta.label)}</b>
              {r.deciding && r.main ? <span className="game-move-strip-at"> {r.main.op === ">=" ? "low" : "high"}</span> : null}{" "}
              <span className="tabular-nums">
                <TweenNum value={r.value} digits={meta.digits} />
              </span>
              <span className="game-move-strip-at">
                {" "}
                {r.deciding ? "in" : "by"} {quarterLabel(r.q).slice(2)}
              </span>
              {r.status ? (
                <>
                  {" "}
                  · <span className={`game-status is-${r.status}`}>{STATUS_WORD[r.status]}</span>
                </>
              ) : null}
            </span>
            {Math.abs(r.d) >= 0.05 ? (
              <span className={`game-move-strip-d is-${tone}`}>
                <Glyph name={r.d > 0 ? "up" : "down"} />
                <TweenNum value={Math.abs(r.d)} digits={meta.digits} />
                {deltaUnit(meta.unit)} <Valence tone={tone} />
              </span>
            ) : null}
          </span>
        );
      })}
      {more ? (
        <button type="button" className="game-move-strip-more" onClick={toGoals}>
          {more} <span aria-hidden="true">↓</span>
          <span className="sr-only">: show the goals</span>
        </button>
      ) : null}
    </div>
  );
}

/** Whether a move toward the goal helps it (as the goal cards say). */
function toneOf(o: Objective | undefined, d: number): Tone {
  if (!o || Math.abs(d) < 0.05) return "neutral";
  return (o.op === "<=" ? d < 0 : d > 0) ? "good" : "bad";
}

/** A goal figure that eases to its new value when a lever or the clock moves it. */
function TweenNum({ value, digits }: { value: number; digits: number }) {
  return <>{fmtNum(useTween(value), digits)}</>;
}

/** Shown over the scene slot (map or island) while quarters play by themselves. */
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

/** "Need a hint?" lives in the menu: one press shows the mission's hint in place. */
function MenuHint({ close }: { close: () => void }) {
  const { mission } = useTurn();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        role="menuitem"
        aria-expanded={open}
        onClick={() => {
          if (!open) sound.play("pluck");
          setOpen((v) => !v);
        }}
      >
        {open ? "Hide the hint" : "Need a hint?"}
      </button>
      {open ? (
        <p className="game-menu-hint" role="note" onClick={close}>
          {mission.hint}
        </p>
      ) : null}
    </>
  );
}
