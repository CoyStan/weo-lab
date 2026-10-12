"use client";

import { create } from "zustand";
import { CONSTRAINT_TEMPLATES, VARIABLES } from "./model/constraints";
import { baselineConfig, HORIZON, policyAt, simulate } from "./model/economy";
import { defaultAssumptions, getPreset } from "./model/presets";
import { generateRandomShocks } from "./model/shocks";
import type { Assumptions, Constraint, ConstraintVar, OneOffKind, Policy, ScenarioConfig, ShockKind, SimResult } from "./model/types";

export type FocusKey = "growth" | "infl" | "rate" | "debt" | "ob" | "ca" | "reserves" | "unemp" | "spread" | "cred" | "rer" | "oil";

export type CompareMode = "baseline" | "pinned";

export type Pinned = { label: string; config: ScenarioConfig; result: SimResult };

type LabState = {
  config: ScenarioConfig;
  result: SimResult;
  baseline: SimResult;
  /** Policy in force at the clock quarter (derived; kept in state so selectors stay referentially stable). */
  policyNow: Policy;
  clock: number;
  playing: boolean;
  speed: 1 | 2 | 4;
  focus: FocusKey | null;
  compare: CompareMode;
  pinned: Pinned | null;
  view: "charts" | "table";
  hydrated: boolean;
  /** Earlier configs for undo; the newest is last. */
  past: ScenarioConfig[];
  future: ScenarioConfig[];
  lastEdit: number;
  showFan: boolean;
  labels: "all" | "focus";
  /** Bumped to ask the 3D camera to fly home. */
  cameraHome: number;
  storyId: string | null;
  /** Visual design id (see themes/). */
  theme: string;

  setPreset: (id: string) => void;
  setAssumption: <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => void;
  resetAssumptions: () => void;
  decide: (changes: Partial<Policy>) => void;
  removeDecision: (quarter: number) => void;
  clearDecisions: () => void;
  addShock: (kind: ShockKind, quarter: number, magnitude: number) => void;
  updateShock: (id: string, patch: { quarter?: number; magnitude?: number }) => void;
  removeShock: (id: string) => void;
  setRandomShocks: (on: boolean) => void;
  reroll: () => void;
  freezeRandomShocks: () => void;
  addOneOff: (kind: OneOffKind, quarter: number, value: number) => void;
  removeOneOff: (id: string) => void;
  addConstraint: (variable: ConstraintVar) => void;
  updateConstraint: (id: string, patch: Partial<Constraint>) => void;
  removeConstraint: (id: string) => void;
  applyTemplate: (templateId: string) => void;
  clearConstraints: () => void;
  setClock: (t: number) => void;
  step: (delta: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  setFocus: (key: FocusKey | null) => void;
  pin: () => void;
  unpin: () => void;
  setCompare: (mode: CompareMode) => void;
  setView: (view: "charts" | "table") => void;
  loadConfig: (config: ScenarioConfig) => void;
  reset: () => void;
  markHydrated: () => void;
  undo: () => void;
  redo: () => void;
  setShowFan: (on: boolean) => void;
  setLabels: (mode: "all" | "focus") => void;
  homeCamera: () => void;
  loadStory: (id: string, config: ScenarioConfig) => void;
  setTheme: (id: string) => void;
};

const HISTORY_LIMIT = 60;
/** Edits closer together than this (a slider drag) collapse into one undo step. */
const COALESCE_MS = 700;

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

function policyFor(config: ScenarioConfig, clock: number): Policy {
  return policyAt(getPreset(config.presetId).defaultPolicy, config.decisions, Math.max(1, clock));
}

function withConfig(state: LabState, config: ScenarioConfig, clock: number = state.clock): Partial<LabState> {
  const presetChanged = config.presetId !== state.config.presetId;
  const now = Date.now();
  const coalesce = now - state.lastEdit < COALESCE_MS && state.past.length > 0;
  const past = coalesce ? state.past : [...state.past, state.config].slice(-HISTORY_LIMIT);
  return {
    past,
    future: [],
    lastEdit: now,
    config,
    result: simulate(config),
    baseline: presetChanged ? simulate(baselineConfig(config.presetId)) : state.baseline,
    policyNow: policyFor(config, clock),
    clock,
  };
}

function withClock(state: LabState, clock: number): Partial<LabState> {
  const next = Math.max(0, Math.min(HORIZON, Math.round(clock)));
  return { clock: next, policyNow: next === state.clock ? state.policyNow : policyFor(state.config, next) };
}

const initialConfig = baselineConfig("aurelia");

export const useLab = create<LabState>((set, get) => ({
  config: initialConfig,
  result: simulate(initialConfig),
  baseline: simulate(initialConfig),
  policyNow: policyFor(initialConfig, 0),
  clock: 0,
  playing: false,
  speed: 1,
  focus: null,
  compare: "baseline",
  pinned: null,
  view: "charts",
  hydrated: false,
  past: [],
  future: [],
  lastEdit: 0,
  showFan: false,
  labels: "all",
  cameraHome: 0,
  storyId: null,
  theme: "palari",

  setPreset: (id) =>
    set((s) => {
      const config: ScenarioConfig = { ...baselineConfig(id), constraints: s.config.constraints, randomShocks: s.config.randomShocks, seed: s.config.seed };
      return { ...withConfig(s, config, 0), playing: false, pinned: null, compare: "baseline", focus: null, storyId: null };
    }),

  setAssumption: (key, value) => set((s) => withConfig(s, { ...s.config, assumptions: { ...s.config.assumptions, [key]: value } })),

  resetAssumptions: () => set((s) => withConfig(s, { ...s.config, assumptions: defaultAssumptions(s.config.presetId) })),

  decide: (changes) =>
    set((s) => {
      const quarter = Math.max(1, s.clock);
      const existing = s.config.decisions.find((d) => d.quarter === quarter);
      const decisions = existing
        ? s.config.decisions.map((d) => (d.quarter === quarter ? { ...d, changes: { ...d.changes, ...changes } } : d))
        : [...s.config.decisions, { quarter, changes }];
      return withConfig(s, { ...s.config, decisions });
    }),

  removeDecision: (quarter) => set((s) => withConfig(s, { ...s.config, decisions: s.config.decisions.filter((d) => d.quarter !== quarter) })),

  clearDecisions: () => set((s) => withConfig(s, { ...s.config, decisions: [], oneOffs: [] })),

  addShock: (kind, quarter, magnitude) =>
    set((s) => withConfig(s, { ...s.config, shocks: [...s.config.shocks, { id: nextId("shock"), kind, quarter, magnitude, source: "scheduled" }] })),

  updateShock: (id, patch) => set((s) => withConfig(s, { ...s.config, shocks: s.config.shocks.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) })),

  removeShock: (id) => set((s) => withConfig(s, { ...s.config, shocks: s.config.shocks.filter((sh) => sh.id !== id) })),

  setRandomShocks: (on) => set((s) => withConfig(s, { ...s.config, randomShocks: on })),

  reroll: () => set((s) => withConfig(s, { ...s.config, randomShocks: true, seed: Math.floor(Math.random() * 1_000_000) + 1 })),

  freezeRandomShocks: () =>
    set((s) => {
      const drawn = generateRandomShocks(s.config.seed, HORIZON).map((sh) => ({ ...sh, id: nextId("shock"), source: "scheduled" as const }));
      return withConfig(s, { ...s.config, randomShocks: false, shocks: [...s.config.shocks, ...drawn] });
    }),

  addOneOff: (kind, quarter, value) => set((s) => withConfig(s, { ...s.config, oneOffs: [...s.config.oneOffs, { id: nextId("act"), kind, quarter, value }] })),

  removeOneOff: (id) => set((s) => withConfig(s, { ...s.config, oneOffs: s.config.oneOffs.filter((o) => o.id !== id) })),

  addConstraint: (variable) =>
    set((s) => {
      const spec = VARIABLES[variable];
      const c: Constraint = { id: nextId("c"), variable, op: spec.defaultOp, threshold: spec.defaultThreshold, fromQuarter: 1 };
      return withConfig(s, { ...s.config, constraints: [...s.config.constraints, c] });
    }),

  updateConstraint: (id, patch) => set((s) => withConfig(s, { ...s.config, constraints: s.config.constraints.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  removeConstraint: (id) => set((s) => withConfig(s, { ...s.config, constraints: s.config.constraints.filter((c) => c.id !== id) })),

  applyTemplate: (templateId) =>
    set((s) => {
      const template = CONSTRAINT_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return {};
      const added = template.constraints.map((c) => ({ ...c, id: nextId("c") }));
      return withConfig(s, { ...s.config, constraints: [...s.config.constraints, ...added] });
    }),

  clearConstraints: () => set((s) => withConfig(s, { ...s.config, constraints: [] })),

  setClock: (t) => set((s) => withClock(s, t)),

  step: (delta) =>
    set((s) => {
      const next = withClock(s, s.clock + delta);
      return { ...next, playing: (next.clock ?? s.clock) >= HORIZON ? false : s.playing };
    }),

  play: () => set((s) => ({ playing: true, ...(s.clock >= HORIZON ? withClock(s, 0) : {}) })),

  pause: () => set({ playing: false }),

  setSpeed: (speed) => set({ speed }),

  setFocus: (key) => set({ focus: key }),

  pin: () =>
    set((s) => ({
      pinned: { label: `Pinned ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, config: s.config, result: s.result },
      compare: "pinned",
    })),

  unpin: () => set({ pinned: null, compare: "baseline" }),

  setCompare: (mode) => set((s) => ({ compare: mode === "pinned" && !s.pinned ? "baseline" : mode })),

  setView: (view) => set({ view }),

  loadConfig: (config) => set((s) => ({ ...withConfig(s, config, 0), baseline: simulate(baselineConfig(config.presetId)), playing: false })),

  reset: () =>
    set((s) => {
      const config = baselineConfig(s.config.presetId);
      return { ...withConfig(s, config, 0), playing: false, pinned: null, compare: "baseline", focus: null, storyId: null };
    }),

  markHydrated: () => set({ hydrated: true, past: [], future: [] }),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      const baseline = prev.presetId !== s.config.presetId ? simulate(baselineConfig(prev.presetId)) : s.baseline;
      return { config: prev, result: simulate(prev), baseline, policyNow: policyFor(prev, s.clock), past: s.past.slice(0, -1), future: [s.config, ...s.future], lastEdit: 0 };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return {};
      const baseline = next.presetId !== s.config.presetId ? simulate(baselineConfig(next.presetId)) : s.baseline;
      return { config: next, result: simulate(next), baseline, policyNow: policyFor(next, s.clock), past: [...s.past, s.config], future: s.future.slice(1), lastEdit: 0 };
    }),

  setShowFan: (on) => set({ showFan: on }),

  setLabels: (mode) => set({ labels: mode }),

  homeCamera: () => set((s) => ({ cameraHome: s.cameraHome + 1, focus: null })),

  setTheme: (id) => set({ theme: id }),

  loadStory: (id, config) =>
    set((s) => ({ ...withConfig({ ...s, lastEdit: 0 }, config, 0), baseline: simulate(baselineConfig(config.presetId)), playing: false, pinned: null, compare: "baseline", focus: null, storyId: id })),
}));

/** Policy in force at the current clock quarter. */
export function selectPolicyNow(s: Pick<LabState, "policyNow">): Policy {
  return s.policyNow;
}

/** The comparison path: WEO baseline or the pinned scenario. */
export function selectReference(s: Pick<LabState, "baseline" | "pinned" | "compare">): SimResult {
  return s.compare === "pinned" && s.pinned ? s.pinned.result : s.baseline;
}

export function selectCurrent(s: Pick<LabState, "result" | "clock">) {
  return s.result.path[Math.min(s.clock, s.result.path.length - 1)];
}

export function selectReferenceAt(s: Pick<LabState, "baseline" | "pinned" | "compare" | "clock">) {
  const ref = selectReference(s);
  return ref.path[Math.min(s.clock, ref.path.length - 1)];
}

// ---- Persistence helpers -------------------------------------------------

const STORAGE_KEY = "palari.weo-lab.config.v1";

export function encodeConfig(config: ScenarioConfig): string {
  const json = JSON.stringify(config);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeConfig(encoded: string): ScenarioConfig | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ScenarioConfig>;
    return sanitizeConfig(parsed);
  } catch {
    return null;
  }
}

export function sanitizeConfig(parsed: Partial<ScenarioConfig>): ScenarioConfig | null {
  if (!parsed || typeof parsed !== "object") return null;
  const presetId = typeof parsed.presetId === "string" ? getPreset(parsed.presetId).id : "aurelia";
  const base = baselineConfig(presetId);
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const assumptions: Assumptions = { ...base.assumptions };
  if (parsed.assumptions && typeof parsed.assumptions === "object") {
    for (const key of Object.keys(base.assumptions) as (keyof Assumptions)[]) {
      const v = (parsed.assumptions as Record<string, unknown>)[key];
      if (key === "rerConvention") {
        if (v === "constant" || v === "model") assumptions.rerConvention = v;
      } else {
        assumptions[key] = num(v, base.assumptions[key] as number) as never;
      }
    }
  }
  return {
    presetId,
    assumptions,
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions.filter((d) => d && typeof d.quarter === "number" && d.changes && typeof d.changes === "object") : [],
    oneOffs: Array.isArray(parsed.oneOffs) ? parsed.oneOffs.filter((o) => o && typeof o.quarter === "number" && (o.kind === "restructure" || o.kind === "devalue")) : [],
    shocks: Array.isArray(parsed.shocks) ? parsed.shocks.filter((s) => s && typeof s.quarter === "number" && typeof s.kind === "string") : [],
    randomShocks: Boolean(parsed.randomShocks),
    seed: num(parsed.seed, 1),
    constraints: Array.isArray(parsed.constraints) ? parsed.constraints.filter((c) => c && typeof c.threshold === "number" && c.variable in VARIABLES) : [],
  };
}

export function saveConfig(config: ScenarioConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage can be unavailable (private mode, blocked); the lab works without it.
  }
}

export function loadSavedConfig(): ScenarioConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeConfig(JSON.parse(raw) as Partial<ScenarioConfig>) : null;
  } catch {
    return null;
  }
}

export function clearSavedConfig() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
