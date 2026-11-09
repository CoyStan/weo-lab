"use client";

// "Cause and effect": a living causal map of the quarter. Causes (shocks, the
// economy's own drift, the player's levers) on the left, the roads they travel
// in the middle, where they land (the mission's goals) on the right. Each arrow
// is one piece of the game's shocks-vs-policy decomposition (decompose.ts), on
// the road the model's own drivers say it took (routes.ts); a road the drivers
// cannot vouch for is dashed and marked "roughly". Its width is how hard it
// pushes, its tag says which way and by how much. A quarter strip underneath
// picks the moment shown and shows the player's own change still travelling
// (forecast against "had you changed nothing").
//
// Two layouts: the map (columns) when the slot has the room, and a goal-by-goal
// list when it is narrow (phones) or short (small laptops): the goals in trouble
// first, each one line with its two biggest pushes, opened with a tap. On big
// screens the map is drawn at laptop size and scaled up as one piece, so a TV
// shows the same picture, larger, rather than bigger empty cards.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { decompose } from "../../game/decompose";
import { channels, policyTouched, untouchedConfig, type FrameworkInput } from "../../game/framework";
import { knownConfig, policyForTurn } from "../../game/missions";
import { forecastFor, useGame } from "../../game/store";
import { useTurn } from "../../game/useTurn";
import { useReducedMotion } from "../../game/ui/useTween";
import type { SimEvent } from "../../model/types";
import { useReducedMotionFlag } from "../../scene/useSmooth";
import { Anim } from "./anim";
import { Icon } from "./icons";
import { columns, layout, type Box, type LFlow, type Mode, type Ports } from "./placement";
import { buildStory, CHANNEL_ORDER, CHANNELS, drawnAt, maxPush, pushText, signed, unitWord, type Cause, type ChannelId, type Drawn, type Flow, type MetricId, type Outcome, type Story } from "./model";
import { roads } from "./routes";
import { useStoryShown } from "./shown";
import "./story.css";

type Shown = { flow: Flow; value: number; tone: "good" | "bad"; lever: boolean };
type Dot = { flow: string; t0: number; dur: number };
type Trouble = Partial<Record<MetricId, "at-risk" | "failed">>;

const HEAD_H = 52;
/** The quarter's news, one line under the header. */
const NEWS_H = 22;
const COLHEAD_H = 22;
/** "Sizes and roads come from the model": one line between the map and the strip. */
const NOTE_H = 22;
const STRIP_H = 156;
const MAX_ARROWS = 10;
/** The goal-by-goal list folds each goal to its top two pushes, so it can carry more. */
const MAX_ARROWS_V = 14;
/** The map's design size at a 16 px root: smaller slots get the list, larger ones scale the map up. */
const BASE_W = 770;
const BASE_H = 660;
/** Below this the columns cannot hold three goal cards, the strip and the headers: the list instead. */
const MAP_MIN_H = 560;
const MAP_MIN_W = 560;

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
  // Goals in trouble, from the same statuses the goals panel shows: the list puts them first.
  const trouble = useMemo(() => {
    const out: Trouble = {};
    for (const o of mission?.objectives ?? []) {
      const st = statuses[o.id];
      if (o.bonus || (st !== "at-risk" && st !== "failed")) continue;
      if (out[o.metric as MetricId] !== "failed") out[o.metric as MetricId] = st;
    }
    return out;
  }, [mission, statuses]);

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

  // The cards drop in once the briefing and shock card are out of the way, so the entrance is seen.
  const modal = useGame((s) => s.modal);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!modal && !seen) setSeen(true);
  }, [modal, seen]);
  const T = Math.max(story.first, Math.min(end, pick && pick.clock === clock ? pick.t : clock + 1));
  const list = size.W > 0 && (size.W < MAP_MIN_W || size.H < MAP_MIN_H);
  // The map drawn at its design size and scaled up as one piece; capped so a laptop never shows text over 40 px.
  const scale = list ? 1 : Math.max(1, Math.min(size.wide ? 2.2 : 1.3, size.W / (BASE_W * size.r), size.H / (BASE_H * size.r)));
  // The island view names the map's biggest pushes in one line: it reads this story, at this quarter.
  useEffect(() => useStoryShown.setState({ story, T, max: list ? MAX_ARROWS_V : MAX_ARROWS, list }), [story, T, list]);
  useEffect(() => () => useStoryShown.setState({ story: null, list: false }), []);

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
          news={news}
          trouble={trouble}
          scroller={rootRef}
          reduced={reduced}
          policySig={`${clock}|${JSON.stringify(policy)}`}
          onPick={(t) => setPick({ clock, t })}
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
  news: SimEvent[];
  trouble: Trouble;
  scroller: React.RefObject<HTMLDivElement | null>;
  reduced: boolean;
  policySig: string;
  onPick: (t: number) => void;
};

