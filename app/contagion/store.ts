"use client";

import { create } from "zustand";
import { sound } from "../game/audio";
import { WEO } from "../game/data";
import { act, createWorld, crisisCount, outcome, step, type Action, type Outcome, type World } from "./engine";

type Phase = "pick" | "play" | "over";

type ContagionState = {
  phase: Phase;
  /** The origin being considered (pick) or played. */
  origin: string;
  seed: number;
  world: World | null;
  /** The world at the start of this quarter, so the quarter's actions can be undone. */
  quarterStart: World | null;
  selected: string | null;
  result: Outcome | null;
  /** Countries that changed status in the last quarter, for the map's flash. */
  flash: Record<string, "crisis" | "recovery">;
  /** Hints from the deputy left this game. */
  asksLeft: number;

  pick: (iso: string) => void;
  begin: () => void;
  select: (iso: string | null) => void;
  perform: (action: Action) => void;
  undo: () => void;
  endQuarter: () => void;
  again: () => void;
  chooseAgain: () => void;
  spendAsk: () => void;
};

/** The deputy's advice is good; using it every turn would play the game for you. */
const ASKS = 4;

const newSeed = () => Math.floor(Math.random() * 1e9);

export const useContagion = create<ContagionState>((set, get) => ({
  phase: "pick",
  origin: "GRC",
  seed: newSeed(),
  world: null,
  quarterStart: null,
  selected: null,
  result: null,
  flash: {},
  asksLeft: ASKS,

  spendAsk: () => set({ asksLeft: Math.max(0, get().asksLeft - 1) }),

  pick: (iso) => set({ origin: iso, selected: iso }),

  begin: () => {
    const { origin, seed } = get();
    const world = createWorld(WEO, origin, seed);
    sound.play("alert");
    sound.stinger("shock");
    set({ phase: "play", world, quarterStart: world, selected: origin, result: null, flash: { [origin]: "crisis" }, asksLeft: ASKS });
  },

  select: (iso) => set({ selected: iso }),

  perform: (action) => {
    const w = get().world;
    if (!w) return;
    const next = act(w, action);
    if (next === w) return;
    sound.play("choose");
    set({ world: next });
  },

  undo: () => {
    const start = get().quarterStart;
    if (!start) return;
    sound.play("back");
    set({ world: start });
  },

  endQuarter: () => {
    const w = get().world;
    if (!w) return;
    const next = step(w);
    const flash: Record<string, "crisis" | "recovery"> = {};
    for (const c of Object.values(next.countries)) {
      const was = w.countries[c.iso].status;
      if (was !== "crisis" && c.status === "crisis") flash[c.iso] = "crisis";
      if (was === "crisis" && c.status !== "crisis") flash[c.iso] = "recovery";
    }
    const result = outcome(next);
    const fresh = Object.values(flash).filter((f) => f === "crisis").length;
    if (result.kind !== "playing") {
      if (result.kind === "won") {
        sound.stinger("win");
        for (let i = 0; i < result.stars; i++) window.setTimeout(() => sound.stinger("star"), 700 + i * 180);
      } else sound.stinger("lose");
      set({ world: next, quarterStart: next, phase: "over", result, flash });
      return;
    }
    if (next.news.some((n) => n.quarter === next.quarter && n.kind === "event")) sound.stinger("shock");
    if (fresh) sound.play("alert", Math.min(1, 0.6 + 0.1 * fresh));
    else if (Object.keys(flash).length) sound.play("confirm");
    else sound.play("pluck");
    sound.setTense(crisisCount(next) >= 4 || next.panic > 55);
    set({ world: next, quarterStart: next, flash });
  },

  again: () => {
    set({ seed: newSeed() });
    get().begin();
  },

  chooseAgain: () => {
    sound.setTense(false);
    set({ phase: "pick", world: null, quarterStart: null, result: null, flash: {}, seed: newSeed() });
  },
}));
