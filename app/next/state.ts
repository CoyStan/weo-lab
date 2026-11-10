"use client";

import { create } from "zustand";
import { useSyncExternalStore } from "react";
import type { Call } from "./logic";

/** Which play screen to show: the classic dashboard, or the three-beat "next" screen (?ui=next). */
const readMode = (): "classic" | "next" => {
  if (typeof window === "undefined") return "classic";
  return new URLSearchParams(window.location.search).get("ui") === "next" ? "next" : "classic";
};
const subscribeMode = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
export function useUiMode(): "classic" | "next" {
  return useSyncExternalStore(subscribeMode, readMode, () => "classic");
}

/** Switch screens in place: both read the same game, so nothing is lost. */
export function setUiMode(mode: "classic" | "next") {
  const url = new URL(window.location.href);
  if (mode === "next") url.searchParams.set("ui", "next");
  else url.searchParams.delete("ui");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export type CallResult = { id: string; picked: string; right: boolean };

type NextState = {
  /** The mission these calls belong to; a new mission clears them. */
  missionId: string | null;
  /** Questions already asked this mission (by id), with how they went. */
  calls: CallResult[];
  /** A question on screen, and what happens once it is answered. */
  asking: { call: Call; then: "end-quarter" | "news" } | null;
  /** The cause-and-effect map, opened from "Why?". */
  why: boolean;
  setWhy: (open: boolean) => void;
  begin: (missionId: string) => void;
  ask: (call: Call, then: "end-quarter" | "news") => void;
  answer: (picked: string) => void;
  dismiss: () => void;
};

export const useNext = create<NextState>((set, get) => ({
  missionId: null,
  calls: [],
  asking: null,
  why: false,
  setWhy: (open) => set({ why: open }),
  begin: (missionId) => {
    if (get().missionId !== missionId) set({ missionId, calls: [], asking: null, why: false });
  },
  ask: (call, then) => set({ asking: { call, then } }),
  answer: (picked) => {
    const a = get().asking;
    if (!a || get().calls.some((c) => c.id === a.call.id)) return;
    set({ calls: [...get().calls, { id: a.call.id, picked, right: picked === a.call.answer }] });
  },
  dismiss: () => set({ asking: null }),
}));
