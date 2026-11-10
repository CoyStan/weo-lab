"use client";

// "Cause and effect": a living causal map of the quarter. Causes (shocks, the
// economy's own drift, the player's levers) on the left, the roads they travel
// in the middle, where they land (the mission's goals) on the right. Each arrow
// is one piece of the game's shocks-vs-policy decomposition (decompose.ts), on
// the road the model's own drivers say it took (routes.ts); a road the drivers
// cannot vouch for is dashed and marked "roughly". Its width is how hard it
// pushes; one tag per cause on each goal says whose push it is, which way and by
// how much (all its roads together). A quarter strip underneath picks the moment
// shown and shows the player's own change still travelling (forecast against
// "had you changed nothing").
//
// Three layouts: the map (columns) when the slot has the room; a compact map for
// short laptop slots (430 to 600 px tall: the source note joins the header, a
// shorter strip, at most four roads); and a goal-by-goal list when it is narrow
// (phones) or shorter still: the goals in trouble first, each a line with its
// biggest pushes, opened with a tap. On big screens the map is drawn at laptop
// size and scaled up as one piece, so a TV shows the same picture, larger, rather
// than bigger empty cards.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { decompose } from "../../game/decompose";
import { channels, policyTouched, untouchedConfig, type FrameworkInput } from "../../game/framework";
import { knownConfig, policyForTurn, yearValue, type ObjectiveStatus } from "../../game/missions";
import { forecastFor, useGame } from "../../game/store";
import { useTurn } from "../../game/useTurn";
import { decidingQuarter, pointWord } from "../../game/ui/Goals";
import { useReducedMotion } from "../../game/ui/useTween";
import type { SimEvent } from "../../model/types";
import { useSceneView } from "../registry";
import { useReducedMotionFlag } from "../../scene/useSmooth";
import { Anim } from "./anim";
import { Icon } from "./icons";
import { columns, layout, type Box, type LFlow, type Mode, type Ports } from "./placement";
import {
  buildStory,
  causeTotal,
  CHANNEL_ORDER,
  channelMeta,
  drawnAt,
  isBust,
  matters,
  maxPush,
  metricLabel,
  metricRef,
  othersText,
  pushSize,
  pushText,
  reconcile,
  signed,
  unitWord,
  widthNote,
  type Cause,
  type ChannelId,
  type Drawn,
  type Flow,
  type MetricId,
  type Outcome,
  type Story,
} from "./model";
import { roads } from "./routes";
import { useStoryShown, type GoalStatus, type Trouble } from "./shown";
import "./story.css";

type Shown = { flow: Flow; value: number; tone: "good" | "bad"; lever: boolean; tag: boolean };
type Dot = { flow: string; t0: number; dur: number };
const STATUS_RANK: Record<ObjectiveStatus, number> = { failed: 0, "at-risk": 1, "on-track": 2, met: 3 };
const STATUS_WORD: Record<ObjectiveStatus, string> = { met: "met", failed: "missed", "on-track": "on track", "at-risk": "at risk" };
/** The status line's text, as one string (for sizing and labels). */
const statusText = (s: GoalStatus[MetricId]) => (s ? `${s.word}${s.detail ? `: ${s.detail}` : ""}` : "");

/**
 * The last settled picture of the map: its quarter and policy. A map that comes back to the same story (from
 * the island, or remounted) snaps to it rather than playing its entrance again.
 */
const settled = { sig: "" };

/** The header's first guess (title and key); measured once drawn. */
const HEAD_H = 52;
/** The quarter's news, one line under the header. */
const NEWS_H = 22;
const COLHEAD_H = 22;
/** "Sizes and roads come from the model": a line between the map and the strip (first guess; measured). */
const NOTE_H = 22;
/** The strip's first guesses; measured once drawn. */
const STRIP_H = 156;
const STRIP_H_COMPACT = 112;
const MAX_ARROWS = 10;
/** The goal-by-goal list folds each goal to its top two pushes, so it can carry more. */
const MAX_ARROWS_V = 14;
/** The map's design size at a 16 px root: smaller slots get the compact map or the list, larger ones scale the map up. */
const BASE_W = 770;
const BASE_H = 660;
/** Below this the columns cannot hold the goal cards, the strip and the headers, even compact: the list instead. */
const MAP_MIN_H = 430;
const MAP_MIN_W = 560;
/** Below this the map is drawn compact. */
const COMPACT_H = 600;
/** The compact map draws at most this many roads (channels); the rest join "and N more pushes". */
const COMPACT_CHANNELS = 4;

export default function StoryScene() {
  const { mission, config, clock, actual, forecast, policy, policyStart, events, statuses } = useTurn();
  const turns = useGame((s) => s.turns);
  const start = turns[0] ?? config;
  const end = mission?.quarters ?? Math.min(24, clock + 8);
  const touched = policyTouched(config, start);
  const untouchedCfg = useMemo(() => untouchedConfig(config, start), [config, start]);
  const untouched = useMemo(() => (touched ? forecastFor(untouchedCfg, clock) : forecast), [touched, untouchedCfg, clock, forecast]);
  const policyUntouched = useMemo(() => policyForTurn(untouchedCfg, clock), [untouchedCfg, clock]);
  const known = useMemo(() => knownConfig(config, clock), [config, clock]);
  const decomp = useMemo(() => decompose(known, start, end), [known, start, end]);
  // The road each piece took, from the model's drivers: a few more runs of the model (a few milliseconds).
  const byRoad = useMemo(() => roads(known, start, end), [known, start, end]);
  const story = useMemo(() => {
    const input: FrameworkInput = { config, actual, forecast, untouched, clock, end, policy, policyStart, changedSinceStart: touched };
    return buildStory({ config, start, mission, clock, end, forecast, untouched, touched, policy, policyUntouched, decomp, chans: channels(input), roads: byRoad });
  }, [config, start, mission, clock, end, forecast, untouched, touched, policy, policyUntouched, decomp, byRoad, actual, policyStart]);
  // The quarter's news (the island view shows it as toasts; the map names it in its header).
  const news = useMemo(() => events.filter((e) => e.quarter === clock && e.kind !== "decision"), [events, clock]);
  // Goals in trouble, from the same statuses the goals panel shows: the list puts them first, the island's line leads with them.
  const trouble = useMemo(() => {
    const out: Trouble = {};
    for (const o of mission?.objectives ?? []) {
      const st = statuses[o.id];
      if (o.bonus || (st !== "at-risk" && st !== "failed")) continue;
      if (out[o.metric as MetricId] !== "failed") out[o.metric as MetricId] = st;
    }
    return out;
  }, [mission, statuses]);
  const troubleKey = JSON.stringify(trouble);
  // Each goal card's status line, from the goals panel's own status and deciding quarter: "at risk: low point
  // 1.4% in 2026Q4", "on track: 3.0% by 2027Q4". The card's big figure is the quarter shown; this says how the goal fares.
  const goalStatus = useMemo(() => {
    const out: GoalStatus = {};
    if (!mission) return out;
    for (const o of story.outcomes) {
      const objs = mission.objectives.filter((x) => x.metric === o.metric);
      const judged = objs.filter((x) => !x.bonus);
      const main = judged[0];
      if (!main) continue;
      const status = judged.map((x) => statuses[x.id]).filter(Boolean).sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0];
      if (!status) continue;
      const fig = (v: number) => `${v.toFixed(o.digits)}${unitOf(o)}`;
      const at = (t: number) => (t <= clock ? actual[t] : forecast[t])?.[main.metric] ?? 0;
      let detail = "";
      let level = "";
      const dq = decidingQuarter(main, forecast, clock, end);
      if (dq) {
        const q = dq.at;
        level = `${fig(forecast[q][main.metric])} in ${story.labels[q] ?? ""}`;
        detail = `${pointWord(main, dq)} ${level}`;
      } else if (main.when === "year") detail = level = `${fig(yearValue(main, mission, actual, forecast, clock))} in ${main.year ?? ""}`;
      else if (main.when === "end" || clock >= end) detail = level = `${fig(at(end))} ${clock >= end ? "in" : "by"} ${story.labels[end] ?? ""}`;
      const target = `goal ${main.op === "<=" ? "≤" : "≥"} ${String(Number(main.threshold.toFixed(o.digits))).replace("-", "−")}${unitOf(o)}`;
      out[o.metric] = { status, word: STATUS_WORD[status], detail, level, target };
    }
    return out;
  }, [mission, story, statuses, clock, end, forecast, actual]);

  const reducedPref = useReducedMotion();
  const reducedFlag = useReducedMotionFlag();
  const reduced = reducedPref || reducedFlag;

  // Size of the slot, and the root font size (TVs scale the whole interface up).
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ W: 0, H: 0, r: 1, wide: false });
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
      setSize({ W: Math.round(e.contentRect.width), H: Math.round(e.contentRect.height), r, wide: window.innerWidth >= 2000 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The quarter shown: the one being decided, unless the player picks another on the strip.
  const [pick, setPick] = useState<{ clock: number; t: number } | null>(null);
  // The map could not fit two cause cards at this size: the list, until the size or the quarter changes.
  const [cramped, setCramped] = useState<string | null>(null);
  const crampKey = `${size.W}x${size.H}|${clock}`;
  // The goal cards did not fit the full map at this size: the compact map, until the size or the quarter changes.
  const [tight, setTight] = useState<string | null>(null);

  // The cards drop in once the briefing and shock card are out of the way, so the entrance is seen.
  const modal = useGame((s) => s.modal);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!modal && !seen) setSeen(true);
  }, [modal, seen]);
  const T = Math.max(story.first, Math.min(end, pick && pick.clock === clock ? pick.t : clock + 1));
  const list = size.W > 0 && (size.W < MAP_MIN_W || size.H < MAP_MIN_H || cramped === crampKey);
  // The map drawn at its design size and scaled up as one piece; capped so a laptop never shows text over 40 px.
  const scale = list ? 1 : Math.max(1, Math.min(size.wide ? 2.2 : 1.3, size.W / (BASE_W * size.r), size.H / (BASE_H * size.r)));
  const compact = !list && (size.H / scale < COMPACT_H || tight === crampKey);
  // The island view names the map's pushes in one line: it reads this story, at this quarter, and the goals in trouble.
  useEffect(() => useStoryShown.setState({ story, T, max: list ? MAX_ARROWS_V : MAX_ARROWS, list, trouble, status: goalStatus }), [story, T, list, troubleKey, goalStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => useStoryShown.setState({ story: null, list: false, trouble: {}, status: {}, rounded: {} }), []);

  return (
    <div ref={rootRef} className={`st-root${list ? " is-list" : ""}`} role="region" aria-label="Cause and effect: what is moving your goals, and why">
      {size.W > 0 && seen ? (
        <StoryMap
          story={story}
          T={T}
          W={size.W / scale}
          H={size.H / scale}
          s={scale}
          r={size.r}
          list={list}
          compact={compact}
          news={news}
          trouble={trouble}
          goalStatus={goalStatus}
          scroller={rootRef}
          reduced={reduced}
          policySig={`${clock}|${JSON.stringify(policy)}`}
          onPick={(t) => setPick({ clock, t })}
          onCramped={() => setCramped(crampKey)}
          onTight={() => setTight(crampKey)}
        />
      ) : null}
    </div>
  );
}

type MapProps = {
  story: Story;
  T: number;
  /** The drawing box, before scaling. */
  W: number;
  H: number;
  /** Uniform scale of the drawing (1 on a laptop, larger on a TV). */
  s: number;
  /** Root font size over 16 px. */
  r: number;
  list: boolean;
  /** A short slot: the source note in the header, a shorter strip, at most four roads. */
  compact: boolean;
  news: SimEvent[];
  trouble: Trouble;
  goalStatus: GoalStatus;
  scroller: React.RefObject<HTMLDivElement | null>;
  reduced: boolean;
  policySig: string;
  onPick: (t: number) => void;
  onCramped: () => void;
  /** The goal cards overflow the full map even at their fewest lines: draw the compact map instead. */
  onTight: () => void;
};

