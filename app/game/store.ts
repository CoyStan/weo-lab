"use client";

import { create } from "zustand";
import { simulate } from "../model/economy";
import type { Policy, QuarterState, ScenarioConfig, ScheduledShock, SimEvent } from "../model/types";
import { useLab } from "../store";
import { advise, type Advice } from "./advisors";
import { sound } from "./audio";
import { useSettings } from "./settings";
import type { FocusKey } from "../store";
import { headline } from "./explain";
import { attention, eventful } from "./pacing";
import type { DecompMetric } from "./decompose";
import { SHOCKS } from "../model/shocks";
import { quarterLabel } from "../model/economy";
import { buildEpisode, EPISODES, TODAY, todayMission } from "./economies";
import { WEO } from "./data";
import { getMission, registerMission, isSurprise, knownConfig, missionOutcome, MISSIONS, objectiveStatus, policyForTurn, type LeverId, type Mission, type ObjectiveStatus, type Outcome } from "./missions";
import { ledger, type Entry } from "./politics";
import type { InstitutionId } from "../model/types";

export type Screen = "title" | "missions" | "briefing" | "play" | "sandbox" | "contagion";

export type Recap = {
  quarter: number;
  prev: QuarterState;
  now: QuarterState;
  events: SimEvent[];
  headline: { paper: string; text: string };
  advice: Advice[];
  statuses: { id: string; before: ObjectiveStatus; after: ObjectiveStatus }[];
  /** Political capital earned or lost in the quarter, and balances after it. */
  points: { entries: Entry[]; votes: number; trust: number };
  election: { votes: number; won: boolean } | null;
  crisis: boolean;
  /** Set when the recap ends a fast-forward: the quiet quarters it skipped and why it stopped. */
  skipped?: { label: string; text: string }[];
  stopReasons?: string[];
  /** The clock the fast-forward started from. */
  from?: number;
};

/** A fast-forward through quiet quarters. */
export type Run = {
  from: number;
  lines: { label: string; text: string }[];
  startStatuses: Record<string, ObjectiveStatus>;
  startAttention: string[];
  last: Recap | null;
};

export type Modal =
  | { kind: "recap"; recap: Recap }
  | { kind: "shock"; shocks: ScheduledShock[] }
  | { kind: "debrief"; outcome: Outcome }
  | null;

/** The lever or reform the pointer is resting on; lever nudges live in nudges.ts. */
export type Probe = LeverId | `inst:${InstitutionId}` | null;

type Progress = { stars: Record<string, number> };

type GameState = {
  screen: Screen;
  missionId: string | null;
  /** Config at the start of each turn so far; index = clock at that turn. */
  turns: ScenarioConfig[];
  modal: Modal;
  probe: Probe;
  progress: Progress;
  /** Shock ids already announced to the player. */
  announced: string[];
  /** Free play opened from a mission keeps that scenario instead of restoring the saved one. */
  sandboxKeep: boolean;
  /** Island districts tied to the current mission's goals. */
  spotlight: FocusKey[];
  /** The macro framework overlay: every sector and channel at once. */
  framework: boolean;
  /** Opens or closes the framework; a metric jumps the decomposition to it. */
  setFramework: (open: boolean, metric?: DecompMetric) => void;
  frameworkMetric: DecompMetric;
  setFrameworkMetric: (metric: DecompMetric) => void;
  /** A fast-forward in progress. */
  run: Run | null;
  /** Play quarters one after another until something calls for a decision. */
  skipAhead: () => void;
  stopRun: () => void;

  setScreen: (screen: Screen) => void;
  openSandbox: (keepScenario: boolean) => void;
  loadProgress: () => void;
  startMission: (id: string) => void;
  startEpisode: (id: string) => void;
  startToday: (iso: string) => void;
  beginPlay: () => void;
  decide: (changes: Partial<Policy>) => void;
  resetTurn: () => void;
  endQuarter: () => void;
  closeModal: () => void;
  rewind: () => void;
  restart: () => void;
  setProbe: (probe: Probe) => void;
  resetProgress: () => void;
  adopt: (id: InstitutionId) => void;
  unadopt: (id: InstitutionId) => void;
  /** Keep the best result for a mode outside the missions (contagion origins). */
  recordStars: (id: string, stars: number) => void;
};

const PROGRESS_KEY = "weo-lab.campaign.v1";

function saveProgress(progress: Progress) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage may be blocked; progress then lasts for the session.
  }
}

