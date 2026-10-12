"use client";

import { sound } from "../audio";
import { useSettings } from "../settings";

/** Mute and settings, for the title screen and the game bar. */
export default function SoundToggle() {
  const muted = useSettings((s) => s.muted);
  const hydrated = useSettings((s) => s.hydrated);
  const setSettings = useSettings((s) => s.set);
  const setOpen = useSettings((s) => s.setOpen);
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        className="game-sound lab-btn lab-btn-ghost lab-btn-sm"
        onClick={() => {
          sound.unlock();
          setSettings({ muted: !muted });
          if (muted) window.setTimeout(() => sound.play("toggle"), 50);
        }}
        aria-pressed={hydrated ? !muted : undefined}
        aria-label={muted ? "Sound is off. Turn it on." : "Sound is on. Turn it off."}
        title={muted ? "Turn sound on" : "Mute"}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" />
          {muted ? <path d="M11 6l3.5 4M14.5 6L11 10" /> : <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" />}
        </svg>
      </button>
      <button type="button" className="game-sound lab-btn lab-btn-ghost lab-btn-sm" onClick={() => setOpen(true)} title="Settings" aria-label="Settings">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6" />
        </svg>
        <span className="max-sm:hidden">Settings</span>
      </button>
    </span>
  );
}
