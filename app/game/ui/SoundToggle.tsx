"use client";

import { useEffect, useState } from "react";
import { sound, type SoundMode } from "../audio";

const NEXT: Record<SoundMode, SoundMode> = { on: "effects", effects: "off", off: "on" };
const LABEL: Record<SoundMode, string> = { on: "Sound on", effects: "Effects only", off: "Sound off" };

/** Cycles sound on, effects only (no ambience), and off. Remembered across visits. */
export default function SoundToggle() {
  const [mode, setMode] = useState<SoundMode>("on");
  useEffect(() => {
    setMode(sound.mode);
    return sound.subscribe(setMode);
  }, []);
  return (
    <button
      type="button"
      className="game-sound lab-btn lab-btn-ghost lab-btn-sm"
      onClick={() => {
        const next = NEXT[mode];
        sound.unlock();
        sound.setMode(next);
        if (next !== "off") sound.play("toggle");
      }}
      title="Switch between sound on, effects only and off"
      aria-label={`${LABEL[mode]}. Click to change.`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" />
        {mode === "on" ? <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" /> : mode === "effects" ? <path d="M11 6.5a2 2 0 0 1 0 3" /> : <path d="M11 6l3.5 4M14.5 6L11 10" />}
      </svg>
      <span>{LABEL[mode]}</span>
    </button>
  );
}