export function missionUnlocked(m: Mission, progress: Progress): boolean {
  if (m.number === 1) return true;
  const prev = MISSIONS.find((x) => x.number === m.number - 1);
  return Boolean(prev && (progress.stars[prev.id] ?? 0) > 0);
}

/** Staff forecast with what is known before deciding for clock + 1. */
export function forecastFor(config: ScenarioConfig, clock: number): QuarterState[] {
  return simulate(knownConfig(config, clock)).path;
}

/** Surprise shocks that break when deciding for the coming quarter, plus announced ones at the start. */
function newsFor(config: ScenarioConfig, clock: number, announced: string[]): ScheduledShock[] {
  return config.shocks.filter((s) => !announced.includes(s.id) && (isSurprise(s) ? s.quarter === clock + 1 : clock === 0 && s.quarter <= 1));
}


/** Each turn the run plays one quarter, slowly enough to watch the island change. */
let runTimer: number | undefined;
/** A fast-forward stops after this many quiet quarters, to check in. */
const RUN_CAP = 8;

type Get = () => GameState;
type Set = (partial: Partial<GameState>) => void;

/** Goal statuses and what needs attention, for the quarter about to be decided. */
function lookAhead(mission: Mission) {
  const lab = useLab.getState();
  const forecast = forecastFor(lab.config, lab.clock);
  const statuses: Record<string, ObjectiveStatus> = {};
  for (const o of mission.objectives) statuses[o.id] = objectiveStatus(o, mission, lab.result.path, forecast, lab.clock);
  const books = ledger(mission.politics, lab.config, lab.result.path, lab.result.events, lab.clock);
  const list = attention({ mission, config: lab.config, clock: lab.clock, statuses, forecast, actual: lab.result.path, policy: policyForTurn(lab.config, lab.clock), votes: books.votes });
  return { statuses, attention: list };
}

function scheduleTick(get: Get, set: Set, delay?: number) {
  window.clearTimeout(runTimer);
  const pace = delay ?? (useSettings.getState().reducedMotion ? 400 : 1300);
  runTimer = window.setTimeout(() => runTick(get, set), pace);
}

function runTick(get: Get, set: Set) {
  const run = get().run;
  const mission = getMission(get().missionId ?? "");
  if (!run || !mission || get().modal) {
    set({ run: null });
    return;
  }
  const played = playQuarter(get, set, true);
  if (!played) {
    set({ run: null });
    return;
  }
  if (played.kind === "over") {
    set({ run: null });
    return;
  }
  const recap = played.recap;
  const reasons = eventful(recap, mission);
  const lab = useLab.getState();
  const news = newsFor(lab.config, lab.clock, get().announced);
  for (const s of news) reasons.push(`News: ${SHOCKS[s.kind].name.toLowerCase()}`);
  const fresh = lookAhead(mission).attention.filter((a) => !run.startAttention.includes(a.key));
  for (const a of fresh) reasons.push(a.text);
  const quarters = recap.quarter - run.from;
  if (!reasons.length && quarters >= RUN_CAP) reasons.push(`${quarters} quiet quarters in a row: time to check in`);
  if (reasons.length || lab.clock >= mission.quarters) {
    finishRun(get, set, recap, reasons);
    return;
  }
  set({ run: { ...run, lines: [...run.lines, { label: quarterLabel(recap.quarter), text: recap.headline.text }], last: recap } });
  scheduleTick(get, set);
}

/** End a fast-forward on one recap that covers every quarter it played. */
function finishRun(get: Get, set: Set, last: Recap, reasons: string[]) {
  const run = get().run;
  window.clearTimeout(runTimer);
  if (!run) return;
  const lab = useLab.getState();
  const mission = getMission(get().missionId ?? "")!;
  const books = ledger(mission.politics, lab.config, lab.result.path, lab.result.events, last.quarter);
  const merged: Recap = {
    ...last,
    prev: lab.result.path[run.from],
    statuses: last.statuses.map((s) => ({ ...s, before: run.startStatuses[s.id] ?? s.before })),
    points: { ...last.points, entries: books.entries.filter((e) => e.quarter > run.from && e.quarter <= last.quarter && e.kind === "earned") },
    skipped: run.lines.filter((l) => l.label !== quarterLabel(last.quarter)),
    stopReasons: reasons,
    from: run.from,
  };
  sound.play("open");
  set({ run: null, modal: { kind: "recap", recap: merged } });
}

/**
 * Play the coming quarter: move the clock, score it, keep the turn history and
 * handle the end of the mission. Returns the recap, or "over" when the mission ended.
 */
