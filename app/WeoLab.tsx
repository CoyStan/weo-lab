"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import "./weo-lab.css";
import AssumptionsPanel from "./components/AssumptionsPanel";
import ChartsStrip from "./components/ChartsStrip";
import ConstraintsPanel from "./components/ConstraintsPanel";
import EventFeed from "./components/EventFeed";
import { METRICS } from "./components/format";
import IndicatorTiles from "./components/IndicatorTiles";
import PolicyDesk from "./components/PolicyDesk";
import ProjectionTable from "./components/ProjectionTable";
import Scorecard from "./components/Scorecard";
import ShocksPanel from "./components/ShocksPanel";
import TopBar from "./components/TopBar";
import { Btn, Panel, Segmented } from "./components/ui";
import { quarterLabel } from "./model/economy";
import { getPreset } from "./model/presets";
import { SHOCKS } from "./model/shocks";
import { STORYLINES } from "./model/storylines";
import { decodeConfig, loadSavedConfig, saveConfig, useLab } from "./store";
import { getTheme } from "./themes";

const IslandScene = dynamic(() => import("./scene/IslandScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[0.78rem] text-[var(--lab-ink-2)]" role="status">
      Building the island…
    </div>
  ),
});

type DeskTab = "policy" | "assumptions" | "shocks";

export default function WeoLab() {
  const [tab, setTab] = useState<DeskTab>("policy");
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const step = useLab((s) => s.step);
  const play = useLab((s) => s.play);
  const pause = useLab((s) => s.pause);
  const setClock = useLab((s) => s.setClock);
  const config = useLab((s) => s.config);
  const hydrated = useLab((s) => s.hydrated);
  const loadConfig = useLab((s) => s.loadConfig);
  const markHydrated = useLab((s) => s.markHydrated);
  const view = useLab((s) => s.view);
  const themeId = useLab((s) => s.theme);
  const setTheme = useLab((s) => s.setTheme);
  const theme = getTheme(themeId);
  const decisions = config.decisions.length + config.oneOffs.length;
  const shocksCount = config.shocks.length + (config.randomShocks ? 1 : 0);

  // Restore a shared link or the last saved scenario once, after mount.
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
    const fromLink = match ? decodeConfig(match[1]) : null;
    const restored = fromLink ?? loadSavedConfig();
    if (restored) loadConfig(restored);
    const params = new URLSearchParams(window.location.search);
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("palari.weo-lab.theme");
    } catch {
      // Storage blocked: fall back to the URL or the default.
    }
    setTheme(getTheme(params.get("theme") ?? savedTheme).id);
    markHydrated();
  }, [loadConfig, markHydrated, setTheme]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("palari.weo-lab.theme", themeId);
    } catch {
      // ignore
    }
    const url = new URL(window.location.href);
    if (themeId === "palari") url.searchParams.delete("theme");
    else url.searchParams.set("theme", themeId);
    window.history.replaceState(null, "", url);
  }, [themeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => saveConfig(config), 300);
    return () => window.clearTimeout(id);
  }, [config, hydrated]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => step(1), 850 / speed);
    return () => window.clearInterval(id);
  }, [playing, speed, step]);

  // Close any open menu on an outside click or Escape.
  useEffect(() => {
    const closeMenus = (except?: Node | null) => {
      document.querySelectorAll<HTMLDetailsElement>("details.lab-menu[open]").forEach((d) => {
        if (!except || !d.contains(except)) d.open = false;
      });
    };
    const onDown = (e: PointerEvent) => closeMenus(e.target as Node);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useLab.getState().redo();
        else useLab.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useLab.getState().redo();
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === " ") {
        e.preventDefault();
        if (useLab.getState().playing) pause();
        else play();
      } else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Home") setClock(0);
      else if (e.key === "End") setClock(24);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play, pause, step, setClock]);

  return (
    <div
      className="lab flex min-h-dvh flex-col bg-[var(--lab-bg)] text-[var(--lab-ink)] xl:h-dvh xl:overflow-hidden"
      data-theme={theme.id}
      style={{ ...(theme.vars as React.CSSProperties), colorScheme: theme.scheme }}
    >
      {theme.css ? <style>{theme.css}</style> : null}
      <TopBar />
      <main id="main-content" className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[322px_minmax(0,1fr)_344px]">
        <aside className="order-2 flex min-h-0 flex-col xl:order-1" aria-label="Policy desk">
          <Panel className="flex min-h-0 flex-1 flex-col !p-0">
            <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--lab-ink)_8%,transparent)] px-3 pt-3 pb-2">
              <Segmented<DeskTab>
                ariaLabel="Desk"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "policy", label: decisions ? `Policy · ${decisions}` : "Policy" },
                  { value: "assumptions", label: "Assumptions" },
                  { value: "shocks", label: shocksCount ? `Shocks · ${shocksCount}` : "Shocks" },
                ]}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2 xl:max-h-none">
              {tab === "policy" ? <PolicyDesk /> : tab === "assumptions" ? <AssumptionsPanel /> : <ShocksPanel />}
            </div>
          </Panel>
        </aside>

        <section className="order-1 flex min-h-0 min-w-0 flex-col gap-3 xl:order-2" aria-label="Simulation">
          <div className="lab-scene min-h-[360px] flex-1 sm:min-h-[420px]">
            <IslandScene />
            <SceneOverlay />
          </div>
          <div className="h-[238px] shrink-0">{view === "charts" ? <ChartsStrip /> : <ProjectionTable />}</div>
        </section>

        <aside className="order-3 flex min-h-0 flex-col gap-3 overflow-y-auto xl:pr-0.5" aria-label="Indicators and assessment">
          <IndicatorTiles />
          <Scorecard />
          <ConstraintsPanel />
          <EventFeed />
        </aside>
      </main>
    </div>
  );
}