/** Each lever's name on the folded "Your moves" card: "Budget squeeze", "Rate hike". */
const leverName = (c: Cause) => c.title.replace(/^Your /, "").replace(/^\w/, (x) => x.toUpperCase());
/** "Rate hike" → "rate hike" mid-sentence; "IMF programme" keeps its capitals. */
const lowerFirst = (s: string) => (s.length > 1 && /[A-Z]/.test(s[1]) ? s : s.charAt(0).toLowerCase() + s.slice(1));
/** A push in words, with its unit: "−0.02 pp", "+30 bp", "−0.5 mo". */
const amountOf = (v: number, m: MetricId) => `${pushSize(v, m)}${unitWord(m) === " pp" ? " pp" : ""}`;
/** A tag's word after its cause's icon, so two tags on one goal tell apart from across a room: "rate hike", "drift", "food". */
const chipWord = (c: Cause) =>
  c.kind === "momentum" ? "drift" : c.kind === "lever" ? lowerFirst(leverName(c)) : c.kind === "history" ? "data" : c.id === "other-shocks" ? "shocks" : (c.title.split(" ")[0] ?? "").toLowerCase();

function StoryMap({ story, T, W, H, s, r, list, compact, news, trouble, goalStatus, scroller, reduced, policySig, onPick, onCramped, onTight }: MapProps) {
  const mode: Mode = list ? "v" : "h";
  const u = mode === "h" ? Math.max(1, Math.min(1.8, Math.min(W / (BASE_W * r), H / (BASE_H * r)))) : 1;
  const anim = useRef(new Anim()).current;
  // A map that comes back to the picture it last settled on (same quarter, same policy) snaps to it, with no entrance.
  const snapFirst = useRef(settled.sig === policySig);
  anim.instant = reduced || snapFirst.current;
  const intro = useRef(!snapFirst.current);
  const dots = useRef<Dot[]>([]);
  const sigRef = useRef(policySig);
  sigRef.current = policySig;
  const [, setFrame] = useState(0);
  // The cause whose roads stand out (hover or focus on its card); the rest dim.
  const [spot, setSpot] = useState<string | null>(null);
  // Back from the island to the same story: the settled picture at once (no entrance, count-up or regrowth). A
  // policy changed meanwhile plays as a move does.
  const view = useSceneView();
  const viewRef = useRef({ view, sig: policySig });
  if (viewRef.current.view !== view) {
    if (view === "map" && viewRef.current.sig === policySig) {
      anim.snap();
      dots.current = [];
    }
    viewRef.current = { view, sig: policySig };
  }

  // The header, the source note and the strip, as drawn (unscaled px): the map takes what they leave.
  const headRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const stripRef = useRef<HTMLElement>(null);
  const [meas, setMeas] = useState({ head: 0, note: 0, strip: 0 });
  useLayoutEffect(() => {
    if (mode !== "h") return;
    const read = () => {
      const head = headRef.current?.offsetHeight ?? 0;
      const note = noteRef.current?.offsetHeight ?? 0;
      const strip = stripRef.current?.offsetHeight ?? 0;
      setMeas((m) => (m.head === head && m.note === note && m.strip === strip ? m : { head, note, strip }));
    };
    read();
    // A size change re-lays the map before the frame is painted, so nothing shows in its old place for a frame.
    const ro = new ResizeObserver(() => flushSync(read));
    for (const el of [headRef.current, noteRef.current, stripRef.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [mode, compact]);

  const causeById = useMemo(() => new globalThis.Map(story.causes.map((c) => [c.id, c])), [story.causes]);
  const isLever = (id: string) => causeById.get(id)?.kind === "lever";

  // What to draw at T, and how wide: one scale for every quarter, so arrows grow as effects build.
  const base = drawnAt(story, T, mode === "h" ? MAX_ARROWS : MAX_ARROWS_V);
  const maxT = (mode === "h" ? 30 : 18) * u;
  const k = maxT / maxPush(story);
  const thick = (n: number) => Math.max(2.5, Math.min(maxT, n * k));

  // Stable order: causes and channels in the order they first matter over the whole horizon.
  const causeOrder = useMemo(() => {
    const kindRank = { shock: 0, history: 1, momentum: 2, lever: 3 } as const;
    return [...story.causes].sort((a, b) => kindRank[a.kind] - kindRank[b.kind]).map((c) => c.id);
  }, [story.causes]);
  const outcomes = story.outcomes.map((o) => o.metric);
  const headGuess = mode === "h" ? HEAD_H + (news.length ? NEWS_H : 0) : 74;
  const headH = mode === "h" && meas.head ? Math.max(headGuess - 8, meas.head + 12) : headGuess;
  const mapTop = headH + (mode === "h" ? COLHEAD_H : 18);
  const stripH = meas.strip || (compact ? STRIP_H_COMPACT : STRIP_H);
  const noteH = compact ? 0 : meas.note || NOTE_H;
  const mapH = Math.max(160, H - mapTop - noteH - stripH - 10);
  const newsShocks = new Set(news.filter((e) => e.kind === "shock").map((e) => e.title));

  // ---- Tags: each names its cause in a word where the map has room or a goal carries two or more ----
  // A tag's text is 14 px at least as drawn (the chip's own size, scaled), and the word is the same size.
  const chipPx = Math.max(12.8 * r, 14 / s);
  // Figtree bold at the chip's size: about 0.55 em a figure, 0.5 em a letter, the icon 1.2 em, the padding 0.8 em.
  const chipW = (word: string, fig: string) => chipPx * (0.55 * fig.length + 0.5 * word.length + (word ? 0.3 : 0) + 1.2 + 0.8) + 3;
  /** "others ▼ −0.63" on one line; two lines ("others" over the figure) where the room is short. */
  const othersW = (text: string) => chipPx * (0.5 * 7 + 0.55 * text.length);
  const roomy = mode === "h" && (s >= 1.2 || r > 1);
  const wordy = (count: number) => roomy || count >= 2;
  // The room the tags want, read from the arrows before any folding (so the columns never flip between two widths).
  const tagRoom = (() => {
    if (mode !== "h") return 0;
    let want = 0;
    for (const m of outcomes) {
      const ids = [...new Set(base.drawn.filter((d) => d.flow.metric === m).map((d) => d.flow.cause))];
      for (const id of ids) {
        const c = causeById.get(id);
        if (!c) continue;
        const fig = pushText(causeTotal(story, id, m, T), m);
        want = Math.max(want, chipW(wordy(ids.length) ? chipWord(c) : "", fig));
      }
      // "others ▼ −0.2" under the tags.
      if (ids.length) want = Math.max(want, othersW("▼ −0.2"));
    }
    return want + 10;
  })();
  // Card heights from their text, so no line runs out of its card (Figtree: about half an em a character).
  const col = columns(W, u, compact, tagRoom);
  const px = 14 * r;
  const lineH = 17.5 * r;
  const lines = (text: string, avail: number, bold = false) => Math.max(1, Math.ceil((text.length * px * (bold ? 0.56 : 0.5)) / Math.max(40, avail)));
  // The room between the roads' column and the goal cards, for the tags and the line under them.
  const tagRoomNow = col.outX - (col.chanX + col.chanW) - 8;
  // The line under a goal's tags: "others ▼ −0.2" on one line when it fits beside the roads' column, else in two.
  const othersTwo = (text: string) => othersW(text) > tagRoomNow;
  const lineOf = Math.round(chipPx * 1.25);
  const footOf = (text: string | null | undefined) => (text ? (othersTwo(text) ? 2 * lineOf : lineOf) + 6 : 0);

  // Cause cards' heights as drawn: each card is laid out once, hidden, at its column's width, and measured.
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const measureRef = useRef<HTMLDivElement>(null);

  // ---- Fitting: what is drawn, folded until every card sits above the note and the strip ----
  let drawn: Drawn[] = base.drawn;
  let hidden = base.hidden;
  // Folding a road away adds to "N more pushes", except a lever's: every lever moved keeps its own place.
  const drop = (gone: (d: Drawn) => boolean) => {
    hidden += drawn.filter((d) => gone(d) && !isLever(d.flow.cause)).length;
    drawn = drawn.filter((d) => !gone(d));
  };
  // A road's rank: the player's first, then by push.
  const chanRank = (id: ChannelId) => drawn.filter((d) => d.flow.channel === id).reduce((a, d) => a + d.n + (isLever(d.flow.cause) ? 1000 : 0), 0);
  const usedChans = () => CHANNEL_ORDER.filter((id) => drawn.some((d) => d.flow.channel === id));
  if (mode === "h" && compact) {
    const keepChans = new Set(usedChans().sort((a, b) => chanRank(b) - chanRank(a)).slice(0, COMPACT_CHANNELS));
    drop((d) => !keepChans.has(d.flow.channel));
  }
  // The "Costs" road is "World prices" where the commodity bust travels on it.
  const chanMeta = (id: ChannelId) => channelMeta(id, drawn.some((d) => d.flow.channel === id && isBust(causeById.get(d.flow.cause))));
  // A shock card whose description names a goal ("Inflation +2 pp") also gives its total on that goal, with knock-ons (all its roads).
  // (Its tag at the goal gives the same total, with the card's icon: in a short slot the card can do without it.)
  let knockless = false;
  // The figures the goals' tags show, as last rounded (so the card and its tag say the same number).
  let curRecs: globalThis.Map<MetricId, { values: globalThis.Map<string, number>; others: string | null }> | null = null;
  const knockOf = (c: Cause) => {
    if (knockless || !c.names || !drawn.some((x) => x.flow.cause === c.id && x.flow.metric === c.names)) return null;
    const v = curRecs?.get(c.names)?.values.get(c.id) ?? causeTotal(story, c.id, c.names, T);
    return `${signed(v, 1)}${unitWord(c.names)} in all`;
  };
  // A lever with no road drawn this quarter still has its place, and says why: its push is tiny so far (the lag), or
  // its roads were folded for room.
  const quietOf = (c: Cause): string | null => {
    if (c.kind !== "lever" || drawn.some((d) => d.flow.cause === c.id)) return null;
    let best: { v: number; m: MetricId } | null = null;
    for (const o of story.outcomes) {
      const v = causeTotal(story, c.id, o.metric, T);
      if (!best || Math.abs(v) / metricRef(o.metric) > Math.abs(best.v) / metricRef(best.m)) best = { v, m: o.metric };
    }
    if (!best || Math.abs(best.v) < 0.005) return "no push on your goals yet; see When does it land?";
    if (!matters(best.v, best.m)) return `tiny this quarter (${amountOf(best.v, best.m)}); see When does it land?`;
    return `${metricLabel(best.m).toLowerCase()} ${amountOf(best.v, best.m)}; its roads are folded for room`;
  };
  let fit = 0; // goal cards: 0 every line; 1 without the goal line; 2 also without "without your moves"
  let outs = outcomes; // the goal cards drawn (a compact map can give up a figure that is no goal of the mission)
  const goalKey = (o: Outcome, at: number) => `o:${o.metric}|${at}|${compact ? 1 : 0}|${Math.round(col.outW)}|${statusText(goalStatus[o.metric])}|${drawn.some((d) => d.flow.metric === o.metric) ? 0 : 1}|${o.path[T].toFixed(o.digits)}`;
  let chanFit = compact ? 1 : 0; // channel cards: 1 without their second line (always in a compact map)
  let moreInHead = false; // "and N more pushes" moved into the column head
  let folded = false; // the player's levers folded into one "Your moves (N)" card
  const causeLine = (c: Cause) => `${c.sub}${c.note ? ` · ${c.note}` : ""}${knockOf(c) ? `, ${knockOf(c)}` : ""}`;
  const minH = (id: string) => {
    if (id.startsWith("c:")) {
      const c = causeById.get(id.slice(2));
      if (!c) return 0;
      const quiet = quietOf(c);
      if (folded && c.kind === "lever") return 8 * r + lines(leverName(c), col.causeW - 3 - 19 * r - 24 * r - 8 * r, true) * lineH + (quiet ? lines(quiet, col.causeW - 3 - 19 * r - 24 * r - 8 * r) * lineH : 0);
      // As measured, when the card has been laid out at this width with this text.
      const key = `${id}|${causeLine(c)}|${quiet ?? ""}|${compact ? 1 : 0}|${Math.round(col.causeW)}`;
      if (measured[key]) return measured[key];
      // Padding, the icon and the gap beside it (smaller in a compact map).
      const avail = col.causeW - 3 - (compact ? 14.4 + 25.6 + 6.4 : 19 + 32 + 8) * r;
      let n = lines(c.title, avail, true) + lines(causeLine(c), avail);
      const em = causeEm(c, newsShocks.has(c.title), compact);
      if (em) n += lines(em, avail, true);
      if (quiet) n += lines(quiet, avail) * 1.1;
      return (compact ? 13 : 15) * r + n * lineH;
    }
    if (id.startsWith("h:")) {
      const ch = chanMeta(id.slice(2) as ChannelId);
      const avail = col.chanW - 3 - (compact ? 13.6 + 22.4 + 4.8 : 16 + 26 + 6) * r;
      return 13 * r + (lines(ch.title, avail, true) + (chanFit ? 0 : lines(ch.sub, avail))) * lineH;
    }
    const o = story.outcomes.find((x) => x.metric === id.slice(2));
    if (!o) return 0;
    // As measured (a hidden copy of the card at this width, at each fit), else from the text.
    const gm = measured[goalKey(o, fit)];
    if (gm) return gm;
    const avail = col.outW - 3 - 22 * r;
    const st = statusText(goalStatus[o.metric]);
    const statusN = st ? lines(st, avail - 14 * r, true) : 0;
    const quietN = drawn.some((d) => d.flow.metric === o.metric) ? 0 : 1;
    const n = 1 + statusN + quietN + (fit < 2 ? 1 : 0) + (fit < 1 ? lines(o.goal ?? "not a mission goal: one to watch", avail) : 0);
    if (!compact) return 18 * r + 27 * r + 32 * r + n * lineH;
    // Compact: the name and the figure share a row; when both do not fit ("Public debt 62.5%") the figure takes a row of its own.
    const head = (22.4 + 5.6 + o.label.length * 0.46 * 14.4 + 5.6 + o.path[T].toFixed(o.digits).length * 0.58 * 21.6 + (o.unit === "%" ? 12 : 26)) * r;
    return 15 * r + 24 * r + (head > col.outW - 3 - 17.6 * r ? 24 * r : 0) + n * lineH;
  };
  // One tag per cause on each goal, on its widest road; the tag gives the cause's whole push there.
  const tagged = () => {
    const best = new globalThis.Map<string, Drawn>();
    for (const d of drawn) {
      const key = `${d.flow.cause}|${d.flow.metric}`;
      const b = best.get(key);
      if (!b || d.n > b.n) best.set(key, d);
    }
    return new Set([...best.values()].map((d) => d.flow.id));
  };
  // Each goal's tags, rounded so that they and "others" add up to the change its card shows (largest remainder).
  const reconciled = (tags: Set<string>) => {
    const out = new globalThis.Map<MetricId, { values: globalThis.Map<string, number>; others: string | null }>();
    for (const o of story.outcomes) {
      const ids = drawn.filter((d) => d.flow.metric === o.metric && tags.has(d.flow.id)).map((d) => d.flow.cause);
      const pills = ids.map((c) => causeTotal(story, c, o.metric, T));
      const change = o.path[T] - o.path[0];
      const shown = Number(o.path[T].toFixed(o.digits)) - Number(o.path[0].toFixed(o.digits));
      const rec = reconcile(pills, change, shown, o.metric, o.digits);
      out.set(o.metric, { values: new globalThis.Map(ids.map((c, i) => [c, rec.values[i]])), others: othersText(rec, o.metric, o.digits) });
    }
    return out;
  };
  // Every lever moved has a place, drawn or not; other causes when one of their roads is drawn.
  const usedCauses = () => causeOrder.filter((id) => isLever(id) || drawn.some((d) => d.flow.cause === id));
  const plan = () => {
    const causes = usedCauses();
    const chans = usedChans();
    const tags = tagged();
    const recs = reconciled(tags);
    const lflows: LFlow[] = drawn.map((d) => ({ id: d.flow.id, cause: d.flow.cause, channel: d.flow.channel, metric: d.flow.metric, thick: thick(d.n), tag: tags.has(d.flow.id) }));
    const more = hidden > 0 && mode === "h" && !moreInHead;
    const levers = causes.filter(isLever);
    const lay = layout({
      mode,
      W,
      top: mapTop,
      H: mapH,
      causes: more ? [...causes, "__more"] : causes,
      channels: chans,
      outcomes: outs,
      flows: lflows,
      u,
      minH,
      compact,
      tagRoom,
      goalFoot: (m) => (drawn.some((d) => d.flow.metric === m) ? footOf(recs.get(m as MetricId)?.others) : 0),
      group: folded ? { ids: levers, head: 10 * r + lineH, foot: 8 * r, line: 26 * r } : undefined,
      base: compact ? { cause: 52, chan: 40, goal: 60 } : undefined,
    });
    curRecs = recs;
    return { lay, causes, chans, tags, recs, more };
  };
  let p = plan();
  // (The "more pushes" note is drawn as a 30 px line in the middle of its slot.)
  const over = (prefix: string) => [...p.lay.nodes].some(([id, b]) => id.startsWith(prefix) && (id === "c:__more" ? b.y + b.h / 2 + 15 : b.y + b.h) > mapTop + mapH + 1);
  const cards = () => p.causes.filter((id) => !folded || !isLever(id)).length + (folded ? 1 : 0);
  let cramped = false;
  if (mode === "h") {
    // Goal cards drop their goal line (the goals column beside says it), then "without your moves".
    while (fit < 2 && over("o:")) {
      fit += 1;
      p = plan();
    }
    // A compact map still too short for its goal cards: a figure that is not one of the mission's goals ("one to
    // watch") gives up its card, and its pushes go with it (they are on no goal of the mission).
    if (compact && over("o:")) {
      const goals = outcomes.filter((m) => story.outcomes.find((o) => o.metric === m)?.goal);
      if (goals.length && goals.length < outs.length) {
        outs = goals;
        drawn = drawn.filter((d) => outs.includes(d.flow.metric));
        p = plan();
      }
    }
    // Channel cards drop their second line, then the smallest roads join "and N more pushes".
    if (over("h:")) {
      chanFit = 1;
      p = plan();
    }
    while (over("h:") && p.chans.length > 1) {
      const last = [...p.chans].sort((a, b) => chanRank(a) - chanRank(b))[0];
      drop((d) => d.flow.channel === last);
      p = plan();
    }
    // Causes: the "more pushes" note into the column head, and a shock card's knock-on total left to its tag (the
    // cards at their least height); then (a) the player's levers into one card; then (b) the smallest pushes from
    // outside the player's hands into "and N more pushes" (a lever is never folded away); (c) the list if fewer
    // than two cards fit.
    if (hidden > 0 && over("c:")) {
      moreInHead = true;
      p = plan();
    }
    if (over("c:") && p.causes.some((id) => knockOf(causeById.get(id)!) !== null)) {
      knockless = true;
      p = plan();
    }
    if (over("c:") && p.causes.filter(isLever).length >= 2) {
      folded = true;
      p = plan();
    }
    const causeRank = (id: string) => drawn.filter((d) => d.flow.cause === id).reduce((a, d) => a + d.n, 0);
    while (over("c:") && cards() > 2) {
      const outside = p.causes.filter((id) => !isLever(id));
      if (!outside.length) break;
      const last = [...outside].sort((a, b) => causeRank(a) - causeRank(b))[0];
      drop((d) => d.flow.cause === last);
      moreInHead = true;
      p = plan();
    }
    cramped = over("c:");
    // Goals still too tall for their tags: the smallest push from outside the player's hands on a goal (one
    // cause's roads there, never a goal's biggest) joins "and N more pushes", a cause with other pushes first.
    while (over("o:")) {
      const biggest = new Set(story.outcomes.map((o) => drawn.filter((d) => d.flow.metric === o.metric).sort((a, b) => b.n - a.n)[0]?.flow.id));
      const pairs = new globalThis.Map<string, Drawn[]>();
      for (const d of drawn) if (!isLever(d.flow.cause)) pairs.set(`${d.flow.cause}|${d.flow.metric}`, [...(pairs.get(`${d.flow.cause}|${d.flow.metric}`) ?? []), d]);
      const size = (l: Drawn[]) => l.reduce((a, d) => a + d.n, 0);
      const elsewhere = (l: Drawn[]) => drawn.some((d) => d.flow.cause === l[0].flow.cause && d.flow.metric !== l[0].flow.metric);
      const cands = [...pairs.values()].filter((l) => !l.some((d) => biggest.has(d.flow.id))).sort((a, b) => Number(elsewhere(b)) - Number(elsewhere(a)) || size(a) - size(b));
      if (!cands.length) break;
      const gone = new Set(cands[0]);
      drop((d) => gone.has(d));
      moreInHead = true;
      p = plan();
    }
  }
  // Goal cards still taller than the room, at their fewest lines: the compact map (its cards are shorter). Read
  // only once the cards have been measured, so a first guess never switches the layout.
  const measuredNow = story.outcomes.every((o) => measured[goalKey(o, fit)] !== undefined);
  const tight = mode === "h" && !compact && measuredNow && over("o:");
  useEffect(() => {
    if (cramped) onCramped();
  }, [cramped, onCramped]);
  useEffect(() => {
    if (tight) onTight();
  }, [tight, onTight]);
  const { lay, causes: usedCauseIds, chans: usedChannels, tags, recs } = p;
  const causeIds = p.more ? [...usedCauseIds, "__more"] : usedCauseIds;
  // The tags' figures as rounded here, for the island's line (the list publishes its own).
  const roundedKey =
    mode === "h"
      ? JSON.stringify(
          Object.fromEntries(
            [...recs].flatMap(([m, rec]) => [...rec.values].filter(([id]) => drawn.some((d) => d.flow.cause === id && d.flow.metric === m)).map(([id, v]) => [`${id}|${m}`, v])),
          ),
        )
      : "";
  useEffect(() => {
    if (roundedKey) useStoryShown.setState({ rounded: JSON.parse(roundedKey) });
  }, [roundedKey]);
  if (p.more) {
    // The "more pushes" note is a short line, not a full card.
    const more = lay.nodes.get("c:__more");
    if (more) lay.nodes.set("c:__more", { ...more, y: more.y + more.h / 2 - 15, h: 30 });
  }
  // Some arrow on show takes a road the drivers cannot vouch for: the column head says so. The source note
  // and the arrow-width note read the arrows before any folding: they are measured, and the folding
  // reads the room they leave, so they must not depend on it (or the map would flip between two layouts).
  const rough = drawn.some((d) => d.flow.approx);
  const roughNote = base.drawn.some((d) => d.flow.approx);
  const widths = widthNote([...new Set(base.drawn.map((d) => d.flow.metric))]);
  // The words on the tags, from the room the columns left: the lever's whole name, else its first word, else none.
  // One word per cause across the map (the same lever never reads "rate hike" on one goal and "rate" on another).
  const words = (() => {
    const out = new globalThis.Map<string, string>();
    if (mode !== "h") return out;
    const figs = new globalThis.Map<string, string[]>();
    for (const o of story.outcomes) {
      const ids = [...new Set(drawn.filter((d) => d.flow.metric === o.metric).map((d) => d.flow.cause))];
      if (!wordy(ids.length)) continue;
      for (const id of ids) figs.set(id, [...(figs.get(id) ?? []), pushText(recs.get(o.metric)?.values.get(id) ?? causeTotal(story, id, o.metric, T), o.metric)]);
    }
    for (const [id, list] of figs) {
      const c = causeById.get(id);
      if (!c) continue;
      const full = chipWord(c);
      const fits = (w: string) => list.every((fig) => chipW(w, fig) <= tagRoomNow);
      const first = full.split(" ")[0];
      out.set(id, fits(full) ? full : fits(first) ? first : "");
    }
    return out;
  })();
  const tagWord = (c: Cause | undefined, m: MetricId) => {
    if (!c) return "";
    const count = new Set(drawn.filter((d) => d.flow.metric === m).map((d) => d.flow.cause)).size;
    return wordy(count) ? (words.get(c.id) ?? "") : "";
  };

  // Cause cards measured as drawn: laid out hidden at the column's width, so a card is never shorter than its text.
  const goalQuiet = (o: Outcome) => (drawn.some((d) => d.flow.metric === o.metric) ? null : recs.get(o.metric)?.others ? `small pushes ${recs.get(o.metric)!.others}` : "no push to speak of yet");
  const measureKey =
    mode === "h"
      ? usedCauseIds.map((id) => `${id}|${causeLine(causeById.get(id)!)}|${quietOf(causeById.get(id)!) ?? ""}`).join("~") +
        `|${Math.round(col.causeW)}|${compact}|${r}|` +
        story.outcomes.map((o) => goalKey(o, 0)).join("~")
      : "";
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root || mode !== "h") return;
    const next: Record<string, number> = {};
    for (const el of root.querySelectorAll<HTMLElement>("[data-measure]")) next[el.dataset.measure!] = Math.ceil(el.offsetHeight) + 2;
    setMeasured((prev) => {
      const keys = Object.keys(next);
      return keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]) ? prev : next;
    });
  }, [measureKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Animation targets ---------------------------------------------------
  const prevNodes = useRef(new globalThis.Map<string, Box>());
  // The cards on show before this render: a road to a card that is new waits for the card to come in.
  const had = new Set(prevNodes.current.keys());
  // The "more pushes" note keeps its last count while it fades out.
  const lastHidden = useRef(hidden);
  if (hidden > 0) lastHidden.current = hidden;
  const moreCount = hidden > 0 ? hidden : lastHidden.current;
  const prevFlows = useRef(new globalThis.Map<string, { shown: Shown; ports: Ports }>());
  const order = [...causeIds.map((c) => "c:" + c), ...usedChannels.map((c) => "h:" + c), ...outs.map((o) => "o:" + o)];
  const delayOf = (id: string) => {
    // After the entrance, a new card waits a moment for its neighbours to make room.
    if (!intro.current) return 220;
    const i = order.indexOf(id === "c:__group" ? "c:" + (usedCauseIds.find(isLever) ?? "") : id);
    return id.startsWith("c:") ? 120 + i * 140 : id.startsWith("h:") ? 520 + i * 60 : 700 + i * 60;
  };
  for (const [id, b] of lay.nodes) {
    const delay = delayOf(id);
    anim.set(`n:${id}:x`, b.x);
    // Cards rise into place from just below, so none passes over the column heads on its way.
    anim.set(`n:${id}:y`, b.y, { from: b.y + (mode === "h" ? 12 : 10), delay });
    anim.set(`n:${id}:w`, b.w);
    anim.set(`n:${id}:h`, b.h);
    anim.set(`n:${id}:o`, 1, { from: 0, delay });
    prevNodes.current.set(id, b);
  }
  for (const [id, b] of prevNodes.current) {
    if (lay.nodes.has(id)) continue;
    anim.set(`n:${id}:o`, 0);
    anim.set(`n:${id}:x`, b.x);
    anim.set(`n:${id}:y`, b.y);
    if (anim.get(`n:${id}:o`) < 0.02) {
      anim.drop(`n:${id}:`);
      prevNodes.current.delete(id);
    }
  }
  // Levers whose card came in with this render: their dots wait for it too.
  const newLevers = useRef(new Set<string>());
  newLevers.current = new Set(usedCauseIds.filter((id) => isLever(id) && !had.has("c:" + id)));
  for (const m of outs) anim.set(`ft:${m}`, lay.foot.get(m) ?? 0);
  const shownNow = new globalThis.Map<string, { shown: Shown; ports: Ports }>();
  for (const d of drawn) {
    const o = story.outcomes.find((x) => x.metric === d.flow.metric)!;
    const tone = Math.sign(d.value) === o.good(T) ? "good" : "bad";
    const ports = lay.ports.get(d.flow.id)!;
    shownNow.set(d.flow.id, { shown: { flow: d.flow, value: d.value, tone, lever: isLever(d.flow.cause), tag: tags.has(d.flow.id) }, ports });
    const fid = `f:${d.flow.id}`;
    // In the entrance, after its cause's card; later, a road into a card that has just appeared waits for it.
    const delay = intro.current ? delayOf("c:" + d.flow.cause) + 380 : !had.has("c:" + d.flow.cause) || !had.has("h:" + d.flow.channel) ? 450 : 0;
    anim.set(`${fid}:t`, thick(d.n), { from: 0, delay });
    ports.forEach((pt, i) => anim.set(`${fid}:p${i}`, pt));
    anim.set(`${fid}:d`, 1, { from: reduced ? 1 : 0, delay, rate: 1.4 });
    prevFlows.current.set(d.flow.id, shownNow.get(d.flow.id)!);
  }
  for (const [id, rec] of prevFlows.current) {
    if (shownNow.has(id)) continue;
    anim.set(`f:${id}:t`, 0);
    if (anim.get(`f:${id}:t`) < 0.3) {
      anim.drop(`f:${id}:`);
      prevFlows.current.delete(id);
      continue;
    }
    shownNow.set(id, rec);
  }
  // One animated value per goal: the big number, its "since" line and "without your moves" all read from it,
  // so they always agree while it counts. The arrow tags show their final figure (no count of their own).
  for (const o of story.outcomes) {
    anim.set(`v:${o.metric}`, o.path[T], { from: o.path[Math.max(0, story.first - 1)], delay: intro.current ? 900 : 0 });
    // "Without your moves" counts up only in the entrance; after a move it appears at its own value, so it never
    // seems to react to the player's move.
    if (o.ghost) anim.set(`g:${o.metric}`, o.ghost[T], intro.current ? { from: o.ghost[Math.max(0, story.first - 1)], delay: 900 } : undefined);
    else anim.drop(`g:${o.metric}`);
  }
  // Time strip bars: the player's own effect by quarter, each row on its own scale.
  const cells: number[] = [];
  for (let t = story.first; t <= story.end; t++) cells.push(t);
  if (story.travel)
    story.travel.diffs.forEach((d) => {
      const top = Math.max(1e-9, ...cells.map((t) => Math.abs(d.values[t] ?? 0)));
      cells.forEach((t) => anim.set(`b:${d.metric}:${t}`, (d.values[t] ?? 0) / top, { from: 0, delay: intro.current ? 900 + (t - story.first) * 70 : 0 }));
    });

  // ---- Events: a lever moved, a shock landed --------------------------------
  const prevSig = useRef<string | null>(null);
  const prevCauses = useRef<Set<string> | null>(null);
  const drawnRef = useRef<Drawn[]>(drawn);
  drawnRef.current = drawn;
  useEffect(() => {
    const now = performance.now();
    const sameQuarter = prevSig.current !== null && prevSig.current.split("|")[0] === policySig.split("|")[0];
    if (!reduced && sameQuarter && prevSig.current !== policySig) {
      // The lever's arrows grow; a dot carries the push from the lever to the goals, and the strip's bars
      // regrow left to right, quarter by quarter: the journey of the move. A new move restarts the journey.
      // A lever card that has just come in is in place before its dots set off.
      dots.current = dots.current.filter((d) => causeById.get(d.flow.split("|")[0])?.kind !== "lever");
      for (const d of drawnRef.current) if (causeById.get(d.flow.cause)?.kind === "lever") dots.current.push({ flow: d.flow.id, t0: now + 150 + (newLevers.current.has(d.flow.cause) ? 450 : 0), dur: 1700 });
      if (story.travel) story.travel.diffs.forEach((dd) => cells.forEach((t) => anim.kick(`b:${dd.metric}:${t}`, 0, 150 + (t - story.first) * 110)));
    }
    prevSig.current = policySig;
    const ids = new Set(story.causes.map((c) => c.id));
    if (!reduced && prevCauses.current) {
      for (const c of story.causes) if (!prevCauses.current.has(c.id) && c.kind !== "lever") for (const d of drawnRef.current) if (d.flow.cause === c.id) dots.current.push({ flow: d.flow.id, t0: now + 800, dur: 1700 });
    }
    prevCauses.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policySig, story]);

  // ---- The frame loop: runs only while something moves; rAF pauses in a hidden tab ----
  const raf = useRef(0);
  useEffect(() => {
    intro.current = false;
    snapFirst.current = false;
    if (!(anim.moving() || dots.current.length)) {
      settled.sig = sigRef.current;
      return;
    }
    if (raf.current) return;
    let last = performance.now();
    const step = (now: number) => {
      // A stalled frame (a busy main thread, a background tab) leaves no figure half-way: what is due lands at once.
      if (now - last > 250) anim.settle(now);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const moving = anim.tick(dt, now);
      dots.current = dots.current.filter((d) => now - d.t0 < d.dur);
      setFrame((f) => (f + 1) % 1e6);
      raf.current = moving || dots.current.length ? requestAnimationFrame(step) : 0;
      if (!raf.current) settled.sig = sigRef.current;
    };
    raf.current = requestAnimationFrame(step);
  });
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // ---- Geometry from the animated values -----------------------------------
  const box = (id: string): Box => ({ x: anim.get(`n:${id}:x`), y: anim.get(`n:${id}:y`), w: anim.get(`n:${id}:w`), h: anim.get(`n:${id}:h`) });
  const geom = (id: string, sh: Shown) => {
    const C = box("c:" + sh.flow.cause);
    const M = box("h:" + sh.flow.channel);
    const O = box("o:" + sh.flow.metric);
    const pt = [0, 1, 2, 3].map((i) => anim.get(`f:${id}:p${i}`));
    if (mode === "h") return [{ x: C.x + C.w, y: C.y + pt[0] }, { x: M.x, y: M.y + pt[1] }, { x: M.x + M.w, y: M.y + pt[2] }, { x: O.x, y: O.y + pt[3] }];
    return [{ x: C.x + pt[0], y: C.y + C.h }, { x: M.x + pt[1], y: M.y }, { x: M.x + pt[2], y: M.y + M.h }, { x: O.x + pt[3], y: O.y }];
  };
  const curve = (a: Pt, b: Pt) => (mode === "h" ? [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b] : [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b]);
  const pathOf = (g: Pt[]) => {
    const [a, b1, b2, c] = g;
    const s1 = curve(a, b1);
    const s2 = curve(b2, c);
    return `M${f(a.x)} ${f(a.y)}C${f(s1[1].x)} ${f(s1[1].y)} ${f(s1[2].x)} ${f(s1[2].y)} ${f(b1.x)} ${f(b1.y)}L${f(b2.x)} ${f(b2.y)}C${f(s2[1].x)} ${f(s2[1].y)} ${f(s2[2].x)} ${f(s2[2].y)} ${f(c.x)} ${f(c.y)}`;
  };
  const pointAt = (g: Pt[], at: number): Pt => {
    const [a, b1, b2, c] = g;
    const L = [dist(a, b1) * 1.1, dist(b1, b2), dist(b2, c) * 1.1];
    let d = at * (L[0] + L[1] + L[2]);
    if (d <= L[0]) return bez(curve(a, b1), d / L[0]);
    d -= L[0];
    if (d <= L[1]) return { x: b1.x + (b2.x - b1.x) * (d / L[1]), y: b1.y + (b2.y - b1.y) * (d / L[1]) };
    d -= L[1];
    return bez(curve(b2, c), Math.min(1, d / L[2]));
  };

  const now = performance.now();
  const flowsShown = [...shownNow.entries()];
  const quarter = story.labels[T] ?? "";
  const ahead = T - story.clock - 1;
  // One name for the quarter everywhere: the one being decided (the lever box says "Decide now for 2026Q1").
  const when = ahead === 0 ? "the quarter you are deciding" : T <= story.clock ? "already played" : `forecast, ${ahead} quarter${ahead === 1 ? "" : "s"} later`;

  if (mode === "v") {
    // Goal by goal: the same causes, roads and pushes; the goals in trouble first, each folded to one line.
    return (
      <ListMap
        story={story}
        T={T}
        quarter={quarter}
        when={when}
        news={news}
        newsShocks={newsShocks}
        flowsShown={flowsShown}
        causeById={causeById}
        anim={anim}
        maxT={maxT}
        hidden={hidden}
        cells={cells}
        trouble={trouble}
        goalStatus={goalStatus}
        onPick={onPick}
        scroller={scroller}
        reduced={reduced}
        drawn={drawn.map((d) => d.flow)}
        width={W}
      />
    );
  }

  // A cause's pushes in words, for its card's label: "inflation −0.07 pp, helps (through spending −0.05, expectations −0.02)".
  const pushesOf = (c: Cause) =>
    story.outcomes
      .map((o) => {
        const fl = story.flows.filter((x) => x.cause === c.id && x.metric === o.metric);
        const v = causeTotal(story, c.id, o.metric, T);
        if (!fl.length || Math.abs(v) < 0.005) return null;
        const road = (x: Flow) => channelMeta(x.channel, isBust(c)).title.toLowerCase();
        const roadsText = fl.length > 1 ? ` (${fl.map((x) => `through ${road(x)} ${pushSize(x.values[T] ?? 0, o.metric)}`).join(", ")})` : ` through ${road(fl[0])}`;
        return `${o.label.toLowerCase()} ${amountOf(v, o.metric)}, ${!matters(v, o.metric) ? "too small to matter" : Math.sign(v) === o.good(T) ? "helps" : "hurts"}${roadsText}`;
      })
      .filter(Boolean)
      .join("; ");
  const spotProps = (id: string) => ({
    onMouseEnter: () => setSpot(id),
    onMouseLeave: () => setSpot((x) => (x === id ? null : x)),
    onFocus: () => setSpot(id),
    onBlur: () => setSpot((x) => (x === id ? null : x)),
  });
  const levers = usedCauseIds.filter(isLever);
  const shownSpot = spot && usedCauseIds.includes(spot) ? spot : null;
  const dim = (cause: string) => (shownSpot && shownSpot !== cause ? 0.2 : 1);
  const hint = (
    <>
      Wider arrow, bigger push. <b>▲</b> up, <b>▼</b> down, in pp; <Key tone="good" /> or <Key tone="bad" /> your goal.
    </>
  );
  const source = roughNote ? (
    <>
      Sizes and roads come from the model; dashed roads (<RoughMark />) are rough.
    </>
  ) : (
    "Sizes and roads come from the model."
  );

  return (
    <div
      className={`st-map is-h${compact ? " is-compact" : ""}${shownSpot ? " has-spot" : ""}${reduced ? " is-reduced" : ""}`}
      style={{ width: W, height: H, transform: s !== 1 ? `scale(${s})` : undefined, ["--st-s" as string]: s, ["--st-u" as string]: u }}
    >
      <header className="st-head" ref={headRef}>
        <p className="st-title">
          What moves your goals <span className="st-title-q">· {quarter}, {compact && ahead === 0 ? "deciding" : when}</span>
        </p>
        <p className="st-hint">
          {hint}
          {/* A compact map: where sizes and roads come from, in the header (the column head's "--- roughly" keys the dashed roads). */}
          {compact ? ` Sizes and roads come from the model.${widths ? ` ${widths}` : ""}` : null}
        </p>
        <NewsLine news={news} label={story.labels[story.clock] ?? ""} />
      </header>

      <div className="st-colheads" aria-hidden="true" style={{ top: headH }}>
        <span style={{ left: col.causeX, width: Math.max(col.causeW, col.chanX - col.causeX - 28) }}>What pushed{moreInHead && hidden ? ` (+${hidden} more)` : ""}</span>
        <span style={{ left: col.chanX - 24, width: col.chanW + 48, textAlign: "center" }}>
          Through
          {rough ? (
            <span className="st-roughkey">
              <RoughMark /> roughly
            </span>
          ) : null}
        </span>
        <span style={{ left: col.outX, width: col.outW }}>Where it lands, {quarter}</span>
      </div>

      <div className="st-canvas">
        <svg className="st-svg" width={W} height={H} aria-hidden="true">
          {flowsShown.map(([id, { shown }]) => {
            const t = anim.get(`f:${id}:t`);
            if (t < 0.2) return null;
            const d = pathOf(geom(id, shown));
            const draw = anim.get(`f:${id}:d`, 1);
            // Drawing in: a dash that reveals the arrow. A rough road once drawn: a wide one is a pale ribbon with
            // a dashed centre line; a narrow one is dashed in full colour. The dash never scales with the width.
            const reveal = draw < 1 ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - draw } : {};
            const ribbon = shown.flow.approx && t > 8;
            const thinRough = shown.flow.approx && !ribbon;
            const body = draw < 1 ? reveal : thinRough ? { strokeDasharray: "7 5" } : {};
            const c = causeById.get(shown.flow.cause);
            const road = `${c?.title ?? shown.flow.cause} through ${channelMeta(shown.flow.channel, isBust(c)).title.toLowerCase()}${shown.flow.approx ? " (roughly)" : ""}: ${metricLabel(shown.flow.metric).toLowerCase()} ${amountOf(shown.value, shown.flow.metric)} on this road`;
            return (
              <g key={id} className={`st-flow is-${shown.tone}${shown.lever ? " is-lever" : ""}${shown.flow.approx ? " is-rough" : ""}${ribbon ? " is-ribbon" : ""}`} opacity={dim(shown.flow.cause)}>
                <title>{road}</title>
                {/* Its edge: ink for the player's own roads, the tone's colour for the others (3:1 on the paper). */}
                {thinRough && !shown.lever ? null : <path d={d} className="st-flow-edge" strokeWidth={t + 3} {...reveal} />}
                {/* Paper under the pale body, so the coloured edge stays an edge. */}
                {shown.lever || thinRough ? null : <path d={d} className="st-flow-under" strokeWidth={t} {...reveal} />}
                <path d={d} className="st-flow-body" strokeWidth={t} {...body} />
                {ribbon && draw >= 1 ? <path d={d} className="st-flow-centre" strokeWidth={2} strokeDasharray="6 5" /> : null}
              </g>
            );
          })}
          {dots.current.map((dot, i) => {
            const rec = shownNow.get(dot.flow);
            if (!rec) return null;
            const at = (now - dot.t0) / dot.dur;
            if (at < 0 || at > 1) return null;
            const e = at < 0.5 ? 2 * at * at : 1 - Math.pow(-2 * at + 2, 2) / 2;
            const pt = pointAt(geom(dot.flow, rec.shown), e);
            // Grows out of the lever card and shrinks into the goal card, so it never pops.
            const rad = Math.max(5, anim.get(`f:${dot.flow}:t`) / 2 + 2.5) * Math.min(1, at / 0.08, (1 - at) / 0.12);
            return <circle key={`${dot.flow}-${i}`} className={`st-dot is-${rec.shown.tone}`} cx={pt.x} cy={pt.y} r={rad} opacity={dim(rec.shown.flow.cause)} />;
          })}
        </svg>

        {[...prevNodes.current.keys()].map((id) => {
          const b = box(id);
          const o = anim.get(`n:${id}:o`);
          const style = { left: b.x, top: b.y, width: b.w, height: b.h, opacity: o };
          if (id === "c:__more")
            return (
              <div key={id} className="st-more" style={style} aria-hidden="true">
                and {moreCount} more push{moreCount === 1 ? "" : "es"}
              </div>
            );
          if (id === "c:__group")
            return (
              <div key={id} className="st-card st-cause is-lever st-group" style={style} aria-hidden="true">
                <em className="st-yours">Your moves ({levers.length})</em>
              </div>
            );
          if (id.startsWith("c:")) {
            const c = causeById.get(id.slice(2));
            if (!c) return null;
            const quiet = quietOf(c);
            const label = `${c.kind === "lever" ? "Your move: " : ""}${c.title}${c.sub ? `, ${c.sub}` : ""}. ${pushesOf(c) || "No push on your goals yet"}.${quiet ? ` No road drawn this quarter: ${quiet}.` : ""}`;
            if (folded && c.kind === "lever")
              return (
                <div key={id} className={`st-yline${shownSpot === c.id ? " is-spot" : ""}`} style={style} tabIndex={0} role="group" aria-label={label} title={`${c.title}: ${c.sub}`} {...spotProps(c.id)}>
                  <span className="st-blob">
                    <Icon id={c.icon} />
                  </span>
                  <span className="st-yline-text">
                    <b>{leverName(c)}</b>
                    {quiet ? <small className="st-quiet">{quiet}</small> : null}
                  </span>
                </div>
              );
            return <CauseCard key={id} c={c} style={style} isNews={newsShocks.has(c.title)} knock={knockOf(c)} quiet={quiet} label={label} spot={shownSpot === c.id} compact={compact} {...spotProps(c.id)} />;
          }
          if (id.startsWith("h:")) {
            const ch = chanMeta(id.slice(2) as ChannelId);
            return (
              <div key={id} className="st-card st-chan" style={style} aria-hidden="true">
                <span className="st-blob">
                  <Icon id={ch.icon} />
                </span>
                <span className="st-text">
                  <b>{ch.title}</b>
                  {chanFit ? null : <small>{ch.sub}</small>}
                </span>
              </div>
            );
          }
          const oc = story.outcomes.find((x) => x.metric === (id.slice(2) as MetricId));
          if (!oc) return null;
          return <GoalCard key={id} o={oc} anim={anim} T={T} story={story} style={style} fit={fit} compact={compact} status={goalStatus[oc.metric]} quiet={goalQuiet(oc)} />;
        })}

        {flowsShown.map(([id, { shown }]) => {
          const t = anim.get(`f:${id}:t`);
          const draw = anim.get(`f:${id}:d`, 1);
          if (!shown.tag || t < 1 || draw < 0.9) return null;
          const c = causeById.get(shown.flow.cause);
          const o = story.outcomes.find((x) => x.metric === shown.flow.metric)!;
          const total = causeTotal(story, shown.flow.cause, shown.flow.metric, T);
          // The figure as rounded with the goal's other tags, so they add up to the card's change.
          const value = recs.get(o.metric)?.values.get(shown.flow.cause) ?? total;
          const tone = Math.sign(total) === o.good(T) ? "good" : "bad";
          const end = geom(id, shown)[3];
          const fig = pushText(value, shown.flow.metric);
          const word = tagWord(c, o.metric);
          const label = `${c?.title ?? shown.flow.cause}: ${o.label.toLowerCase()} ${amountOf(value, o.metric)}, ${tone === "good" ? "helps" : "hurts"}`;
          return (
            <span
              key={id}
              className={`st-tag is-${tone}${shownSpot === shown.flow.cause ? " is-spot" : ""}`}
              style={{ left: end.x - 4, top: end.y, opacity: Math.min(1, (draw - 0.9) * 10) * dim(shown.flow.cause) }}
              role="img"
              aria-label={label}
              title={label}
            >
              {c ? (
                <span className="st-tag-src" aria-hidden="true">
                  <Icon id={c.icon} />
                  {word ? <span className="st-tag-word">{word}</span> : null}
                </span>
              ) : null}
              {fig}
            </span>
          );
        })}
        {/* Under each goal's tags, what the tags leave of its change, so the figures on show add up: "others ▼ −0.2". */}
        {story.outcomes.map((o) => {
          const text = recs.get(o.metric)?.others;
          if (!text || !drawn.some((d) => d.flow.metric === o.metric)) return null;
          const O = box("o:" + o.metric);
          const two = othersTwo(text);
          return (
            <span key={`others-${o.metric}`} className={`st-others${two ? " is-two" : ""}`} style={{ left: O.x - 4, top: O.y + anim.get(`ft:${o.metric}`) + 3, opacity: anim.get(`n:o:${o.metric}:o`) }} aria-hidden="true">
              others{two ? <br /> : " "}
              {text}
            </span>
          );
        })}
      </div>

      {/* Each cause card laid out once more, hidden, at its column's width: its height as drawn (minH). */}
      <div ref={measureRef} className="st-measure" aria-hidden="true">
        {usedCauseIds.map((id) => {
          const c = causeById.get(id)!;
          if (folded && c.kind === "lever") return null;
          const quiet = quietOf(c);
          const key = `c:${id}|${causeLine(c)}|${quiet ?? ""}|${compact ? 1 : 0}|${Math.round(col.causeW)}`;
          return <CauseCard key={id} c={c} style={{ width: col.causeW }} isNews={newsShocks.has(c.title)} knock={knockOf(c)} quiet={quiet} label="" spot={false} compact={compact} measure={key} />;
        })}
        {story.outcomes.flatMap((o) =>
          [0, 1, 2].map((at) => <GoalCard key={`${o.metric}-${at}`} o={o} anim={anim} T={T} story={story} style={{ width: col.outW }} fit={at} compact={compact} status={goalStatus[o.metric]} quiet={goalQuiet(o)} measure={goalKey(o, at)} />),
        )}
      </div>

      {compact ? null : (
        <p className="st-note" ref={noteRef} style={{ bottom: stripH + 2 }}>
          <span>
            {source}
            {widths ? ` ${widths}` : ""}
          </span>
        </p>
      )}

      <Strip story={story} T={T} cells={cells} anim={anim} onPick={onPick} positioned sentence compact={compact} stripRef={stripRef} />

      <Summary story={story} T={T} drawn={drawn.map((d) => d.flow)} causeById={causeById} hidden={hidden} goalStatus={goalStatus} />
    </div>
  );
}

