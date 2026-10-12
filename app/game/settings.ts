"use client";

import { create } from "zustand";

export type TrackId = "gymnopedie1" | "gnossienne1" | "clairdelune" | "gymnopedie2-guitar" | "sea" | "none";

export const TRACKS: { id: TrackId; title: string; detail: string }[] = [
  { id: "gymnopedie1", title: "Gymnopédie No. 1", detail: "Erik Satie · piano, Robin Alciatore" },
  { id: "gnossienne1", title: "Gnossienne No. 1", detail: "Erik Satie · piano, La Pianista" },
  { id: "clairdelune", title: "Clair de lune", detail: "Claude Debussy · piano, Laurens Goedhart" },
  { id: "gymnopedie2-guitar", title: "Gymnopédie No. 2", detail: "Erik Satie · guitar, Michael Laucke" },
  { id: "sea", title: "Sea and music box", detail: "Generated in your browser; turns tense when a goal is at risk" },
  { id: "none", title: "No music", detail: "Effects only" },
];

export type Settings = {
  muted: boolean;
  track: TrackId;
  /** 0..1 */
  musicVolume: number;
  /** 0..1 */
  effectsVolume: number;
  /** Waves under the music. */
  sea: boolean;
  /** Island banners during missions: the goals' districts, all of them, or on hover. */
  labels: "goals" | "all" | "hover";
  reducedMotion: boolean;
  /** Coaching notes in the first missions. */
  tips: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  track: "gymnopedie1",
  musicVolume: 0.55,
  effectsVolume: 0.7,
  sea: true,
  labels: "goals",
  reducedMotion: false,
  tips: true,
};

const KEY = "weo-lab.settings.v1";

type SettingsState = Settings & {
  hydrated: boolean;
  open: boolean;
  load: () => void;
  set: (patch: Partial<Settings>) => void;
  setOpen: (open: boolean) => void;
};

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  open: false,
  load: () => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        const next: Partial<Settings> = {};
        for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
          if (k in parsed && typeof parsed[k] === typeof DEFAULT_SETTINGS[k]) (next as Record<string, unknown>)[k] = parsed[k];
        }
        if (next.track && !TRACKS.some((t) => t.id === next.track)) delete next.track;
        set(next);
      } else {
        // Earlier versions stored a three-way sound switch.
        const legacy = window.localStorage.getItem("weo-lab.sound");
        if (legacy === "off") set({ muted: true });
        if (legacy === "effects") set({ track: "none", sea: false });
      }
    } catch {
      // Storage blocked or unreadable: defaults.
    }
    set({ hydrated: true });
  },
  set: (patch) => {
    set(patch);
    const s = get();
    const toSave: Settings = { muted: s.muted, track: s.track, musicVolume: s.musicVolume, effectsVolume: s.effectsVolume, sea: s.sea, labels: s.labels, reducedMotion: s.reducedMotion, tips: s.tips };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  },
  setOpen: (open) => set({ open }),
}));
