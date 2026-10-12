"use client";

import { useEffect, useRef, useState } from "react";
import { Segmented, Slider, Toggle } from "../../components/ui";
import { useLab } from "../../store";
import { THEMES } from "../../themes";
import { sound } from "../audio";
import { TRACKS, useSettings } from "../settings";
import { useGame } from "../store";
import { WEO } from "../data";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const DISCLAIMER =
  "WEO Scenario Lab is an independent educational game. It is not affiliated with, endorsed by, or connected to the International Monetary Fund (IMF) or any government. The economies, model and advisors are stylised; where real data appear they come from public sources, which are cited, and every result is illustrative. Nothing here is a forecast or policy advice.";

type Tab = "sound" | "display" | "game" | "about";

export default function SettingsPanel() {
  const open = useSettings((s) => s.open);
  const setOpen = useSettings((s) => s.setOpen);
  const [tab, setTab] = useState<Tab>("sound");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="game-modal-backdrop" role="presentation" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="game-card game-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="settings-title" className="game-shock-title !mb-0">Settings</h2>
          <button ref={closeRef} type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
        <Segmented<Tab>
          ariaLabel="Settings section"
          size="md"
          value={tab}
          onChange={setTab}
          options={[
            { value: "sound", label: "Sound" },
            { value: "display", label: "Display" },
            { value: "game", label: "Game" },
            { value: "about", label: "About" },
          ]}
        />
        <div className="game-settings-body">{tab === "sound" ? <SoundSettings /> : tab === "display" ? <DisplaySettings /> : tab === "game" ? <GameSettings /> : <About />}</div>
      </div>
    </div>
  );
}

function SoundSettings() {
  const s = useSettings();
  return (
    <div className="flex flex-col gap-3">
      <Toggle label="Sound" checked={!s.muted} onChange={(on) => s.set({ muted: !on })} hint="Turns all music and effects on or off." />
      <div>
        <h3 className="game-section">Music</h3>
        <ul className="game-tracks" role="radiogroup" aria-label="Music">
          {TRACKS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={s.track === t.id}
                className={`game-track ${s.track === t.id ? "is-on" : ""}`}
                onClick={() => {
                  if (t.id === "none") s.set({ track: "none" });
                  else sound.preview(t.id);
                }}
              >
                <span className="game-track-dot" aria-hidden="true" />
                <span className="min-w-0">
                  <strong>{t.title}</strong>
                  <span>{t.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Slider label="Music volume" value={Math.round(s.musicVolume * 100)} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => s.set({ musicVolume: v / 100 })} />
      <Slider
        label="Effects volume"
        value={Math.round(s.effectsVolume * 100)}
        min={0}
        max={100}
        step={5}
        format={(v) => `${v}%`}
        onChange={(v) => {
          s.set({ effectsVolume: v / 100 });
          sound.play("tick");
        }}
      />
      <Toggle label="Waves under the music" checked={s.sea} onChange={(v) => s.set({ sea: v })} hint="A quiet sea in the background of any track." />
    </div>
  );
}

function DisplaySettings() {
  const s = useSettings();
  const themeId = useLab((x) => x.theme);
  const setTheme = useLab((x) => x.setTheme);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="game-section">Design</h3>
        <div className="game-themes">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`game-theme ${t.id === themeId ? "is-on" : ""}`}
              aria-pressed={t.id === themeId}
              onClick={() => {
                setTheme(t.id);
                try {
                  window.localStorage.setItem("palari.weo-lab.theme", t.id);
                } catch {
                  // ignore
                }
              }}
            >
              <span aria-hidden="true" className="game-theme-swatch">
                <span style={{ background: t.vars["--lab-bg"] ?? "#f7f5f2" }} />
                <span style={{ background: t.vars["--lab-scenario"] ?? "#4a3aa7" }} />
                <span style={{ background: t.scene.grass ?? "#b7d19a" }} />
              </span>
              <strong>{t.name}</strong>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="game-section">Island banners during missions</h3>
        <Segmented
          ariaLabel="Island banners"
          value={s.labels}
          onChange={(v) => {
            s.set({ labels: v });
            applyLabels(v);
          }}
          options={[
            { value: "goals", label: "Goals only" },
            { value: "all", label: "All" },
            { value: "hover", label: "On hover" },
          ]}
        />
      </div>
      <Toggle label="Reduce motion" checked={s.reducedMotion} onChange={(v) => s.set({ reducedMotion: v })} hint="Stops the camera drifting and turns off animations. Your system setting is always respected." />
    </div>
  );
}

/** Island banner mode, applied to the running mission straight away. */
export function applyLabels(mode: "goals" | "all" | "hover") {
  if (mode === "all") useLab.setState({ labels: "all" });
  else useLab.setState({ labels: "focus", spotlight: mode === "hover" ? [] : useGame.getState().spotlight });
}

function GameSettings() {
  const s = useSettings();
  const [confirm, setConfirm] = useState(false);
  const resetProgress = useGame((x) => x.resetProgress);
  return (
    <div className="flex flex-col gap-3">
      <Toggle label="Tips in the first missions" checked={s.tips} onChange={(v) => s.set({ tips: v })} hint="Short coaching notes on the levers panel." />
      <div className="lab-field">
        <span className="block text-[0.78rem] font-medium">Progress</span>
        <span className="game-hint">Stars and unlocked missions are stored in this browser only.</span>
        <div className="mt-2">
          {confirm ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="text-[0.74rem]">Erase all stars?</span>
              <button
                type="button"
                className="lab-btn lab-btn-danger lab-btn-xs"
                onClick={() => {
                  resetProgress();
                  setConfirm(false);
                }}
              >
                Erase progress
              </button>
              <button type="button" className="lab-btn lab-btn-ghost lab-btn-xs" onClick={() => setConfirm(false)}>
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" className="lab-btn lab-btn-soft lab-btn-xs" onClick={() => setConfirm(true)}>
              Reset progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="flex flex-col gap-3 text-[0.78rem] leading-relaxed">
      <p className="game-disclaimer">{DISCLAIMER}</p>
      <div>
        <h3 className="game-section">How it works</h3>
        <p>A small quarterly open-economy model: an IS curve, a Phillips curve with credibility-weighted expectations, a policy rule, an exchange-rate and reserves block, debt dynamics and a sovereign spread. Parameters are illustrative calibrations, not estimates for any real country.</p>
      </div>
      <div>
        <h3 className="game-section">Credits</h3>
        <ul className="flex flex-col gap-1">
          <li>Music: public-domain recordings from Wikimedia Commons of Satie and Debussy (performers Robin Alciatore via Musopen, La Pianista, Laurens Goedhart, Michael Laucke). <a className="underline" href={`${base}/music/CREDITS.md`} target="_blank" rel="noreferrer">Full credits</a>.</li>
          <li>Interface sounds: Interface Sounds by Kenney, CC0.</li>
          <li>Country data: IMF, {WEO.vintage}, via the IMF DataMapper API (retrieved {WEO.fetched}). Policy rates, reserves and spreads for real countries are model estimates.</li>
          <li>Advisor portraits: the Palari art library.</li>
        </ul>
      </div>
      <p>
        Source code: <a className="underline" href="https://github.com/CoyStan/weo-lab" target="_blank" rel="noreferrer">github.com/CoyStan/weo-lab</a>
      </p>
    </div>
  );
}
