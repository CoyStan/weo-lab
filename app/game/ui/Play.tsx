"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
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
      // Typing, or on a slider (native or custom): every key, arrows and letters, stays with it.
      if (t && (t.closest("input, select, textarea, [role=slider]") || t.isContentEditable)) return;
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
          {tips && mission.number === 1 && clock === 0 && !changed ? <p className="game-coach">Move the policy rate and watch the blue forecast on each goal.</p> : null}
          <div className="game-agenda-top">
            <Agenda />
          </div>
          {panel === "levers" ? <Levers /> : <Reforms />}
          {wide ? commit : null}
          {panel === "levers" && !wide ? <DecisionLog /> : null}
        </aside>

        <section className="game-stage" aria-label="Cause and effect map, or the island">
          <SceneSlot map={scene} news={news}>
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
          <h2 className="game-col-title">Goals</h2>
          <Goals />
          {wide ? <DecisionLog /> : null}
        </aside>
      </main>
    </div>
  );
}

/** One-time pointer to the island toggle, kept per browser. */
const COACH_KEY = "palari.weo-lab.island-coach.v1";
const coachSeen = () => {
  try {
    return window.localStorage.getItem(COACH_KEY) === "1";
  } catch {
    return false;
  }
};
const retireCoach = () => {
  try {
    window.localStorage.setItem(COACH_KEY, "1");
  } catch {
    // Storage blocked: the pointer may show again next visit.
  }
};

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

/**
 * The scene slot: the cause-and-effect map, or the island, switched with the Map / Island
 * control (top-left over the map; top-right over the goal-by-goal list on phones and short
 * slots) or the I key. The island warms up while the player reads the map: it mounts hidden
 * once the cards are closed and the browser is idle, draws its first frames, then pauses, so
 * the first switch is immediate; it stays mounted but paused while the map is up. The two
 * views cross-fade together (200 ms; at once with reduced motion).
 */
function SceneSlot({ map, news, children }: { map: ReactNode; news: SimEvent[]; children: ReactNode }) {
  const view = useSceneView();
  const mapId = useMapId();
  const reduced = useReducedMotionFlag();
  const modal = useGame((s) => s.modal);
  const list = useStoryShown((s) => s.list) && mapId === "story";
  const [mounted, setMounted] = useState(view === "island");
  if (view === "island" && !mounted) setMounted(true);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
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
  // No WebGL (the island shows its own note instead of a canvas): show that after a moment.
  useEffect(() => {
    if (!mounted || ready) return;
    const id = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(id);
  }, [mounted, ready]);
  const island = view === "island" && ready;
  const building = view === "island" && !ready;

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

  // The first play screen points at the toggle once, for a few seconds; switching retires it.
  const [coach, setCoach] = useState(false);
  useEffect(() => {
    if (modal || coachSeen()) return;
    const show = window.setTimeout(() => setCoach(true), 1200);
    const hide = window.setTimeout(() => {
      setCoach(false);
      retireCoach();
    }, 8200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [modal]);
  useEffect(() => {
    if (view === "island") retireCoach();
  }, [view]);

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
    <div
      ref={slotRef}
      className={`game-scene has-tabs is-${island ? "island" : "map"}${mapId === "story" ? " is-story" : ""}${list ? " is-list" : ""}${news.length ? " has-news" : ""}${reduced ? " is-instant" : ""}`}
    >
      <div className="game-scene-views">
        <div id="game-view-map" className={`game-scene-view is-map${island ? "" : " is-on"}`} inert={island} aria-hidden={island || undefined}>
          {map}
        </div>
        {mounted ? (
          <div id="game-view-island" className={`game-scene-view is-island${island ? " is-on" : ""}`} inert={!island} aria-hidden={!island || undefined}>
            {/* The island and its tag layer in one box, so a news band can sit above both. */}
            <div className="game-scene-island">
              <PlayIsland paused={view !== "island" && ready} onReady={onReady} />
            </div>
            <IslandNews news={news} />
            {mapId === "story" ? <StoryIslandLine /> : null}
          </div>
        ) : null}
      </div>
      <div ref={tabsRef} className="game-scene-tabs" role="group" aria-label="Show the map or the island (key I)">
        <button type="button" data-view="map" aria-pressed={view === "map"} aria-controls="game-view-map" aria-keyshortcuts="I" onClick={() => setSceneView("map")}>
          <SlotIcon name="map" />
          {mapLabel}
        </button>
        <button type="button" data-view="island" aria-pressed={view === "island"} aria-controls={mounted ? "game-view-island" : undefined} aria-keyshortcuts="I" aria-busy={building || undefined} onClick={() => setSceneView("island")}>
          <SlotIcon name="island" />
          Island
          {building ? <span className="game-scene-tabs-spin" aria-hidden="true" /> : null}
        </button>
        <kbd className="game-scene-tabs-kbd" title="Press I to switch">
          I
        </kbd>
      </div>
      {building ? (
        <span className="sr-only" role="status">
          Building the island…
        </span>
      ) : null}
      {coach && !modal && view === "map" ? (
        <p className="game-scene-coach" role="status">
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
 * The island view's news: the quarter's events in one band along the island's top edge, beside
 * the Map / Island control. The island is drawn below the band (game.css), so the news covers
 * nothing; the map names the same news under its own header.
 */
function IslandNews({ news }: { news: SimEvent[] }) {
  const clock = useLab((s) => s.clock);
  if (!news.length) return null;
  const text = news.map((e) => `${e.title}: ${e.detail}`).join(" · ");
  // Narrow slots (phones) keep the titles alone, so the news reads in full beside the control.
  return (
    <p className="game-scene-islandnews" title={text} aria-hidden="true">
      <b>
        News<span className="game-scene-islandnews-q">, {quarterLabel(clock)}</span>
      </b>
      <span className="game-scene-islandnews-text">
        {news.map((e, i) => (
          <span key={`${e.title}-${i}`}>
            {i ? " · " : ""}
            {e.title}
            <span className="game-scene-islandnews-detail">: {e.detail}</span>
          </span>
        ))}
      </span>
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

/** What needs a decision this quarter, or a note that it is quiet. */
function Agenda() {
  const { mission, config, clock, statuses, forecast, actual, policy, books, deciding } = useTurn();
  const modal = useGame((s) => s.modal);
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
