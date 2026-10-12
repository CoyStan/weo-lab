"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { STORYLINES } from "../model/storylines";
import { THEMES } from "../themes";
import { HORIZON, quarterLabel, quarterYear, yearLabels } from "../model/economy";
import { PRESETS } from "../model/presets";
import { useGame } from "../game/store";
import { encodeConfig, selectReference, useLab } from "../store";
import { buildCsv } from "./ProjectionTable";
import { Btn, Segmented } from "./ui";

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TopBar() {
  const config = useLab((s) => s.config);
  const result = useLab((s) => s.result);
  const reference = useLab(selectReference);
  const clock = useLab((s) => s.clock);
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const compare = useLab((s) => s.compare);
  const pinned = useLab((s) => s.pinned);
  const view = useLab((s) => s.view);
  const setPreset = useLab((s) => s.setPreset);
  const setClock = useLab((s) => s.setClock);
  const step = useLab((s) => s.step);
  const play = useLab((s) => s.play);
  const pause = useLab((s) => s.pause);
  const setSpeed = useLab((s) => s.setSpeed);
  const pin = useLab((s) => s.pin);
  const unpin = useLab((s) => s.unpin);
  const setCompare = useLab((s) => s.setCompare);
  const setView = useLab((s) => s.setView);
  const reset = useLab((s) => s.reset);
  const undo = useLab((s) => s.undo);
  const redo = useLab((s) => s.redo);
  const canUndo = useLab((s) => s.past.length > 0);
  const canRedo = useLab((s) => s.future.length > 0);
  const loadStory = useLab((s) => s.loadStory);
  const storyId = useLab((s) => s.storyId);
  const [copied, setCopied] = useState(false);
  const storyMenu = useRef<HTMLDetailsElement>(null);
  const exportMenu = useRef<HTMLDetailsElement>(null);
  const designMenu = useRef<HTMLDetailsElement>(null);
  const themeId = useLab((s) => s.theme);
  const setTheme = useLab((s) => s.setTheme);

  const preset = PRESETS.find((p) => p.id === config.presetId) ?? PRESETS[0];

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#s=${encodeConfig(config)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this scenario link", url);
    }
    window.history.replaceState(null, "", `#s=${encodeConfig(config)}`);
  };

  return (
    <header className="shrink-0 px-3 pt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" onClick={() => useGame.getState().setScreen("title")} className="inline-flex shrink-0 items-center gap-2" aria-label="Back to the campaign">
          <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/brand/palari-logo.svg`} alt="" width={542} height={220} className="h-7 w-auto" />
        </button>
        <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={() => useGame.getState().setScreen("missions")} title="Back to the missions">
          Campaign
        </button>
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-[1.25rem] font-semibold leading-none tracking-tight text-[var(--lab-ink)]">WEO Scenario Lab</h1>
          <span className="lab-stamp text-[var(--lab-bad)]" title="An independent educational game, not affiliated with or endorsed by the IMF. Stylised economies and an illustrative model; not forecasts or policy advice.">Illustrative</span>
        </div>
        <div className="flex items-center gap-2 lg:ml-2">
          <Segmented ariaLabel="Economy" size="md" value={config.presetId} onChange={setPreset} options={PRESETS.map((p) => ({ value: p.id, label: p.name, title: p.tagline }))} />
          <span className="hidden text-[0.7rem] text-[var(--lab-ink-2)] 2xl:inline">{preset.tagline}</span>
        </div>
        <details ref={storyMenu} className="lab-menu">
          <summary className={`lab-btn lab-btn-sm ${storyId ? "lab-btn-ghost" : "lab-btn-soft"}`} title="Load a ready-made exercise">
            Exercises ▾
          </summary>
          <div className="lab-menu-panel left-0 w-[min(22rem,calc(100vw-2rem))]" role="menu">
            {STORYLINES.map((story) => (
              <button
                key={story.id}
                type="button"
                role="menuitem"
                className="lab-menu-item"
                onClick={() => {
                  loadStory(story.id, story.build());
                  if (storyMenu.current) storyMenu.current.open = false;
                }}
              >
                <span className="flex items-center gap-2 text-[0.8rem] font-semibold">
                  {story.title}
                  {storyId === story.id ? <span className="lab-chip lab-chip-info">loaded</span> : null}
                </span>
                <span className="mt-0.5 block text-[0.7rem] leading-snug text-[var(--lab-ink-2)]">{story.brief}</span>
              </button>
            ))}
          </div>
        </details>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="flex items-center" role="group" aria-label="History">
            <Btn size="sm" variant="soft" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/⌘ Z)" className="!rounded-r-none">↶ Undo</Btn>
            <Btn size="sm" variant="soft" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/⌘ Shift Z)" className="!rounded-l-none border-l border-l-[color-mix(in_srgb,var(--lab-ink)_12%,transparent)]">↷</Btn>
          </div>
          {pinned ? (
            <Segmented
              ariaLabel="Compare against"
              value={compare}
              onChange={setCompare}
              options={[
                { value: "baseline", label: "vs WEO" },
                { value: "pinned", label: "vs pinned" },
              ]}
            />
          ) : null}
          <Btn onClick={pinned ? unpin : pin} title={pinned ? "Drop the pinned scenario" : "Keep this path as a comparison and keep exploring"} ariaPressed={Boolean(pinned)}>
            {pinned ? "Unpin" : "Pin scenario"}
          </Btn>
          <Btn onClick={share} title="Copy a link that reproduces this scenario">{copied ? "Link copied" : "Share"}</Btn>
          <details ref={designMenu} className="lab-menu">
            <summary className="lab-btn lab-btn-sm lab-btn-ghost" title="Switch the visual design">Design ▾</summary>
            <div className="lab-menu-panel right-0 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto" role="menu">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={t.id === themeId}
                  className="lab-menu-item"
                  onClick={() => {
                    setTheme(t.id);
                    if (designMenu.current) designMenu.current.open = false;
                  }}
                >
                  <span className="flex items-center gap-2 text-[0.78rem] font-semibold">
                    <span aria-hidden="true" className="inline-flex h-3.5 w-7 overflow-hidden rounded-sm border border-[var(--lab-line-strong)]">
                      <span className="flex-1" style={{ background: t.vars["--lab-bg"] ?? "#f7f5f2" }} />
                      <span className="flex-1" style={{ background: t.vars["--lab-scenario"] ?? "#4a3aa7" }} />
                      <span className="flex-1" style={{ background: t.scene.grass ?? "#b7d19a" }} />
                    </span>
                    {t.name}
                    {t.id === themeId ? <span className="lab-chip lab-chip-info">on</span> : null}
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">{t.description}</span>
                </button>
              ))}
            </div>
          </details>
          <details ref={exportMenu} className="lab-menu">
            <summary className="lab-btn lab-btn-sm lab-btn-ghost">Export ▾</summary>
            <div className="lab-menu-panel right-0" role="menu">
              <button
                type="button"
                role="menuitem"
                className="lab-menu-item"
                onClick={() => {
                  download(`weo-lab-${config.presetId}-${quarterLabel(clock)}.csv`, buildCsv(result.path, reference.path, compare === "pinned" ? "Pinned" : "WEO reference"), "text/csv");
                  if (exportMenu.current) exportMenu.current.open = false;
                }}
              >
                <span className="block text-[0.78rem] font-semibold">Projection table (CSV)</span>
                <span className="block text-[0.68rem] text-[var(--lab-ink-2)]">Annual and quarterly paths, scenario and reference</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="lab-menu-item"
                onClick={() => {
                  download(`weo-lab-${config.presetId}.json`, JSON.stringify(config, null, 2), "application/json");
                  if (exportMenu.current) exportMenu.current.open = false;
                }}
              >
                <span className="block text-[0.78rem] font-semibold">Scenario setup (JSON)</span>
                <span className="block text-[0.68rem] text-[var(--lab-ink-2)]">Assumptions, decisions, shocks and constraints</span>
              </button>
            </div>
          </details>
          <Btn variant="danger" onClick={reset} title="Back to the preset's unchanged policies and WEO assumptions">Reset</Btn>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[color-mix(in_srgb,var(--lab-ink)_10%,transparent)] bg-[var(--lab-paper)] px-3 py-1.5">
        <div className="flex items-center gap-1" role="group" aria-label="Playback">
          <Btn size="xs" variant="soft" onClick={() => setClock(0)} title="Back to the start (Home)" disabled={clock === 0}>⏮</Btn>
          <Btn size="xs" variant="soft" onClick={() => step(-1)} title="Previous quarter (←)" disabled={clock === 0}>◀</Btn>
          <Btn size="sm" variant="primary" onClick={playing ? pause : play} title={playing ? "Pause (space)" : "Play (space)"} className="min-w-[4.6rem]">
            {playing ? "Pause" : clock >= HORIZON ? "Replay" : "Play"}
          </Btn>
          <Btn size="xs" variant="soft" onClick={() => step(1)} title="Next quarter (→)" disabled={clock >= HORIZON}>▶</Btn>
          <Btn size="xs" variant="soft" onClick={() => setClock(HORIZON)} title="Jump to the end (End)" disabled={clock >= HORIZON}>⏭</Btn>
          <Segmented
            ariaLabel="Speed"
            value={String(speed)}
            onChange={(v) => setSpeed(Number(v) as 1 | 2 | 4)}
            options={[
              { value: "1", label: "1×" },
              { value: "2", label: "2×" },
              { value: "4", label: "4×" },
            ]}
          />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[1.5rem] font-semibold leading-none tabular-nums text-[var(--lab-ink)]">{clock === 0 ? "Start" : `${quarterYear(clock)} Q${((clock - 1) % 4) + 1}`}</span>
          <span className="text-[0.68rem] text-[var(--lab-ink-2)]">{clock === 0 ? "2025 outturn" : `quarter ${clock} of ${HORIZON}`}</span>
        </div>
        <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
          <input type="range" className="lab-range" min={0} max={HORIZON} step={1} value={clock} onChange={(e) => setClock(Number(e.target.value))} style={{ ["--pct" as string]: `${(clock / HORIZON) * 100}%` }} aria-label="Clock" aria-valuetext={quarterLabel(clock)} />
          <div className="flex justify-between px-1 text-[0.6rem] tabular-nums text-[var(--lab-ink-2)]" aria-hidden="true">
            {yearLabels().map((y) => (
              <span key={y}>{y}</span>
            ))}
            <span>end</span>
          </div>
        </div>
        <Segmented
          ariaLabel="Bottom view"
          value={view}
          onChange={setView}
          options={[
            { value: "charts", label: "Charts" },
            { value: "table", label: "WEO table" },
          ]}
        />
      </div>
    </header>
  );
}
