"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { quarterLabel } from "../../model/economy";
import { getPreset } from "../../model/presets";
import { MISSIONS } from "../missions";
import { sound } from "../audio";
import { useGame } from "../store";
import SoundToggle from "./SoundToggle";
import { useTurn } from "../useTurn";
import Advisors from "./Advisors";
import Goals from "./Goals";
import Levers from "./Levers";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Play({ scene }: { scene: ReactNode }) {
  const { mission, clock, deciding, events, changed, statuses } = useTurn();
  const tense = mission.objectives.some((o) => !o.bonus && (statuses[o.id] === "at-risk" || statuses[o.id] === "failed"));
  useEffect(() => sound.setTense(tense), [tense]);
  const endQuarter = useGame((s) => s.endQuarter);
  const modal = useGame((s) => s.modal);
  const setScreen = useGame((s) => s.setScreen);
  const restart = useGame((s) => s.restart);
  const rewind = useGame((s) => s.rewind);
  const preset = getPreset(mission.presetId);
  const done = clock >= mission.quarters;
  const news = useMemo(() => events.filter((e) => e.quarter === clock && e.kind !== "decision"), [events, clock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("button, a, input, select, textarea, summary") || t.isContentEditable)) return;
      if (useGame.getState().modal) return;
      e.preventDefault();
      useGame.getState().endQuarter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="game-play">
      <header className="game-hud">
        <button type="button" className="game-logo" onClick={() => setScreen("title")} aria-label="Back to the title screen">
          <img src={`${base}/brand/palari-logo.svg`} alt="" width={68} height={28} />
        </button>
        <div className="min-w-0">
          <p className="game-eyebrow !mb-0">Mission {mission.number} of {MISSIONS.length} · {preset.name}</p>
          <h1 className="truncate font-display text-[1.15rem] font-semibold leading-tight">{mission.title}</h1>
        </div>
        <div className="game-progress" aria-label={`Quarter ${Math.min(clock + 1, mission.quarters)} of ${mission.quarters}`}>
          <div className="flex items-baseline justify-between gap-2 text-[0.68rem]">
            <span className="font-semibold">{done ? "Final quarter played" : `Deciding ${deciding}`}</span>
            <span className="text-[var(--lab-ink-2)] tabular-nums">turn {Math.min(clock + 1, mission.quarters)} of {mission.quarters}</span>
          </div>
          <div className="game-progress-track">
            {Array.from({ length: mission.quarters }, (_, i) => (
              <span key={i} className={i < clock ? "is-done" : i === clock ? "is-now" : ""} />
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <SoundToggle />
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={rewind} disabled={clock === 0} title="Go back one quarter and decide again">Rewind</button>
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={restart}>Restart</button>
          <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={() => setScreen("missions")}>Missions</button>
        </div>
      </header>

      <main id="main-content" className="game-grid">
        <aside className="game-col game-col-levers" aria-label="Your levers">
          <h2 className="game-col-title">Your levers</h2>
          {mission.number === 1 && clock < 2 ? (
            <p className="game-coach">
              {clock === 0 ? "Try moving the policy rate. The dashed line on each goal card shows where that choice leads; the faint one is where you started." : "Inflation reacts slowly. Judge your rate by the forecast at the end, not by this quarter."}
            </p>
          ) : null}
          <Levers />
          <Hint text={mission.hint} />
        </aside>

        <section className="game-stage" aria-label="Island">
          <div className="game-scene">
            {scene}
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
            <div className="game-end">
              {changed ? <span className="game-end-note">You changed policy this quarter.</span> : <span className="game-end-note">No changes: policy carries on as it is.</span>}
              <button type="button" className="game-end-btn" onClick={endQuarter} disabled={Boolean(modal) || done}>
                End {quarterLabel(clock + 1)}
                <kbd>Enter</kbd>
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