function playQuarter(get: Get, set: Set, quiet: boolean): { kind: "recap"; recap: Recap } | { kind: "over" } | null {
  const mission = getMission(get().missionId ?? "");
  if (!mission) return null;
  const lab = useLab.getState();
  const before = lab.clock;
  if (before >= mission.quarters) return null;
  sound.play(quiet ? "tick" : "confirm");
  const config = lab.config;
  const forecastBefore = forecastFor(config, before);
  const after = before + 1;
  lab.setClock(after);

  const result = useLab.getState().result;
  const forecastAfter = forecastFor(config, after);
  const outcome = missionOutcome(mission, result, forecastAfter, after, config);
  const books = ledger(mission.politics, config, result.path, result.events, after);
  const election = books.elections.find((e) => e.quarter === after) ?? null;
  const crisis = mission.politics.trustCrisis !== false && books.crisisAt === after && !config.shocks.some((s) => s.id === "surprise-confidence");
  const prev = result.path[before];
  const now = result.path[after];
  const events = result.events.filter((e) => e.quarter === after);
  const recap: Recap = {
    quarter: after,
    prev,
    now,
    events,
    headline: headline(config.presetId, prev, now, events),
    advice: advise({ mission, now, forecast: forecastAfter, policy: policyForTurn(config, after) }),
    statuses: mission.objectives.map((o) => ({ id: o.id, before: objectiveStatus(o, mission, result.path, forecastBefore, before), after: objectiveStatus(o, mission, result.path, forecastAfter, after) })),
    points: { entries: books.entries.filter((e) => e.quarter === after && e.kind === "earned"), votes: books.votes, trust: books.trust },
    election: election ? { votes: election.votes, won: election.won } : null,
    crisis,
  };

  const turns = [...get().turns, config];
  if (outcome.kind !== "playing") {
    if (outcome.kind === "won") {
      const progress = { stars: { ...get().progress.stars, [mission.id]: Math.max(outcome.stars, get().progress.stars[mission.id] ?? 0) } };
      saveProgress(progress);
      set({ progress });
    }
    set({ turns, run: null, modal: { kind: "debrief", outcome } });
    return { kind: "over" };
  }
  // Trust ran out: markets turn on the country next quarter.
  if (crisis && after < mission.quarters) {
    const shocked = { ...config, shocks: [...config.shocks, { id: "surprise-confidence", kind: "downgrade" as const, quarter: after + 1, magnitude: 1.3, source: "scheduled" as const }] };
    useLab.getState().replaceConfig(shocked);
    turns[turns.length - 1] = shocked;
  }
  set({ turns });
  return { kind: "recap", recap };
}