function StoryMap({ story, T, W, H, s, r, list, news, trouble, scroller, reduced, policySig, onPick }: MapProps) {
  const mode: Mode = list ? "v" : "h";
  const u = mode === "h" ? Math.max(1, Math.min(1.8, Math.min(W / (BASE_W * r), H / (BASE_H * r)))) : 1;
  const anim = useRef(new Anim()).current;
  anim.instant = reduced;
  const intro = useRef(true);
  const dots = useRef<Dot[]>([]);
  const [, setFrame] = useState(0);

  const causeById = useMemo(() => new globalThis.Map(story.causes.map((c) => [c.id, c])), [story.causes]);
  const isLever = (id: string) => causeById.get(id)?.kind === "lever";

  // What to draw at T, and how wide: one scale for every quarter, so arrows grow as effects build.
  const { drawn, hidden } = drawnAt(story, T, mode === "h" ? MAX_ARROWS : MAX_ARROWS_V);
  const maxT = (mode === "h" ? 30 : 18) * u;
  const k = maxT / maxPush(story);
  const thick = (n: number) => Math.max(2.5, Math.min(maxT, n * k));

  // Stable order: causes and channels in the order they first matter over the whole horizon.
  const causeOrder = useMemo(() => {
    const kindRank = { shock: 0, history: 1, momentum: 2, lever: 3 } as const;
    return [...story.causes].sort((a, b) => kindRank[a.kind] - kindRank[b.kind]).map((c) => c.id);
  }, [story.causes]);
  const usedCauses = causeOrder.filter((id) => drawn.some((d) => d.flow.cause === id));
  const usedChannels = CHANNEL_ORDER.filter((id) => drawn.some((d) => d.flow.channel === id));
  const outcomes = story.outcomes.map((o) => o.metric);
  const lflows: LFlow[] = drawn.map((d) => ({ id: d.flow.id, cause: d.flow.cause, channel: d.flow.channel, metric: d.flow.metric, thick: thick(d.n) }));
  const headH = mode === "h" ? HEAD_H + (news.length ? NEWS_H : 0) : 74;
  const mapTop = headH + (mode === "h" ? COLHEAD_H : 18);
  const mapH = Math.max(220, H - mapTop - NOTE_H - STRIP_H - 8);
  const newsShocks = new Set(news.filter((e) => e.kind === "shock").map((e) => e.title));
  // A shock card whose description names a goal ("Inflation +2 pp") also gives its total on that goal, with knock-ons (all its roads).
  const knockOf = (c: Cause) => {
    if (!c.names || !drawn.some((x) => x.flow.cause === c.id && x.flow.metric === c.names)) return null;
    const v = story.flows.filter((f) => f.cause === c.id && f.metric === c.names).reduce((a, f) => a + (f.values[T] ?? 0), 0);
    return `${signed(v, 1)}${unitWord(c.names)} with knock-ons`;
  };
  // Some arrow on show takes a road the drivers cannot vouch for: the column head and the note say so.
  const rough = drawn.some((d) => d.flow.approx);
  // Card heights from their text, so no line runs out of its card (Figtree: about half an em a character).
  const col = columns(W, u);
  const px = 14 * r;
  const lineH = 17.5 * r;
  const lines = (text: string, avail: number, bold = false) => Math.max(1, Math.ceil((text.length * px * (bold ? 0.56 : 0.5)) / Math.max(40, avail)));
  const minH = (id: string) => {
    if (id.startsWith("c:")) {
      const c = causeById.get(id.slice(2));
      if (!c) return 0;
      const avail = col.causeW - 3 - 19 * r - 32 * r - 8 * r;
      let n = lines(c.title, avail, true) + lines(c.sub + (c.note ? ` · ${c.note}` : "") + (knockOf(c) ? " → +2.4 pp with knock-ons" : ""), avail);
      if (c.kind === "lever" || c.from) n += 1;
      return 15 * r + n * lineH;
    }
    if (id.startsWith("h:")) {
      const ch = CHANNELS.find((x) => x.id === id.slice(2));
      if (!ch) return 0;
      const avail = col.chanW - 3 - 16 * r - 26 * r - 6 * r;
      return 13 * r + (lines(ch.title, avail, true) + lines(ch.sub, avail)) * lineH;
    }
    const o = story.outcomes.find((x) => x.metric === id.slice(2));
    if (!o) return 0;
    const avail = col.outW - 3 - 22 * r;
    const n = 1 + (o.ghost && fit < 2 ? 1 : 0) + (fit < 1 ? lines(o.goal ?? "not a mission goal: one to watch", avail) : 0);
    return 18 * r + 27 * r + 32 * r + n * lineH;
  };
  // A short slot: goal cards drop their goal line (the goals column beside says it), then the "without your
  // moves" line; the "more pushes" note moves into the column head. Nothing runs under the strip.
  let fit = 0;
  let fold = false;
  const run = () => layout({ mode, W, top: mapTop, H: mapH, causes: hidden > 0 && mode === "h" && !fold ? [...usedCauses, "__more"] : usedCauses, channels: usedChannels, outcomes, flows: lflows, u, minH });
  let lay = run();
  // (The "more pushes" note is drawn as a 30 px line in the middle of its slot.)
  const over = (prefix: string) => [...lay.nodes].some(([id, b]) => id.startsWith(prefix) && (id === "c:__more" ? b.y + b.h / 2 + 15 : b.y + b.h) > mapTop + mapH + 1);
  while (mode === "h" && fit < 2 && over("o:")) {
    fit += 1;
    lay = run();
  }
  if (mode === "h" && hidden > 0 && over("c:")) {
    fold = true;
    lay = run();
  }
  const causeIds = hidden > 0 && mode === "h" && !fold ? [...usedCauses, "__more"] : usedCauses;
  if (hidden > 0 && mode === "h") {
    // The "more pushes" note is a short line, not a full card.
    const more = lay.nodes.get("c:__more");
    if (more) lay.nodes.set("c:__more", { ...more, y: more.y + more.h / 2 - 15, h: 30 });
  }

  // ---- Animation targets ---------------------------------------------------
  const prevNodes = useRef(new globalThis.Map<string, Box>());
  // The "more pushes" note keeps its last count while it fades out.
  const lastHidden = useRef(hidden);
  if (hidden > 0) lastHidden.current = hidden;
  const moreCount = hidden > 0 ? hidden : lastHidden.current;
  const prevFlows = useRef(new globalThis.Map<string, { shown: Shown; ports: Ports }>());
  const order = [...causeIds.map((c) => "c:" + c), ...usedChannels.map((c) => "h:" + c), ...outcomes.map((o) => "o:" + o)];
  const delayOf = (id: string) => {
    // After the entrance, a new card waits a moment for its neighbours to make room.
    if (!intro.current) return 220;
    const i = order.indexOf(id);
    return id.startsWith("c:") ? 120 + i * 140 : id.startsWith("h:") ? 520 + i * 60 : 700 + i * 60;
  };
  for (const [id, b] of lay.nodes) {
    const delay = delayOf(id);
    anim.set(`n:${id}:x`, b.x);
    anim.set(`n:${id}:y`, b.y, { from: b.y - (mode === "h" ? 26 : 16), delay });
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
  const shownNow = new globalThis.Map<string, { shown: Shown; ports: Ports }>();
  for (const d of drawn) {
    const o = story.outcomes.find((x) => x.metric === d.flow.metric)!;
    const tone = Math.sign(d.value) === o.good(T) ? "good" : "bad";
    const ports = lay.ports.get(d.flow.id)!;
    shownNow.set(d.flow.id, { shown: { flow: d.flow, value: d.value, tone, lever: isLever(d.flow.cause) }, ports });
    const fid = `f:${d.flow.id}`;
    const delay = intro.current ? delayOf("c:" + d.flow.cause) + 380 : 0;
    anim.set(`${fid}:t`, thick(d.n), { from: 0, delay });
    ports.forEach((p, i) => anim.set(`${fid}:p${i}`, p));
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
    if (o.ghost) anim.set(`g:${o.metric}`, o.ghost[T], { from: o.ghost[Math.max(0, story.first - 1)], delay: intro.current ? 900 : 0 });
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
      dots.current = dots.current.filter((d) => causeById.get(d.flow.split("|")[0])?.kind !== "lever");
      for (const d of drawnRef.current) if (causeById.get(d.flow.cause)?.kind === "lever") dots.current.push({ flow: d.flow.id, t0: now + 150, dur: 1700 });
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
    if (raf.current || !(anim.moving() || dots.current.length)) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const moving = anim.tick(dt, now);
      dots.current = dots.current.filter((d) => now - d.t0 < d.dur);
      setFrame((f) => (f + 1) % 1e6);
      raf.current = moving || dots.current.length ? requestAnimationFrame(step) : 0;
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
    const p = [0, 1, 2, 3].map((i) => anim.get(`f:${id}:p${i}`));
    if (mode === "h") return [{ x: C.x + C.w, y: C.y + p[0] }, { x: M.x, y: M.y + p[1] }, { x: M.x + M.w, y: M.y + p[2] }, { x: O.x, y: O.y + p[3] }];
    return [{ x: C.x + p[0], y: C.y + C.h }, { x: M.x + p[1], y: M.y }, { x: M.x + p[2], y: M.y + M.h }, { x: O.x + p[3], y: O.y }];
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
        onPick={onPick}
        scroller={scroller}
        reduced={reduced}
        drawn={drawn.map((d) => d.flow)}
        width={W}
      />
    );
  }

  return (
    <div
      className="st-map is-h"
      style={{ width: W, height: H, transform: s !== 1 ? `scale(${s})` : undefined, ["--st-s" as string]: s, ["--st-u" as string]: u }}
    >
      <header className="st-head">
        <p className="st-title">
          What moves your goals <span className="st-title-q">· {quarter}, {when}</span>
        </p>
        <p className="st-hint">
          Wider arrow, bigger push. <b>▲</b> up, <b>▼</b> down, in pp; <Key tone="good" /> or <Key tone="bad" /> your goal.
        </p>
        <NewsLine news={news} label={story.labels[story.clock] ?? ""} />
      </header>

      <div className="st-colheads" aria-hidden="true" style={{ top: headH }}>
        <span style={{ left: col.causeX, width: col.causeW }}>What pushed{fold && hidden ? ` (+${hidden} more)` : ""}</span>
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

      <div className="st-canvas" aria-hidden="true">
        <svg className="st-svg" width={W} height={H}>
          {flowsShown.map(([id, { shown }]) => {
            const t = anim.get(`f:${id}:t`);
            if (t < 0.2) return null;
            const d = pathOf(geom(id, shown));
            const draw = anim.get(`f:${id}:d`, 1);
            // Drawing in: a dash that reveals the arrow. A rough road: dashed once drawn.
            const dash = draw < 1 ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - draw } : shown.flow.approx ? { strokeDasharray: `${f(Math.max(7, t * 0.8))} ${f(Math.max(5, t * 0.45))}` } : {};
            return (
              <g key={id} className={`st-flow is-${shown.tone}${shown.lever ? " is-lever" : ""}${shown.flow.approx ? " is-rough" : ""}`}>
                <path d={d} className="st-flow-edge" strokeWidth={t + 3} {...(draw < 1 ? dash : {})} />
                <path d={d} className="st-flow-body" strokeWidth={t} {...dash} />
              </g>
            );
          })}
          {dots.current.map((dot, i) => {
            const rec = shownNow.get(dot.flow);
            if (!rec) return null;
            const at = (now - dot.t0) / dot.dur;
            if (at < 0 || at > 1) return null;
            const e = at < 0.5 ? 2 * at * at : 1 - Math.pow(-2 * at + 2, 2) / 2;
            const p = pointAt(geom(dot.flow, rec.shown), e);
            // Grows out of the lever card and shrinks into the goal card, so it never pops.
            const rad = Math.max(5, anim.get(`f:${dot.flow}:t`) / 2 + 2.5) * Math.min(1, at / 0.08, (1 - at) / 0.12);
            return <circle key={`${dot.flow}-${i}`} className={`st-dot is-${rec.shown.tone}`} cx={p.x} cy={p.y} r={rad} />;
          })}
        </svg>

        {[...prevNodes.current.keys()].map((id) => {
          const b = box(id);
          const o = anim.get(`n:${id}:o`);
          const style = { left: b.x, top: b.y, width: b.w, height: b.h, opacity: o };
          if (id === "c:__more")
            return (
              <div key={id} className="st-more" style={style}>
                and {moreCount} more push{moreCount === 1 ? "" : "es"}
              </div>
            );
          if (id.startsWith("c:")) {
            const c = causeById.get(id.slice(2));
            return c ? <CauseCard key={id} c={c} style={style} isNews={newsShocks.has(c.title)} knock={knockOf(c)} /> : null;
          }
          if (id.startsWith("h:")) {
            const ch = CHANNELS.find((x) => x.id === (id.slice(2) as ChannelId))!;
            return (
              <div key={id} className="st-card st-chan" style={style}>
                <span className="st-blob">
                  <Icon id={ch.icon} />
                </span>
                <span className="st-text">
                  <b>{ch.title}</b>
                  <small>{ch.sub}</small>
                </span>
              </div>
            );
          }
          const oc = story.outcomes.find((x) => x.metric === (id.slice(2) as MetricId));
          return oc ? <GoalCard key={id} o={oc} anim={anim} T={T} story={story} style={style} fit={fit} /> : null;
        })}

        {flowsShown.map(([id, { shown }]) => {
          const t = anim.get(`f:${id}:t`);
          const draw = anim.get(`f:${id}:d`, 1);
          if (t < 1 || draw < 0.9) return null;
          const c = geom(id, shown)[3];
          return (
            <span key={id} className={`st-tag is-${shown.tone}`} style={{ left: c.x - 5, top: c.y, opacity: Math.min(1, (draw - 0.9) * 10) }}>
              {pushText(shown.value, shown.flow.metric)}
            </span>
          );
        })}
      </div>

      <p className="st-note" style={{ top: H - STRIP_H - NOTE_H - 2, height: NOTE_H }}>
        <span>
          {rough ? (
            <>
              Sizes and roads come from the model; dashed roads (<RoughMark /> roughly) are approximate.
            </>
          ) : (
            "Sizes and roads come from the model."
          )}
        </span>
      </p>

      <Strip story={story} T={T} cells={cells} anim={anim} onPick={onPick} top={H - STRIP_H} sentence />

      <Summary story={story} T={T} drawn={drawn.map((d) => d.flow)} causeById={causeById} hidden={hidden} />
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
  onPick: (t: number) => void;
  scroller: React.RefObject<HTMLDivElement | null>;
  reduced: boolean;
  drawn: Flow[];
}) {
  const footRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Goals still below the fold (under the pinned foot): a "+2 goals below" cue that scrolls to the next one. Only when needed.
  const [below, setBelow] = useState<number[]>([]);
  const [more, setMore] = useState(false);
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
  const tr = story.travel;
  const narrow = width < 480;
  // Goals in trouble first (off track, then at risk), the rest in the mission's order.
  const rank = (m: MetricId) => (trouble[m] === "failed" ? 0 : trouble[m] === "at-risk" ? 1 : 2);
  const goals = [...story.outcomes].sort((a, b) => rank(a.metric) - rank(b.metric));
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
            rows={flowsShown.filter(([, rec]) => rec.shown.flow.metric === o.metric).sort((a, b) => Math.abs(b[1].shown.value) - Math.abs(a[1].shown.value))}
            anim={anim}
            T={T}
            story={story}
            causeById={causeById}
            trouble={trouble[o.metric]}
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
      <Strip story={story} T={T} cells={cells} anim={anim} onPick={onPick} top={null} sentence={false} />
      <div ref={footRef} className={`st-foot${more ? " has-more" : ""}${below.length ? " has-cue" : ""}`}>
        {below.length ? (
          <button type="button" className="st-foot-more" onClick={toNext}>
            +{below.length} goal{below.length === 1 ? "" : "s"} below <span aria-hidden="true">↓</span>
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
      <Summary story={story} T={T} drawn={drawn} causeById={causeById} hidden={hidden} />
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

function CauseCard({ c, style, isNews, knock }: { c: Cause; style: React.CSSProperties; isNews: boolean; knock: string | null }) {
  return (
    <div className={`st-card st-cause is-${c.kind}`} style={style}>
      <span className="st-blob">
        <Icon id={c.icon} />
      </span>
      <span className="st-text">
        {c.kind === "lever" ? <em className="st-yours">Your move</em> : isNews ? <em className="st-yours is-news">News this quarter</em> : c.from ? <em className="st-yours">Shock, from {c.from}</em> : null}
        <b>{c.title}</b>
        <small>
          {c.sub}
          {c.note ? ` · ${c.note}` : ""}
          {knock ? <b className="st-knock"> → {knock}</b> : null}
        </small>
      </span>
    </div>
  );
}

const unitOf = (o: Outcome) => (o.unit === "%" ? "%" : o.unit === "bp" ? " bp" : o.unit === "months" ? " mo" : "%");
/**
 * "▲ +1.6 since 2025Q4", or "no change since 2025Q4": the figure on show less the start as it is written
 * elsewhere, both rounded first, so the big number, this line and the start always reconcile, mid-count too.
 */
function sinceText(o: Outcome, v: number, from: string) {
  const delta = Number(v.toFixed(o.digits)) - Number(o.path[0].toFixed(o.digits));
  const s = signed(delta, o.digits);
  return s === (0).toFixed(o.digits) ? `no change since ${from}` : `${delta > 0 ? "▲" : "▼"} ${s} since ${from}`;
}

/** `fit`: 0 shows every line; 1 drops the goal line; 2 also drops "without your moves" (short slots). */
function GoalCard({ o, anim, T, story, style, fit }: { o: Outcome; anim: Anim; T: number; story: Story; style: React.CSSProperties; fit: number }) {
  const v = anim.get(`v:${o.metric}`, o.path[T]);
  const unit = unitOf(o);
  const g = o.ghost ? anim.get(`g:${o.metric}`, o.ghost[T]) : null;
  return (
    <div className={`st-card st-goal${o.goal ? "" : " is-watch"}`} style={style}>
      <span className="st-goal-head">
        <span className="st-blob">
          <Icon id={o.metric} />
        </span>
        <b>{o.label}</b>
      </span>
      <span className="st-goal-value">
        {v.toFixed(o.digits)}
        <small>{unit}</small>
      </span>
      <span className="st-goal-line">{sinceText(o, v, story.labels[0])}</span>
      {g !== null && fit < 2 ? (
        <span className="st-goal-line is-quiet">
          without your moves: {g.toFixed(o.digits)}
          {unit}
        </span>
      ) : null}
      {fit < 1 ? <span className="st-goal-line is-quiet">{o.goal ?? "not a mission goal: one to watch"}</span> : null}
    </div>
  );
}

/**
 * One goal in the list: a single line (the figure, its change, whether it is in trouble) and its two
 * biggest pushes, each cause's roads added together; a tap opens every push with its road and a bar.
 */
function ListGoal({
  o,
  rows,
  anim,
  T,
  story,
  causeById,
  trouble,
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
  newsShocks: Set<string>;
  maxT: number;
}) {
  const [open, setOpen] = useState(false);
  const v = anim.get(`v:${o.metric}`, o.path[T]);
  const delta = Number(v.toFixed(o.digits)) - Number(o.path[0].toFixed(o.digits));
  const byCause = new globalThis.Map<string, number>();
  for (const [, { shown }] of rows) byCause.set(shown.flow.cause, (byCause.get(shown.flow.cause) ?? 0) + shown.value);
  const top = [...byCause.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2);
  const tone = (x: number) => (Math.sign(x) === o.good(T) ? "good" : "bad");
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
                  {c && newsShocks.has(c.title) ? <em className="st-lnew"> new</em> : null} <span className={`st-ltag is-${tone(value)}`}>{pushText(value, o.metric)}</span>
                </span>
              );
            })}
          </span>
        ) : (
          <span className="st-lsum is-quiet">no push to speak of yet</span>
        )}
      </button>
      {open ? (
        <div id={id} className="st-lrows">
          {rows.map(([fid, { shown }]) => {
            const c = causeById.get(shown.flow.cause);
            const ch = CHANNELS.find((x) => x.id === shown.flow.channel);
            const t = anim.get(`f:${fid}:t`);
            return (
              <div key={fid} className={`st-lrow${shown.lever ? " is-lever" : ""}`}>
                <span className="st-blob">{c ? <Icon id={c.icon} /> : null}</span>
                <span className="st-ltext">
                  <b>{c?.title}</b>{" "}
                  <small>
                    through {ch?.title.toLowerCase()}
                    {shown.flow.approx ? " (roughly)" : ""}
                  </small>
                </span>
                <span className="st-lbar">
                  <i className={`is-${shown.tone}${shown.flow.approx ? " is-rough" : ""}`} style={{ width: `${Math.max(8, (Math.max(t, 2.5) / maxT) * 100)}%` }} />
                </span>
                <span className={`st-ltag is-${shown.tone}`}>{pushText(shown.value, shown.flow.metric)}</span>
              </div>
            );
          })}
          <p className="st-lfoot">
            {story.labels[T]} against {story.labels[0]}
            {o.goal ? ` · ${o.goal}` : " · not a mission goal"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** A cause's name for the one-line summary, shortened where long: "Own drift", "Reforms and support". */
function short(c: Cause): string {
  if (c.kind === "momentum") return "Own drift";
  return c.title.length > 18 ? c.title.replace(/^Your /, "").replace(/^\w/, (x) => x.toUpperCase()) : c.title;
}

function Strip({ story, T, cells, anim, onPick, top, sentence }: { story: Story; T: number; cells: number[]; anim: Anim; onPick: (t: number) => void; top: number | null; sentence: boolean }) {
  const tr = story.travel;
  // One name for the quarter everywhere: "deciding" is the quarter being decided (the map's "2026Q1, the quarter you are deciding").
  const tag = (t: number) => (t === story.clock ? "last" : t === story.clock + 1 ? "deciding" : t === story.end ? "goal date" : "");
  // Each row on its own scale; the zero line sits where the row's values need it (top: only down; bottom: only up; middle: both).
  const rows = tr
    ? tr.diffs.map((d) => {
        const vals = cells.map((t) => d.values[t] ?? 0);
        const up = vals.some((v) => v > 0.005);
        const down = vals.some((v) => v < -0.005);
        return { d, o: story.outcomes.find((x) => x.metric === d.metric)!, zero: up && down ? 0.5 : down ? 0 : 1 };
      })
    : [];
  return (
    <section className={`st-strip${top === null ? " is-static" : ""}`} style={top === null ? undefined : { top, height: STRIP_H }} aria-label="When effects land: pick a quarter to show on the map">
      <p className="st-strip-head">
        <b>{sentence ? "When does it land?" : "Quarter by quarter"}</b>{" "}
        <span>{sentence ? (tr ? tr.sentence : "Move a lever: this strip shows, quarter by quarter, when its effect arrives.") : tr ? "your moves' effect, as it builds. Pick a quarter to show it above." : "pick a quarter to show it above."}</span>
      </p>
      <div className="st-cells" role="group" aria-label="Quarter shown on the map">
        {tr ? (
          <span className="st-rowkeys" aria-hidden="true">
            {/* The unit once, on the quarters' line, when the rows share it ("in pp"); otherwise beside each row. */}
            <small className="st-rowkeys-unit">{new Set(rows.map((row) => unitWord(row.d.metric))).size === 1 ? `in ${unitWord(rows[0].d.metric).trim()}` : ""}</small>
            {rows.map((row) => (
              <span key={row.d.metric}>
                {row.o.label}
                {new Set(rows.map((x) => unitWord(x.d.metric))).size > 1 ? <small> {unitWord(row.d.metric).trim()}</small> : null}
              </span>
            ))}
          </span>
        ) : null}
        <span className="st-cells-track">
          {cells.map((t) => (
            <button key={t} type="button" className={`st-cell${t === T ? " is-on" : ""}`} aria-pressed={t === T} onClick={() => onPick(t)} title={`Show ${story.labels[t]} on the map`}>
              <span className="st-cell-q">{shortQ(story.labels[t])}</span>
              {rows.map(({ d, o, zero }) => {
                const h = anim.get(`b:${d.metric}:${t}`);
                const v = d.values[t] ?? 0;
                const flat = Math.abs(v) < 0.005;
                const tone = flat ? "flat" : Math.sign(v) === o.good(t) ? "good" : "bad";
                const span = zero === 0.5 ? 50 : 100;
                const size = flat ? 0 : Math.max(0.08, Math.min(1, Math.abs(h))) * span;
                const bar: React.CSSProperties = h >= 0 ? { bottom: `${(1 - zero) * 100}%`, height: `${size.toFixed(1)}%` } : { top: `${zero * 100}%`, height: `${size.toFixed(1)}%` };
                return (
                  <span key={d.metric} className={`st-bar is-${tone}`} aria-label={`${o.label} ${signed(v, 2)}${unitWord(d.metric)} from your moves`}>
                    <span className="st-bar-zone">
                      <span className="st-bar-zero" style={{ top: `${zero * 100}%` }} />
                      <i style={bar} />
                    </span>
                    <em>{flat ? "0" : signed(v, Math.abs(v) < 0.095 ? 2 : 1)}</em>
                  </span>
                );
              })}
              <span className="st-cell-tag">{tag(t)}</span>
            </button>
          ))}
        </span>
      </div>
    </section>
  );
}

const shortQ = (label: string | undefined) => (label ? `Q${label.slice(5)} ’${label.slice(2, 4)}` : "");

/** The same story in words, for screen readers (the drawing itself is hidden from them). */
function Summary({ story, T, drawn, causeById, hidden }: { story: Story; T: number; drawn: Flow[]; causeById: globalThis.Map<string, Cause>; hidden: number }) {
  const lines = story.outcomes.map((o) => {
    const parts = drawn
      .filter((fl) => fl.metric === o.metric)
      .map((fl) => `${causeById.get(fl.cause)?.title ?? fl.cause} ${signed(fl.values[T] ?? 0, 2)}${unitWord(fl.metric)} through ${CHANNELS.find((c) => c.id === fl.channel)?.title.toLowerCase()}${fl.approx ? " (roughly)" : ""}`);
    return `${o.label} ${o.path[T].toFixed(o.digits)} in ${story.labels[T]}${parts.length ? `: ${parts.join("; ")}` : ""}.`;
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