function SceneOverlay() {
  const clock = useLab((s) => s.clock);
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const events = useLab((s) => s.result.events);
  const presetId = useLab((s) => s.config.presetId);
  const preset = getPreset(presetId);
  const storyId = useLab((s) => s.storyId);
  const story = STORYLINES.find((x) => x.id === storyId);
  const labels = useLab((s) => s.labels);
  const setLabels = useLab((s) => s.setLabels);
  const homeCamera = useLab((s) => s.homeCamera);
  const [hint, setHint] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);

  useEffect(() => {
    try {
      setHint(window.localStorage.getItem("palari.weo-lab.hint") !== "dismissed");
    } catch {
      setHint(true);
    }
  }, []);
  useEffect(() => setBriefOpen(true), [storyId]);

  const dismissHint = () => {
    setHint(false);
    try {
      window.localStorage.setItem("palari.weo-lab.hint", "dismissed");
    } catch {
      // Storage may be blocked; the hint simply returns next visit.
    }
  };

  const now = useMemo(() => events.filter((e) => e.quarter === clock && (e.kind === "shock" || e.kind === "crisis" || e.kind === "regime" || e.kind === "program" || e.kind === "action")), [events, clock]);

  return (
    <div className="lab-scene-overlay">
      <div className="absolute left-3 top-3 flex max-w-[60%] flex-col gap-1.5">
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--lab-ink)_12%,transparent)] bg-[color-mix(in_srgb,var(--lab-paper)_90%,transparent)] px-2.5 py-1.5 backdrop-blur">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[1rem] font-semibold leading-none">{preset.name}</span>
            <span className="text-[0.66rem] text-[var(--lab-ink-2)]">{preset.archetype}</span>
          </div>
        </div>
        {story && briefOpen ? (
          <div className="max-w-[22rem] rounded-lg border border-[color-mix(in_srgb,var(--lab-info-mark)_45%,transparent)] bg-[color-mix(in_srgb,var(--lab-paper)_95%,transparent)] px-2.5 py-2 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--lab-info)]">Exercise</span>
              <button type="button" onClick={() => setBriefOpen(false)} aria-label="Hide exercise brief" className="-mt-0.5 text-[0.9rem] leading-none text-[var(--lab-ink-2)] hover:text-[var(--lab-ink)]">×</button>
            </div>
            <div className="text-[0.8rem] font-semibold leading-tight">{story.title}</div>
            <p className="mt-0.5 text-[0.68rem] leading-snug text-[var(--lab-ink-2)] max-2xl:line-clamp-2" title={story.brief}>{story.brief}</p>
          </div>
        ) : null}
        {focus ? (
          <button type="button" onClick={() => setFocus(null)} className="lab-chip lab-chip-info self-start" title="Clear focus">
            Focus: {METRICS[focus].label} ×
          </button>
        ) : null}
        <ShockLegend />
      </div>
      <div className="absolute right-3 top-3 flex max-w-[46%] flex-col items-end gap-1.5">
        {now.map((e, i) => (
          <div key={`${e.quarter}-${e.title}-${i}`} className={`lab-toast rounded-lg border px-2.5 py-1.5 text-right shadow-md backdrop-blur ${e.severity === "bad" ? "border-[color-mix(in_srgb,var(--lab-alert)_50%,transparent)] bg-[var(--lab-bad-surface)]" : e.severity === "good" ? "border-[color-mix(in_srgb,var(--lab-good-mark)_40%,transparent)] bg-[var(--lab-good-surface)]" : "border-[color-mix(in_srgb,var(--lab-ink)_15%,transparent)] bg-[color-mix(in_srgb,var(--lab-paper)_95%,transparent)]"}`} role="status">
            <div className="text-[0.76rem] font-semibold leading-tight">{e.title}</div>
            <div className="text-[0.64rem] leading-snug text-[var(--lab-ink-2)]">{e.detail}</div>
          </div>
        ))}
      </div>
      {hint ? (
        <div className="absolute bottom-14 left-3 flex max-w-[min(34rem,70%)] items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--lab-ink)_12%,transparent)] bg-[color-mix(in_srgb,var(--lab-paper)_90%,transparent)] px-2.5 py-1.5 text-[0.66rem] leading-snug text-[var(--lab-ink-2)] backdrop-blur">
          <span>
            Drag to orbit, scroll to zoom, click a building to focus it. Buildings resize as quarters pass; storms mark shocks. Keys: <kbd className="lab-kbd">Space</kbd> play, <kbd className="lab-kbd">←</kbd><kbd className="lab-kbd">→</kbd> step, <kbd className="lab-kbd">⌘Z</kbd> undo.
          </span>
          <Btn size="xs" variant="soft" onClick={dismissHint} title="Hide hint">Got it</Btn>
        </div>
      ) : null}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--lab-ink)_12%,transparent)] bg-[color-mix(in_srgb,var(--lab-paper)_92%,transparent)] p-1 shadow-sm backdrop-blur">
        <Segmented
          ariaLabel="Scene labels"
          value={labels}
          onChange={setLabels}
          options={[
            { value: "all", label: "All labels", title: "Show every district's reading" },
            { value: "focus", label: "On hover", title: "Show a label only for the hovered or focused district" },
          ]}
        />
        <Btn size="xs" variant="ghost" onClick={homeCamera} title="Fly the camera back to the overview">Reset view</Btn>
        <span className="px-1.5 text-[0.72rem] font-semibold tabular-nums">{quarterLabel(clock)}</span>
      </div>
    </div>
  );
}

function ShockLegend() {
  const current = useLab((s) => s.result.path[Math.min(s.clock, s.result.path.length - 1)]);
  if (!current.activeShocks.length) return null;
  return (
    <div className="lab-chip lab-chip-bad self-start" role="status">
      Shock in progress: {Array.from(new Set(current.activeShocks)).map((k) => SHOCKS[k].name).join(" · ")}
    </div>
  );
}
