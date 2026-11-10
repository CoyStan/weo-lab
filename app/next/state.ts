"use client";

import { create } from "zustand";
import { useSyncExternalStore } from "react";

/** Which play screen to show: the beat-by-beat screen (the default), or the classic dashboard (?ui=classic). */
const readMode = (): "classic" | "next" => {
  if (typeof window === "undefined") return "next";
  return new URLSearchParams(window.location.search).get("ui") === "classic" ? "classic" : "next";
};
const subscribeMode = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
export function useUiMode(): "classic" | "next" {
  return useSyncExternalStore(subscribeMode, readMode, () => "next");
}

/** Switch screens in place: both read the same game, so nothing is lost. */
export function setUiMode(mode: "classic" | "next") {
  const url = new URL(window.location.href);
  if (mode === "classic") url.searchParams.set("ui", "classic");
  else url.searchParams.delete("ui");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export type CallResult = { id: string; picked: string; right: boolean };

type NextState = {
  /** The mission these calls belong to; a new mission clears them. */
  missionId: string | null;
  /** Predictions made this mission (by question id), with how they went. */
  calls: CallResult[];
  /** The cause-and-effect map, opened from "Why?". */
  why: boolean;
  setWhy: (open: boolean) => void;
  /** A one-off line for the decision screen (after a rewind, say). */
  notice: string | null;
  setNotice: (text: string | null) => void;
  begin: (missionId: string) => void;
  answer: (id: string, picked: string, right: boolean) => void;
};

export const useNext = create<NextState>((set, get) => ({
  missionId: null,
  calls: [],
  why: false,
  setWhy: (open) => set({ why: open }),
  notice: null,
  setNotice: (text) => set({ notice: text }),
  begin: (missionId) => {
    if (get().missionId !== missionId) set({ missionId, calls: [], why: false, notice: null });
  },
  answer: (id, picked, right) => {
    if (get().calls.some((c) => c.id === id)) return;
    set({ calls: [...get().calls, { id, picked, right }] });
  },
}));