type Pt = { x: number; y: number };
const f = (v: number) => v.toFixed(1);
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const bez = (p: Pt[], t: number): Pt => {
  const m = 1 - t;
  return { x: m * m * m * p[0].x + 3 * m * m * t * p[1].x + 3 * m * t * t * p[2].x + t * t * t * p[3].x, y: m * m * m * p[0].y + 3 * m * m * t * p[1].y + 3 * m * t * t * p[2].y + t * t * t * p[3].y };
};

/** The key's two words, drawn as the arrow tags are: "helps" outlined, "hurts" filled, so the meaning never rests on colour alone. */
function Key({ tone }: { tone: "good" | "bad" }) {
  return <span className={`st-key is-${tone}`}>{tone === "good" ? "helps" : "hurts"}</span>;
}

/** A short dashed stroke: the mark of a rough road. */
function RoughMark() {
  return (
    <svg className="st-roughmark" viewBox="0 0 22 6" width="22" height="6" aria-hidden="true">
      <path d="M1 3H21" />
    </svg>
  );
}

/** A goal's status as the goals panel shows it: its mark and coloured word, then the figure that decides it. */
function StatusLine({ status }: { status: GoalStatus[MetricId] }) {
  if (!status) return null;
  return (
    <span className="st-goal-status">
      <span className={`game-status is-${status.status}`}>{status.word}</span>
      {status.detail ? <span className="st-goal-status-detail">: {status.detail}</span> : null}
    </span>
  );
}