export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  missionId: null,
  turns: [],
  modal: null,
  probe: null,
  progress: { stars: {} },
  announced: [],
  sandboxKeep: false,
  spotlight: [],
  framework: false,
  run: null,

  setFramework: (open, metric) => {
    if (open !== get().framework) sound.play(open ? "open" : "back");
    set({ framework: open, ...(metric ? { frameworkMetric: metric } : {}) });
  },
  frameworkMetric: "infl",
  setFrameworkMetric: (metric) => set({ frameworkMetric: metric }),

  recordStars: (id, stars) => {
    const prev = get().progress.stars[id] ?? 0;
    if (stars <= prev) return;
    const progress = { stars: { ...get().progress.stars, [id]: stars } };
    saveProgress(progress);
    set({ progress });
  },

  setScreen: (screen) => {
    if (screen === "sandbox") {
      useLab.setState({ labels: "all", spotlight: [] });
      sound.stopAmbient();
    }
    window.clearTimeout(runTimer);
    set({ screen, modal: null, probe: null, sandboxKeep: false, framework: false, run: null });
  },

  openSandbox: (keepScenario) => {
    useLab.setState({ labels: "all", spotlight: [] });
    sound.stopAmbient();
    set({ screen: "sandbox", modal: null, probe: null, sandboxKeep: keepScenario });
  },

  loadProgress: () => {
    try {
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Progress>;
        if (parsed && typeof parsed.stars === "object" && parsed.stars) set({ progress: { stars: parsed.stars } });
      }
    } catch {
      // ignore unreadable progress
    }
  },

  startMission: (id) => {
    const mission = getMission(id);
    if (!mission) return;
    useLab.getState().loadConfig(mission.setup());
    const watched = new Set<string>(mission.objectives.map((o) => o.metric));
    if (mission.unlocks.includes("rate") || mission.unlocks.includes("rule")) watched.add("rate");
    const spotlight: FocusKey[] = (["infl", "growth", "debt", "reserves", "unemp", "cred", "rate", "ca"] as const).filter((k) => watched.has(k));
    const mode = useSettings.getState().labels;
    useLab.setState({ clock: 0, playing: false, focus: null, storyId: null, past: [], future: [], labels: mode === "all" ? "all" : "focus", spotlight: mode === "hover" ? [] : spotlight });
    set({ screen: "briefing", missionId: id, turns: [], modal: null, probe: null, announced: [], spotlight, framework: false, run: null });
  },

  startEpisode: (id) => {
    const ep = EPISODES.find((e) => e.id === id);
    if (!ep) return;
    const { mission } = buildEpisode(WEO, ep);
    registerMission(mission);
    get().startMission(mission.id);
  },

  startToday: (iso) => {
    const spec = TODAY.find((c) => c.iso === iso);
    if (!spec) return;
    const mission = todayMission(WEO, spec, Math.floor(Math.random() * 1_000_000) + 1);
    registerMission(mission);
    get().startMission(mission.id);
  },

  beginPlay: () => {
    sound.startAmbient();
    const lab = useLab.getState();
    const news = newsFor(lab.config, lab.clock, get().announced);
    set({ screen: "play", turns: [lab.config], modal: news.length ? { kind: "shock", shocks: news } : null, announced: [...get().announced, ...news.map((s) => s.id)] });
  },

  decide: (changes) => {
    if (get().run) get().stopRun();
    sound.play("tick");
    const lab = useLab.getState();
    lab.decideAt(lab.clock + 1, changes);
  },

  resetTurn: () => {
    const start = get().turns[get().turns.length - 1];
    if (!start) return;
    const lab = useLab.getState();
    useLab.setState({ config: start, result: simulate(start), policyNow: policyForTurn(start, lab.clock) });
  },

  endQuarter: () => {
    if (get().run) return;
    const played = playQuarter(get, set, false);
    if (played?.kind === "recap") set({ modal: { kind: "recap", recap: played.recap } });
  },

  skipAhead: () => {
    const { missionId, modal, run } = get();
    const mission = missionId ? getMission(missionId) : undefined;
    const lab = useLab.getState();
    if (!mission || modal || run || lab.clock >= mission.quarters) return;
    sound.play("confirm");
    const look = lookAhead(mission);
    set({ run: { from: lab.clock, lines: [], startStatuses: look.statuses, startAttention: look.attention.map((a) => a.key), last: null }, framework: false });
    scheduleTick(get, set, 250);
  },

  stopRun: () => {
    const run = get().run;
    if (!run) return;
    window.clearTimeout(runTimer);
    if (!run.last) {
      set({ run: null });
      return;
    }
    // Show what the skipped quarters did, ending on the last one played.
    finishRun(get, set, run.last, ["You stopped the clock"]);
  },

  closeModal: () => {
    const { modal, announced } = get();
    if (modal?.kind === "recap") {
      const lab = useLab.getState();
      const news = newsFor(lab.config, lab.clock, announced);
      if (news.length) {
        set({ modal: { kind: "shock", shocks: news }, announced: [...announced, ...news.map((s) => s.id)] });
        return;
      }
    }
    set({ modal: null });
  },

  rewind: () => {
    if (get().run) return;
    const turns = get().turns;
    const lab = useLab.getState();
    if (lab.clock === 0 || turns.length < 2) return;
    sound.play("back");
    // turns[clock] is the config that was in force when the last quarter ended; the turn before starts from turns[clock - 1]'s successor.
    const config = turns[lab.clock];
    const clock = lab.clock - 1;
    useLab.setState({ config, result: simulate(config), clock, policyNow: policyForTurn(config, clock), playing: false });
    set({ turns: turns.slice(0, clock + 1), modal: null });
  },

  restart: () => {
    const id = get().missionId;
    if (id) get().startMission(id);
  },

  setProbe: (probe) => set({ probe }),

  adopt: (id) => {
    const lab = useLab.getState();
    const quarter = lab.clock + 1;
    if ((lab.config.institutions ?? []).some((a) => a.id === id)) return;
    sound.play("choose");
    lab.replaceConfig({ ...lab.config, institutions: [...(lab.config.institutions ?? []), { id, quarter }] });
  },

  unadopt: (id) => {
    const lab = useLab.getState();
    const quarter = lab.clock + 1;
    sound.play("back");
    lab.replaceConfig({ ...lab.config, institutions: (lab.config.institutions ?? []).filter((a) => !(a.id === id && a.quarter === quarter)) });
  },

  resetProgress: () => {
    saveProgress({ stars: {} });
    set({ progress: { stars: {} } });
  },
}));