/** The goal-by-goal list (phones, short or narrow slots): the strip's sentence stays pinned at the foot. */
function ListMap({
  story,
  T,
  quarter,
  when,
  news,
  newsShocks,
  flowsShown,
  causeById,
  anim,
  maxT,
  hidden,
  cells,
  trouble,
  goalStatus,
  onPick,
  scroller,
  reduced,
  drawn,
  width,
}: {
  width: number;
  story: Story;
  T: number;
  quarter: string;
  when: string;
  news: SimEvent[];
  newsShocks: Set<string>;
  flowsShown: [string, { shown: Shown; ports: Ports }][];
  causeById: globalThis.Map<string, Cause>;
  anim: Anim;
  maxT: number;
  hidden: number;
  cells: number[];
  trouble: Trouble;
  goalStatus: GoalStatus;
  onPick: (t: number) => void;
  scroller: React.RefObject<HTMLDivElement | null>;
  reduced: boolean;
  drawn: Flow[];
}) {
  const footRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLElement>(null);
  // Goals still below the fold (under the pinned foot): a "+2 goals below" cue that scrolls to the next one. Only when needed.
  const [below, setBelow] = useState<number[]>([]);
  const [more, setMore] = useState(false);
  // The quarter strip below the fold: a "Quarter by quarter" row above the sentence brings it up.
  const [stripBelow, setStripBelow] = useState(false);
  useEffect(() => {
    const root = scroller.current;
    const foot = footRef.current;
    const listEl = listRef.current;
    if (!root || !foot || !listEl) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const limit = root.scrollTop + root.clientHeight - foot.offsetHeight;
      const goals = [...listEl.querySelectorAll<HTMLElement>(".st-lgoal")];
      const out = goals.map((g, i) => (g.offsetTop + 24 > limit ? i : -1)).filter((i) => i >= 0);
      setBelow((prev) => (prev.join() === out.join() ? prev : out));
      setMore(root.scrollTop + root.clientHeight < root.scrollHeight - 2);
      const strip = stripRef.current;
      setStripBelow(!!strip && strip.offsetTop + Math.min(strip.offsetHeight, 48) > limit);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    root.addEventListener("scroll", queue, { passive: true });
    const ro = new ResizeObserver(queue);
    ro.observe(root);
    ro.observe(listEl);
    return () => {
      root.removeEventListener("scroll", queue);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [scroller]);
  const toNext = () => {
    const root = scroller.current;
    const g = listRef.current?.querySelectorAll<HTMLElement>(".st-lgoal")[below[0]];
    if (root && g) root.scrollTo({ top: Math.max(0, g.offsetTop - 8), behavior: reduced ? "auto" : "smooth" });
  };
  const toStrip = () => {
    const root = scroller.current;
    const strip = stripRef.current;
    const foot = footRef.current;
    if (!root || !strip || !foot) return;
    // The strip's foot just above the pinned sentence (or its top, if it is taller than the room).
    const room = root.clientHeight - foot.offsetHeight;
    const top = strip.offsetHeight + 8 > room ? strip.offsetTop - 8 : strip.offsetTop + strip.offsetHeight + 8 - room;
    root.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
  };
  const tr = story.travel;
  const narrow = width < 480;
  // Goals in trouble first (off track, then at risk), the rest in the mission's order.
  const rank = (m: MetricId) => (trouble[m] === "failed" ? 0 : trouble[m] === "at-risk" ? 1 : 2);
  const goals = [...story.outcomes].sort((a, b) => rank(a.metric) - rank(b.metric));
  const rowsOf = (o: Outcome) => flowsShown.filter(([, rec]) => rec.shown.flow.metric === o.metric).sort((a, b) => Math.abs(b[1].shown.value) - Math.abs(a[1].shown.value));
  // The pushes' figures as the list rounds them, for the island's line.
  const roundedKey = JSON.stringify(
    Object.fromEntries(
      story.outcomes.flatMap((o) => {
        const { top, rec } = listPills(story, o, rowsOf(o), T);
        return top.map(([id], i) => [`${id}|${o.metric}`, rec.values[i]]);
      }),
    ),
  );
  useEffect(() => useStoryShown.setState({ rounded: JSON.parse(roundedKey) }), [roundedKey]);
  return (
    <div className="st-map is-v">
      <header className="st-head">
        <p className="st-title">
          Why it moves <span className="st-title-q">· {quarter}</span>
        </p>
        {narrow ? (
          <p className="st-hint">
            Since {story.labels[0]}, in pp · <Key tone="good" /> <Key tone="bad" /> · tap a goal
          </p>
        ) : (
          <p className="st-hint">
            {when[0].toUpperCase() + when.slice(1)}. Pushes since {story.labels[0]}, in pp: <b>▲</b> up, <b>▼</b> down; <Key tone="good" /> or <Key tone="bad" /> your goal. Tap a goal for every push.
          </p>
        )}
        {/* Phones: a shock that is one of the causes is marked "new" beside its push; only other news takes a line. */}
        <NewsLine news={narrow ? news.filter((e) => !(e.kind === "shock" && story.causes.some((c) => c.title === e.title))) : news} label={story.labels[story.clock] ?? ""} />
      </header>
      <div ref={listRef} className="st-list">
        {goals.map((o) => (
          <ListGoal
            key={o.metric}
            o={o}
            rows={rowsOf(o)}
            anim={anim}
            T={T}
            story={story}
            causeById={causeById}
            trouble={trouble[o.metric]}
            status={goalStatus[o.metric]}
            newsShocks={newsShocks}
            maxT={maxT}
          />
        ))}
        {hidden > 0 ? (
          <p className="st-lmore">
            And {hidden} more push{hidden === 1 ? "" : "es"}, not shown.
          </p>
        ) : null}
      </div>
      <Strip story={story} T={T} cells={cells} anim={anim} onPick={onPick} positioned={false} sentence={false} compact={false} stripRef={stripRef} />
      <div ref={footRef} className={`st-foot${more ? " has-more" : ""}${below.length || stripBelow ? " has-cue" : ""}${below.length && stripBelow ? " has-two" : ""}`}>
        {below.length ? (
          <button type="button" className="st-foot-more" onClick={toNext}>
            +{below.length} goal{below.length === 1 ? "" : "s"} below <span aria-hidden="true">↓</span>
          </button>
        ) : null}
        {/* The quarter strip below the fold: on the foot's rule, as the goals' cue is. */}
        {stripBelow ? (
          <button type="button" className="st-foot-more st-foot-strip" onClick={toStrip}>
            <span aria-hidden="true">▾</span> Quarter by quarter
          </button>
        ) : null}
        <p>
          {tr && narrow ? (
            <>
              <b>When {tr.lever === "Your moves" || tr.lever === "Your earlier moves" ? `do ${tr.lever.toLowerCase()}` : `does ${tr.lever.replace(/^Your /, "your ")}`} land?</b> {tr.steps[0].toUpperCase() + tr.steps.slice(1)}
            </>
          ) : (
            <>
              <b>When does it land?</b> {tr ? tr.sentence : "Move a lever: the quarter-by-quarter strip below shows when its effect arrives."}
            </>
          )}
        </p>
      </div>
      <Summary story={story} T={T} drawn={drawn} causeById={causeById} hidden={hidden} goalStatus={goalStatus} />
    </div>
  );
}

/** The quarter's news in one line under the map's header (the island view shows the same as toasts). */
function NewsLine({ news, label }: { news: SimEvent[]; label: string }) {
  if (!news.length) return null;
  const text = news.map((e) => `${e.title}: ${e.detail}`).join(" · ");
  const bad = news.some((e) => e.severity === "bad");
  const good = !bad && news.some((e) => e.severity === "good");
  return (
    <p className={`st-news${bad ? " is-bad" : good ? " is-good" : ""}`} title={text} aria-hidden="true">
      <b className="st-news-key">News, {label}</b> <span>{text}</span>
    </p>
  );
}

type SpotHandlers = { onMouseEnter: () => void; onMouseLeave: () => void; onFocus: () => void; onBlur: () => void };

/**
 * The small line over a cause's name: whose it is, or when it started. A compact map drops it: the
 * player's own cards say "Your …" in their names and wear a dark border, the news line under the
 * header names the quarter's shock, and a shock's name says what it is.
 */
function causeEm(c: Cause, isNews: boolean, compact: boolean): string | null {
  if (compact) return null;
  if (c.kind === "lever") return "Your move";
  if (isNews) return "News this quarter";
  if (c.from) return `Shock, from ${c.from}`;
  return null;
}

/**
 * A cause's card: focusable, so hovering or focusing it picks out its roads (the others dim). `quiet`: a lever
 * with no road drawn this quarter says why. `measure`: the hidden copy laid out to measure the card's height.
 */
function CauseCard({
  c,
  style,
  isNews,
  knock,
  quiet,
  label,
  spot,
  compact,
  measure,
  ...on
}: { c: Cause; style: React.CSSProperties; isNews: boolean; knock: string | null; quiet: string | null; label: string; spot: boolean; compact: boolean; measure?: string } & Partial<SpotHandlers>) {
  const em = causeEm(c, isNews, compact);
  const own = measure ? { "data-measure": measure } : { tabIndex: 0, role: "group", "aria-label": label };
  return (
    <div className={`st-card st-cause is-${c.kind}${spot ? " is-spot" : ""}`} style={style} {...own} {...on}>
      <span className="st-blob" aria-hidden="true">
        <Icon id={c.icon} />
      </span>
      <span className="st-text" aria-hidden="true">
        {em ? <em className={`st-yours${isNews && c.kind !== "lever" ? " is-news" : ""}`}>{em}</em> : null}
        <b>{c.title}</b>
        <small>
          {c.sub}
          {c.note ? ` · ${c.note}` : ""}
          {knock ? <b className="st-knock">, {knock}</b> : null}
        </small>
        {quiet ? <small className="st-quiet">{quiet}</small> : null}
      </span>
    </div>
  );
}

const unitOf = (o: Outcome) => (o.unit === "%" ? "%" : o.unit === "bp" ? " bp" : o.unit === "months" ? " mo" : "%");
/**
 * "▲ +1.6 since 2025Q4", or "no change since 2025Q4": the figure on show less the start as it is written
 * elsewhere, both rounded first, so the big number, this line and the start always reconcile, mid-count too.
 * `from` null: the figure alone ("▲ +1.6"), for a compact card.
 */
function sinceText(o: Outcome, v: number, from: string | null) {
  const delta = Number(v.toFixed(o.digits)) - Number(o.path[0].toFixed(o.digits));
  const s = signed(delta, o.digits);
  const tail = from ? ` since ${from}` : "";
  return s === (0).toFixed(o.digits) ? `no change${tail}` : `${delta > 0 ? "▲" : "▼"} ${s}${tail}`;
}

/**
 * `fit`: 0 shows every line; 1 drops the goal line; 2 also drops "without your moves" (short slots).
 * "Without your moves" always has its line, "same" before any move, so the column never jumps when it appears.
 * The status line (as the goals panel says it) always shows. Compact: the figure sits beside the goal's name,
 * and the change drops "since 2025Q4". `quiet`: no push on the goal is worth a tag.
 */
function GoalCard({
  o,
  anim,
  T,
  story,
  style,
  fit,
  compact,
  status,
  quiet,
  measure,
}: {
  o: Outcome;
  anim: Anim;
  T: number;
  story: Story;
  style: React.CSSProperties;
  fit: number;
  compact: boolean;
  status: GoalStatus[MetricId];
  quiet: string | null;
  /** The hidden copy laid out to measure the card's height: its figures settled, not counting. */
  measure?: string;
}) {
  const v = measure ? o.path[T] : anim.get(`v:${o.metric}`, o.path[T]);
  const unit = unitOf(o);
  const g = o.ghost ? (measure ? o.ghost[T] : anim.get(`g:${o.metric}`, o.ghost[T])) : null;
  const value = (
    <span className="st-goal-value">
      {v.toFixed(o.digits)}
      <small>{unit}</small>
    </span>
  );
  return (
    <div className={`st-card st-goal${o.goal ? "" : " is-watch"}${compact ? " is-compact" : ""}`} style={style} aria-hidden="true" data-measure={measure}>
      <span className="st-goal-head">
        <span className="st-blob">
          <Icon id={o.metric} />
        </span>
        <b>{o.label}</b>
        {compact ? value : null}
      </span>
      {compact ? null : value}
      <span className="st-goal-line">{sinceText(o, v, compact ? null : story.labels[0])}</span>
      <StatusLine status={status} />
      {quiet ? <span className="st-goal-line is-plain">{quiet}</span> : null}
      {fit < 2 ? (
        <span className="st-goal-line is-quiet">
          without your moves: {g !== null ? `${g.toFixed(o.digits)}${unit}` : "same"}
        </span>
      ) : null}
      {fit < 1 ? <span className="st-goal-line is-quiet">{o.goal ?? "not a mission goal: one to watch"}</span> : null}
    </div>
  );
}

/**
 * One goal in the list: a single line (the figure, its change, whether it is in trouble) and its two
 * biggest pushes, with the player's own as a third when it is not one of them, each a cause's whole push
 * (all its roads, drawn or not), and "others" for the rest, so the figures add up to the change; a tap
 * opens every push with its road and a bar.
 */
function ListGoal({
  o,
  rows,
  anim,
  T,
  story,
  causeById,
  trouble,
  status,
  newsShocks,
  maxT,
}: {
  o: Outcome;
  rows: [string, { shown: Shown; ports: Ports }][];
  anim: Anim;
  T: number;
  story: Story;
  causeById: globalThis.Map<string, Cause>;
  trouble?: "at-risk" | "failed";
  status: GoalStatus[MetricId];
  newsShocks: Set<string>;
  maxT: number;
}) {
  const [open, setOpen] = useState(false);
  const v = anim.get(`v:${o.metric}`, o.path[T]);
  const delta = Number(v.toFixed(o.digits)) - Number(o.path[0].toFixed(o.digits));
  const { top, rec, shown } = listPills(story, o, rows, T);
  const others = top.length ? othersText(rec, o.metric, o.digits) : null;
  const tone = (x: number) => (!matters(x, o.metric) ? "tiny" : Math.sign(x) === o.good(T) ? "good" : "bad");
  const id = `st-lgoal-${o.metric}`;
  return (
    <div className={`st-lgoal${trouble ? ` is-${trouble}` : ""}${open ? " is-open" : ""}${o.goal ? "" : " is-watch"}`}>
      <button type="button" className="st-lhead" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((x) => !x)}>
        <span className="st-lline">
          <span className="st-blob">
            <Icon id={o.metric} />
          </span>
          <b className="st-lname">{o.label}</b>
          <span className="st-lvalue">
            {v.toFixed(o.digits)}
            {unitOf(o)}
          </span>
          <small className="st-ldelta">{signed(delta, o.digits) === (0).toFixed(o.digits) ? "no change" : `${delta > 0 ? "▲" : "▼"} ${signed(delta, o.digits)}`}</small>
          {trouble ? <span className={`st-lstatus is-${trouble}`}>{trouble === "failed" ? "off track" : "at risk"}</span> : o.goal ? null : <em className="st-watch">to watch</em>}
          <span className="st-lchev" aria-hidden="true">
            {open ? "▴" : "▾"}
          </span>
        </span>
        {top.length ? (
          <span className="st-lsum">
            {top.map(([cid, value], i) => {
              const c = causeById.get(cid);
              return (
                <span key={cid} className="st-lsum-part">
                  {i ? <span className="st-lsep"> · </span> : null}
                  {c ? short(c) : cid}
                  {c && newsShocks.has(c.title) ? <em className="st-lnew"> new</em> : null} <span className={`st-ltag is-${tone(value)}`}>{pushText(rec.values[i], o.metric)}</span>
                </span>
              );
            })}
            {others ? (
              <span className="st-lsum-part st-lothers">
                <span className="st-lsep"> · </span>others {others}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="st-lsum is-plain">{shown !== 0 ? `small pushes ${othersText(rec, o.metric, o.digits) ?? ""}` : "no push to speak of yet"}</span>
        )}
      </button>
      {open ? (
        <div id={id} className="st-lrows">
          {rows.map(([fid, { shown: sh }]) => {
            const c = causeById.get(sh.flow.cause);
            const ch = channelMeta(sh.flow.channel, isBust(c));
            const t = anim.get(`f:${fid}:t`);
            return (
              <div key={fid} className={`st-lrow${sh.lever ? " is-lever" : ""}`}>
                <span className="st-blob">{c ? <Icon id={c.icon} /> : null}</span>
                <span className="st-ltext">
                  <b>{c?.title}</b>{" "}
                  <small>
                    through {ch.title.toLowerCase()}
                    {sh.flow.approx ? " (roughly)" : ""}
                  </small>
                </span>
                <span className="st-lbar">
                  <i className={`is-${sh.tone}${sh.flow.approx ? " is-rough" : ""}`} style={{ width: `${Math.max(8, (Math.max(t, 2.5) / maxT) * 100)}%` }} />
                </span>
                <span className={`st-ltag is-${sh.tone}`}>{pushText(sh.value, sh.flow.metric)}</span>
              </div>
            );
          })}
          <p className="st-lfoot">
            {status ? `${statusText(status)} · ` : ""}
            {story.labels[T]} against {story.labels[0]}
            {o.goal ? ` · ${o.goal}` : " · not a mission goal"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A goal's pushes in the list: its two biggest worth a word, by size, whoever's they are; the player's own biggest
 * as a third when it is not one of them (a tiny one is shown plain); each rounded so that they and "others" add up
 * to the change the row shows.
 */
function listPills(story: Story, o: Outcome, rows: [string, { shown: Shown; ports: Ports }][], T: number) {
  const byCause = new globalThis.Map<string, number>();
  for (const [, { shown: sh }] of rows) if (!byCause.has(sh.flow.cause)) byCause.set(sh.flow.cause, causeTotal(story, sh.flow.cause, o.metric, T));
  const ranked = [...byCause.entries()].filter(([, x]) => matters(x, o.metric)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top = ranked.slice(0, 2);
  // Nothing worth a word on this goal: no pill at all ("no push to speak of yet").
  const lever = !top.length
    ? undefined
    : story.causes
    .filter((c) => c.kind === "lever")
    .map((c) => [c.id, causeTotal(story, c.id, o.metric, T)] as [string, number])
    .filter(([, x]) => Math.abs(x) >= 0.005)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  if (lever && !top.some(([id]) => id === lever[0])) top.push(lever);
  const change = o.path[T] - o.path[0];
  const shown = Number(o.path[T].toFixed(o.digits)) - Number(o.path[0].toFixed(o.digits));
  const rec = reconcile(
    top.map(([, x]) => x),
    change,
    shown,
    o.metric,
    o.digits,
  );
  return { top, rec, shown };
}

/** A cause's name for the one-line summary, shortened where long: "Own drift", "Reforms and support". */
function short(c: Cause): string {
  if (c.kind === "momentum") return "Own drift";
  return c.title.length > 18 ? c.title.replace(/^Your /, "").replace(/^\w/, (x) => x.toUpperCase()) : c.title;
}

type Cell = { t: number } | { hide: number[] };

/**
 * The quarter strip. Every cell shows whole or not at all: when the quarters do not fit at their
 * least width, the ones that answer "when" stay (last, deciding, the next one or two, the
 * sentence's midpoint, the goal date, and the one picked), and each run between them folds into a
 * "…" cell that names the quarters it hides and shows the middle one when picked. The row names
 * keep their column from the first render (before any move, the goals' names alone), so the cells
 * never jump when the first move lands.
 */
function Strip({
  story,
  T,
  cells,
  anim,
  onPick,
  positioned,
  sentence,
  compact,
  stripRef,
}: {
  story: Story;
  T: number;
  cells: number[];
  anim: Anim;
  onPick: (t: number) => void;
  positioned: boolean;
  sentence: boolean;
  compact: boolean;
  stripRef?: React.RefObject<HTMLElement | null>;
}) {
  const tr = story.travel;
  const trackRef = useRef<HTMLSpanElement>(null);
  const [room, setRoom] = useState<{ w: number; rem: number } | null>(null);
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const read = () => {
      const w = el.clientWidth;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setRoom((p) => (p && p.w === w && p.rem === rem ? p : { w, rem }));
    };
    read();
    const ro = new ResizeObserver(() => flushSync(read));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const deciding = story.clock + 1;
  const mid = Math.min(story.end, story.clock + 4);
  // One name for the quarter everywhere: "deciding" is the quarter being decided (the map's "2026Q1, the quarter you are deciding").
  const tag = (t: number) => (t === story.clock ? "last" : t === deciding ? "deciding" : t === story.end ? "goal date" : "");
  const word = (tone: "good" | "bad") => (tone === "good" ? "helps" : "hurts");
  // A cell's tone: helps or hurts when the push is worth a word (0.05 pp, 5 bp); smaller ones are plain ("tiny").
  const cellTone = (v: number, o: Outcome, t: number): "flat" | "tiny" | "good" | "bad" => (Math.abs(v) < 0.005 ? "flat" : !matters(v, o.metric) ? "tiny" : Math.sign(v) === o.good(t) ? "good" : "bad");
  // Each row on its own scale; the zero line sits where the row's values need it (top: only down; bottom: only up; middle: both).
  // Every row's name says helps or hurts: one word when every push worth a word does the same, "hurts, then helps"
  // when it changes sides (the deciding and goal-date cells then say it by their number too).
  const rows = tr
    ? tr.diffs.map((d) => {
        const o = story.outcomes.find((x) => x.metric === d.metric)!;
        const vals = cells.map((t) => d.values[t] ?? 0);
        const up = vals.some((v) => v > 0.005);
        const down = vals.some((v) => v < -0.005);
        const seq: ("good" | "bad")[] = [];
        for (const t of cells) {
          const tn = cellTone(d.values[t] ?? 0, o, t);
          if ((tn === "good" || tn === "bad") && seq[seq.length - 1] !== tn) seq.push(tn);
        }
        return { d, o, zero: up && down ? 0.5 : down ? 0 : 1, seq, mixed: new Set(seq).size > 1 };
      })
    : [];
  // Before any move: the goals' names in the same column, so the cells keep their place when the first move lands.
  const ghostRows = tr ? [] : story.outcomes.filter((o) => o.goal).slice(0, 2);
  const mixed = rows.some((row) => row.mixed);
  const sayAt = (t: number) => mixed && (t === deciding || t === story.end);
  // A cell whose figures need two decimals ("−0.07") is a little wider, so no figure runs into the next cell.
  const fine = (t: number) =>
    rows.some((row) => {
      const v = Math.abs(row.d.values[t] ?? 0);
      return v >= 0.005 && v < 0.095;
    });
  // The row names' column, as wide from the first render as it will be with its words ("Inflation hurts, then helps" at most).
  const keyChars = Math.max(0, ...story.outcomes.filter((o) => o.goal).map((o) => o.label.length + (o.unit === "%" ? 0 : 3)));

  // Which quarters show whole; the rest fold into "…" cells.
  let show = new Set(cells);
  let scrolls = false;
  if (room) {
    const cellW = 3.6 * room.rem;
    const wideW = 6.4 * room.rem;
    const tagW = 4.6 * room.rem;
    const fineW = 4.3 * room.rem;
    const gapW = 1.9 * room.rem;
    const gap = 4;
    const fits = (set: Set<number>) => {
      let w = 0;
      let n = 0;
      let inGap = false;
      for (const t of cells) {
        if (set.has(t)) {
          w += sayAt(t) ? wideW : Math.max(t === deciding || t === story.end ? tagW : cellW, fine(t) ? fineW : cellW);
          n += 1;
          inGap = false;
        } else if (!inGap) {
          w += gapW;
          n += 1;
          inGap = true;
        }
      }
      return w + gap * Math.max(0, n - 1) <= room.w + 0.5;
    };
    if (!fits(show)) {
      const near = [...cells].sort((a, b) => Math.abs(a - deciding) - Math.abs(b - deciding) || a - b);
      const prio = [T, deciding, story.end, story.clock, deciding + 1, mid, deciding + 2, ...near].filter((t, i, a) => cells.includes(t) && a.indexOf(t) === i);
      show = new Set();
      for (const t of prio) {
        const next = new Set(show).add(t);
        if (fits(next)) show = next;
      }
      if (!show.size) {
        show = new Set([T]);
        scrolls = true;
      }
    }
  }
  const items: Cell[] = [];
  for (const t of cells) {
    if (show.has(t)) items.push({ t });
    else {
      const last = items[items.length - 1];
      if (last && "hide" in last) last.hide.push(t);
      else items.push({ hide: [t] });
    }
  }
  const unitShared = tr ? new Set(rows.map((row) => unitWord(row.d.metric))).size === 1 : new Set(ghostRows.map((o) => unitWord(o.metric))).size <= 1;
  const unitText = tr ? (unitShared && rows.length ? `in ${unitWord(rows[0].d.metric).trim()}` : "") : unitShared && ghostRows.length ? `in ${unitWord(ghostRows[0].metric).trim()}` : "";
  return (
    <section
      ref={stripRef}
      className={`st-strip${positioned ? "" : " is-static"}${compact ? " is-compact" : ""}`}
      style={positioned ? { bottom: 0 } : undefined}
      aria-label="When effects land: pick a quarter to show on the map"
    >
      <p className="st-strip-head">
        <b>{sentence ? "When does it land?" : "Quarter by quarter"}</b>{" "}
        <span>{sentence ? (tr ? tr.sentence : "Move a lever: this strip shows, quarter by quarter, when its effect arrives.") : tr ? "your moves' effect, as it builds. Pick a quarter to show it above." : "pick a quarter to show it above."}</span>
      </p>
      <div className="st-cells" role="group" aria-label="Quarter shown on the map">
        <span className="st-rowkeys" aria-hidden="true" style={tr || positioned ? { minWidth: `calc(${(keyChars * 0.56).toFixed(2)}em + ${mixed ? 8.6 : 3.4}em)` } : undefined}>
          {/* The unit once, on the quarters' line, when the rows share it ("in pp"); otherwise beside each row. */}
          <small className="st-rowkeys-unit">{unitText}</small>
          {tr
            ? rows.map((row) => (
                <span key={row.d.metric}>
                  {row.o.label}
                  {!unitShared ? <small> {unitWord(row.d.metric).trim()}</small> : null}
                  {row.seq.length ? (
                    row.seq.map((tn, i) => (
                      <span key={i} className="st-rowtone-part">
                        {i ? <small className="st-rowtone-then">then</small> : null}
                        <span className={`st-key st-rowtone is-${tn}`}>{word(tn)}</span>
                      </span>
                    ))
                  ) : (
                    <small className="st-rowtone-tiny">tiny</small>
                  )}
                </span>
              ))
            : positioned
              ? ghostRows.map((o) => (
                  <span key={o.metric}>
                    {o.label}
                    {!unitShared ? <small> {unitWord(o.metric).trim()}</small> : null}
                  </span>
                ))
              : null}
        </span>
        <span ref={trackRef} className={`st-cells-track${scrolls ? " is-scroll" : ""}`}>
          {items.map((item) => {
            if ("hide" in item) {
              const pickT = item.hide[Math.floor((item.hide.length - 1) / 2)];
              const names = item.hide.map((t) => story.labels[t]).join(", ");
              const label = `Quarters not shown here: ${names}. Show ${story.labels[pickT]} on the map`;
              return (
                <button key={`gap-${item.hide[0]}`} type="button" className="st-cell is-gap" onClick={() => onPick(pickT)} title={label} aria-label={label}>
                  <span aria-hidden="true">…</span>
                </button>
              );
            }
            const t = item.t;
            return (
              <button key={t} type="button" className={`st-cell${t === T ? " is-on" : ""}${sayAt(t) ? " is-wide" : t === deciding || t === story.end ? " is-tagged" : ""}${fine(t) ? " is-fine" : ""}`} aria-pressed={t === T} onClick={() => onPick(t)} title={`Show ${story.labels[t]} on the map`}>
                <span className="st-cell-q">{shortQ(story.labels[t])}</span>
                {/* Before any move, two rows held empty, so the strip keeps its height when the first move lands. */}
                {!tr && positioned ? [0, 1].map((i) => <span key={i} className="st-bar is-ghost" aria-hidden="true" />) : null}
                {rows.map(({ d, o, zero, mixed: rowMixed }) => {
                  const h = anim.get(`b:${d.metric}:${t}`);
                  const v = d.values[t] ?? 0;
                  const tone = cellTone(v, o, t);
                  const flat = tone === "flat";
                  const span = zero === 0.5 ? 50 : 100;
                  const size = flat ? 0 : Math.max(0.08, Math.min(1, Math.abs(h))) * span;
                  const bar: React.CSSProperties = h >= 0 ? { bottom: `${(1 - zero) * 100}%`, height: `max(5px, ${size.toFixed(1)}%)` } : { top: `${zero * 100}%`, height: `max(5px, ${size.toFixed(1)}%)` };
                  const num = flat ? "0" : signed(v, Math.abs(v) < 0.095 ? 2 : 1);
                  const said = tone === "good" || tone === "bad" ? `, ${word(tone)}` : tone === "tiny" ? ", too small to matter" : "";
                  return (
                    <span key={d.metric} className={`st-bar is-${tone}`} role="img" aria-label={`${o.label} ${signed(v, 2)}${unitWord(d.metric)} from your moves${said}`}>
                      <span className="st-bar-zone">
                        <span className="st-bar-zero" style={{ top: `${zero * 100}%` }} />
                        {flat ? null : <i style={bar} />}
                      </span>
                      <em>
                        {num}
                        {rowMixed && (tone === "good" || tone === "bad") && sayAt(t) ? <small> {word(tone)}</small> : null}
                      </em>
                    </span>
                  );
                })}
                <span className="st-cell-tag">{tag(t)}</span>
              </button>
            );
          })}
        </span>
      </div>
    </section>
  );
}

const shortQ = (label: string | undefined) => (label ? `Q${label.slice(5)} ’${label.slice(2, 4)}` : "");

/** The same story in words, for screen readers (the drawing itself is hidden from them): each cause's whole push on each goal. */
function Summary({ story, T, drawn, causeById, hidden, goalStatus }: { story: Story; T: number; drawn: Flow[]; causeById: globalThis.Map<string, Cause>; hidden: number; goalStatus: GoalStatus }) {
  const lines = story.outcomes.map((o) => {
    const causes = [...new Set(drawn.filter((fl) => fl.metric === o.metric).map((fl) => fl.cause))];
    const parts = causes.map((c) => {
      const via = drawn.filter((fl) => fl.metric === o.metric && fl.cause === c);
      const cause = causeById.get(c);
      return `${cause?.title ?? c} ${signed(causeTotal(story, c, o.metric, T), 2)}${unitWord(o.metric)} through ${via.map((fl) => `${channelMeta(fl.channel, isBust(cause)).title.toLowerCase()}${fl.approx ? " (roughly)" : ""}`).join(" and ")}`;
    });
    const st = statusText(goalStatus[o.metric]);
    return `${o.label} ${o.path[T].toFixed(o.digits)} in ${story.labels[T]}${st ? ` (${st})` : ""}${parts.length ? `: ${parts.join("; ")}` : ": no push to speak of yet"}.`;
  });
  return (
    <div className="sr-only">
      <p>
        Cause and effect map for {story.labels[T]}, pushes since {story.labels[0]}. {lines.join(" ")} {hidden ? `${hidden} more pushes are not drawn.` : ""}
      </p>
      {story.travel ? <p>{story.travel.sentence}</p> : null}
    </div>
  );
}
