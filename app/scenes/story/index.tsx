"use client";

// "Cause and effect": a living causal map of the quarter. Causes (shocks, the
// economy's own drift, the player's levers) on the left, the channels they
// travel through in the middle, the mission's goals on the right. Each arrow is
// one piece of the game's shocks-vs-policy decomposition (decompose.ts): its
// width is how hard it pushes, its tag says which way and by how much. A
// quarter strip underneath picks the moment shown and shows the player's own
// change still travelling (forecast against "had you changed nothing").

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { decompose } from "../../game/decompose";
import { channels, policyTouched, untouchedConfig, type FrameworkInput } from "../../game/framework";
import { knownConfig, policyForTurn } from "../../game/missions";
import { forecastFor, useGame } from "../../game/store";
import { useTurn } from "../../game/useTurn";
import { useReducedMotion } from "../../game/ui/useTween";
import { useLab } from "../../store";
import { Anim } from "./anim";
import { Icon } from "./icons";
import { columns, layout, type Box, type LFlow, type Mode, type Ports } from "./placement";
import { buildStory, CHANNEL_ORDER, CHANNELS, drawnAt, maxPush, metricRef, pushText, signed, type Cause, type ChannelId, type Flow, type MetricId, type Outcome, type Story } from "./model";
import { useStoryShown } from "./shown";
import "./story.css";

type Shown = { flow: Flow; value: number; tone: "good" | "bad"; lever: boolean };
type Dot = { flow: string; t0: number; dur: number };

const HEAD_H = 50;
const COLHEAD_H = 22;
const STRIP_H = 128;
const MAX_ARROWS = 8;
/** Phones list fewer pushes, goal by goal. */
const MAX_ARROWS_V = 6;

export default function StoryScene() {
  const { mission, config, clock, actual, forecast, policy, policyStart } = useTurn();
  const turns = useGame((s) => s.turns);
  const start = turns[0] ?? config;
  const end = mission?.quarters ?? Math.min(24, clock + 8);
  const touched = policyTouched(config, start);
  const untouchedCfg = useMemo(() => untouchedConfig(config, start), [config, start]);
  const untouched = useMemo(() => (touched ? forecastFor(untouchedCfg, clock) : forecast), [touched, untouchedCfg, clock, forecast]);
  const policyUntouched = useMemo(() => policyForTurn(untouchedCfg, clock), [untouchedCfg, clock]);
  const decomp = useMemo(() => decompose(knownConfig(config, clock), start, end), [config, clock, start, end]);
  const story = useMemo(() => {
    const input: FrameworkInput = { config, actual, forecast, untouched, clock, end, policy, policyStart, changedSinceStart: touched };
    return buildStory({ config, start, mission, clock, end, forecast, untouched, touched, policy, policyUntouched, decomp, chans: channels(input) });
  }, [config, start, mission, clock, end, forecast, untouched, touched, policy, policyUntouched, decomp, actual, policyStart]);

  const reducedPref = useReducedMotion();
  const reducedLab = useLab((s) => s.reduceMotion);
  const reduced = reducedPref || reducedLab;

  // Size of the slot.
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ W: 0, H: 0 });
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ W: Math.round(e.contentRect.width), H: Math.round(e.contentRect.height) }));
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
  // The island view names the map's biggest pushes in one line: it reads this story, at this quarter.
  const vertical = size.W > 0 && size.W < 560;
  useEffect(() => useStoryShown.setState({ story, T, max: vertical ? MAX_ARROWS_V : MAX_ARROWS }), [story, T, vertical]);
  useEffect(() => () => useStoryShown.setState({ story: null }), []);

  return (
    <div ref={rootRef} className="st-root" role="region" aria-label="Cause and effect: what is moving your goals, and why">
      {size.W > 0 && seen ? <StoryMap story={story} T={T} W={size.W} H={size.H} reduced={reduced} policySig={`${clock}|${JSON.stringify(policy)}`} onPick={(t) => setPick({ clock, t })} /> : null}
    </div>
  );
}

function StoryMap({ story, T, W, H, reduced, policySig, onPick }: { story: Story; T: number; W: number; H: number; reduced: boolean; policySig: string; onPick: (t: number) => void }) {
  const mode: Mode = W < 560 ? "v" : "h";
  const u = mode === "h" ? Math.max(1, Math.min(1.8, Math.min(W / 770, H / 660))) : 1;
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
  const headH = mode === "h" ? HEAD_H : 74;
  const mapTop = headH + (mode === "h" ? COLHEAD_H : 18);
  const mapH = Math.max(220, H - mapTop - STRIP_H - 8);
  const causeIds = hidden > 0 && mode === "h" ? [...usedCauses, "__more"] : usedCauses;
  const lay = layout({ mode, W, top: mapTop, H: mapH, causes: causeIds, channels: usedChannels, outcomes, flows: lflows, u });
  if (hidden > 0 && mode === "h") {
    // The "smaller effects" note is a short line, not a full card.
    const more = lay.nodes.get("c:__more");
    if (more) lay.nodes.set("c:__more", { ...more, y: more.y + more.h / 2 - 15, h: 30 });
  }

  // ---- Animation targets ---------------------------------------------------
  const prevNodes = useRef(new globalThis.Map<string, Box>());
  // The "smaller effects" note keeps its last count while it fades out.
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
    anim.set(`${fid}:v`, d.value, { from: 0, delay });
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
  for (const o of story.outcomes) {
    anim.set(`v:${o.metric}`, o.path[T], { from: o.path[Math.max(0, story.first - 1)], delay: intro.current ? 900 : 0 });
    if (o.ghost) anim.set(`g:${o.metric}`, o.ghost[T]);
  }
  // Time strip bars: the player's own effect by quarter.
  const cells: number[] = [];
  for (let t = story.first; t <= story.end; t++) cells.push(t);
  const barMax = story.travel ? Math.max(0.05, ...story.travel.diffs.flatMap((d) => cells.map((t) => Math.abs(d.values[t] ?? 0) / metricRef(d.metric)))) : 1;
  if (story.travel)
    story.travel.diffs.forEach((d) => cells.forEach((t) => anim.set(`b:${d.metric}:${t}`, (d.values[t] ?? 0) / metricRef(d.metric) / barMax, { from: 0, delay: intro.current ? 900 + (t - story.first) * 70 : 0 })));
  anim.set("mk", 1);

  // ---- Events: a lever moved, a shock landed --------------------------------
  const prevSig = useRef<string | null>(null);
  const prevCauses = useRef<Set<string> | null>(null);
  useEffect(() => {
    const now = performance.now();
    const sameQuarter = prevSig.current !== null && prevSig.current.split("|")[0] === policySig.split("|")[0];
    if (!reduced && sameQuarter && prevSig.current !== policySig) {
      // The lever's arrows grow; a dot carries the push from the lever to the goals, and the strip replays its journey.
      // One dot per lever arrow: a new move restarts the journey rather than piling dots up.
      dots.current = dots.current.filter((d) => causeById.get(d.flow.split("|")[0])?.kind !== "lever");
      for (const d of drawnAt(story, T, MAX_ARROWS).drawn) if (causeById.get(d.flow.cause)?.kind === "lever") dots.current.push({ flow: d.flow.id, t0: now + 150, dur: 1700 });
      anim.kick("mk", 0, 150);
      anim.rate.set("mk", 1 / 1.9);
      if (story.travel) story.travel.diffs.forEach((dd) => cells.forEach((t) => anim.kick(`b:${dd.metric}:${t}`, 0, 150 + (t - story.first) * 110)));
    }
    prevSig.current = policySig;
    const ids = new Set(story.causes.map((c) => c.id));
    if (!reduced && prevCauses.current) {
      for (const c of story.causes)
        if (!prevCauses.current.has(c.id) && c.kind !== "lever") for (const d of drawnAt(story, T, MAX_ARROWS).drawn) if (d.flow.cause === c.id) dots.current.push({ flow: d.flow.id, t0: now + 800, dur: 1700 });
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
  const geom = (id: string, s: Shown) => {
    const C = box("c:" + s.flow.cause);
    const M = box("h:" + s.flow.channel);
    const O = box("o:" + s.flow.metric);
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
  const pointAt = (g: Pt[], s: number): Pt => {
    const [a, b1, b2, c] = g;
    const L = [dist(a, b1) * 1.1, dist(b1, b2), dist(b2, c) * 1.1];
    let d = s * (L[0] + L[1] + L[2]);
    if (d <= L[0]) return bez(curve(a, b1), d / L[0]);
    d -= L[0];
    if (d <= L[1]) return { x: b1.x + (b2.x - b1.x) * (d / L[1]), y: b1.y + (b2.y - b1.y) * (d / L[1]) };
    d -= L[1];
    return bez(curve(b2, c), Math.min(1, d / L[2]));
  };

  const now = performance.now();
  const flowsShown = [...shownNow.entries()];
  const col = columns(W, u);
  const quarter = story.labels[T] ?? "";
  const when = T === story.clock + 1 ? "next quarter" : T <= story.clock ? "just played" : `in ${T - story.clock} quarters`;

  if (mode === "v") {
    // Phone: the same causes, channels and pushes, stacked goal by goal; each arrow becomes a bar.
    return (
      <div className="st-map is-v">
        <header className="st-head">
          <p className="st-title">
            Why it moves <span className="st-title-q">· {quarter}, {when}</span>
          </p>
          <p className="st-hint">
            Longer bar, bigger push. <b>▲</b> up, <b>▼</b> down; <span className="st-good">helps</span> or <span className="st-bad">hurts</span>.
          </p>
        </header>
        <div className="st-list" aria-hidden="true">
          {story.outcomes.map((o) => {
            const rows = flowsShown.filter(([, r]) => r.shown.flow.metric === o.metric).sort((a, b) => Math.abs(b[1].shown.value) - Math.abs(a[1].shown.value));
            return (
              <div key={o.metric} className="st-lgoal">
                <PhoneGoal o={o} anim={anim} T={T} story={story} />
                {rows.map(([id, { shown }]) => {
                  const c = causeById.get(shown.flow.cause);
                  const ch = CHANNELS.find((x) => x.id === shown.flow.channel);
                  const t = anim.get(`f:${id}:t`);
                  return (
                    <div key={id} className={`st-lrow${shown.lever ? " is-lever" : ""}`} style={{ opacity: Math.min(1, t / 2.5) }}>
                      <span className="st-blob">{c ? <Icon id={c.icon} /> : null}</span>
                      <span className="st-text">
                        <b>{c?.title}</b>
                        <small>through {ch?.title.toLowerCase()}</small>
                      </span>
                      <span className="st-lbar">
                        <i className={`is-${shown.tone}`} style={{ width: `${Math.max(8, (t / maxT) * 100)}%` }} />
                      </span>
                      <span className={`st-ltag is-${shown.tone}`}>{pushText(anim.get(`f:${id}:v`, shown.value), shown.flow.metric)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {hidden > 0 ? <p className="st-lmore">and {hidden} smaller effect{hidden === 1 ? "" : "s"}</p> : null}
        </div>
        <Strip story={story} T={T} cells={cells} anim={anim} onPick={onPick} top={null} />
        <Summary story={story} T={T} drawn={drawn.map((d) => d.flow)} causeById={causeById} hidden={hidden} />
      </div>
    );
  }

  return (
    <div className={`st-map is-${mode}`} style={{ height: "100%", ["--st-u" as string]: u }}>
      <header className="st-head">
        <p className="st-title">
          What is moving your goals <span className="st-title-q">· {quarter}, {when}</span>
        </p>
        <p className="st-hint">
          Wider arrow, bigger push. <b>▲</b> pushes up, <b>▼</b> pushes down; <span className="st-good">helps</span> or <span className="st-bad">hurts</span> your goal.
          
        </p>
      </header>

      {mode === "h" ? (
        <div className="st-colheads" aria-hidden="true" style={{ top: HEAD_H }}>
          <span style={{ left: col.causeX, width: col.causeW }}>What pushed</span>
          <span style={{ left: col.chanX, width: col.chanW, textAlign: "center" }}>Through</span>
          <span style={{ left: col.outX, width: col.outW }}>Your goals, {quarter}</span>
        </div>
      ) : null}

      <div className="st-canvas" aria-hidden="true">
        <svg className="st-svg" width={W} height={H}>
          {flowsShown.map(([id, { shown }]) => {
            const t = anim.get(`f:${id}:t`);
            if (t < 0.2) return null;
            const d = pathOf(geom(id, shown));
            const draw = anim.get(`f:${id}:d`, 1);
            const dash = draw < 1 ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - draw } : {};
            return (
              <g key={id} className={`st-flow is-${shown.tone}${shown.lever ? " is-lever" : ""}`}>
                <path d={d} className="st-flow-edge" strokeWidth={t + 3} {...dash} />
                <path d={d} className="st-flow-body" strokeWidth={t} {...dash} />
              </g>
            );
          })}
          {dots.current.map((dot, i) => {
            const rec = shownNow.get(dot.flow);
            if (!rec) return null;
            const s = (now - dot.t0) / dot.dur;
            if (s < 0 || s > 1) return null;
            const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
            const p = pointAt(geom(dot.flow, rec.shown), e);
            // Grows out of the lever card and shrinks into the goal card, so it never pops.
            const r = Math.max(5, anim.get(`f:${dot.flow}:t`) / 2 + 2.5) * Math.min(1, s / 0.08, (1 - s) / 0.12);
            return <circle key={`${dot.flow}-${i}`} className={`st-dot is-${rec.shown.tone}`} cx={p.x} cy={p.y} r={r} />;
          })}
        </svg>

        {[...prevNodes.current.keys()].map((id) => {
          const b = box(id);
          const o = anim.get(`n:${id}:o`);
          const style = { left: b.x, top: b.y, width: b.w, height: b.h, opacity: o };
          if (id === "c:__more")
            return (
              <div key={id} className="st-more" style={style}>
                and {moreCount} smaller effect{moreCount === 1 ? "" : "s"}
              </div>
            );
          if (id.startsWith("c:")) {
            const c = causeById.get(id.slice(2));
            return c ? <CauseCard key={id} c={c} style={style} /> : null;
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
          return oc ? <GoalCard key={id} o={oc} anim={anim} T={T} story={story} style={style} compact={false} /> : null;
        })}

        {flowsShown.map(([id, { shown }]) => {
          const t = anim.get(`f:${id}:t`);
          const draw = anim.get(`f:${id}:d`, 1);
          if (t < 1 || draw < 0.9) return null;
          const c = geom(id, shown)[3];
          const v = anim.get(`f:${id}:v`, shown.value);
          const style = mode === "h" ? { left: c.x - 5, top: c.y } : { left: c.x, top: c.y - 5 };
          return (
            <span key={id} className={`st-tag is-${shown.tone}`} style={{ ...style, opacity: Math.min(1, (draw - 0.9) * 10) }}>
              {pushText(v, shown.flow.metric)}
            </span>
          );
        })}
      </div>

      <Strip story={story} T={T} cells={cells} anim={anim} onPick={onPick} top={H - STRIP_H} />

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

function CauseCard({ c, style }: { c: Cause; style: React.CSSProperties }) {
  return (
    <div className={`st-card st-cause is-${c.kind}`} style={style}>
      <span className="st-blob">
        <Icon id={c.icon} />
      </span>
      <span className="st-text">
        {c.kind === "lever" ? <em className="st-yours">Your move</em> : null}
        <b>{c.title}</b>
        <small>
          {c.sub}
          {c.note ? ` · ${c.note}` : ""}
        </small>
      </span>
    </div>
  );
}

function GoalCard({ o, anim, T, story, style, compact }: { o: Outcome; anim: Anim; T: number; story: Story; style: React.CSSProperties; compact: boolean }) {
  const v = anim.get(`v:${o.metric}`, o.path[T]);
  const start = o.path[0];
  const delta = o.path[T] - start;
  const unit = o.unit === "%" ? "%" : o.unit === "bp" ? " bp" : o.unit === "months" ? " mo" : "%";
  const g = o.ghost ? anim.get(`g:${o.metric}`, o.ghost[T]) : null;
  return (
    <div className="st-card st-goal" style={style}>
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
      <span className="st-goal-line">
        {delta >= 0 ? "▲" : "▼"} {signed(delta, o.digits)} since {story.labels[0]}
      </span>
      {!compact && g !== null ? <span className="st-goal-line is-quiet">without your moves: {g.toFixed(o.digits)}{unit}</span> : null}
      {!compact && o.goal ? <span className="st-goal-line is-quiet">{o.goal}</span> : null}
    </div>
  );
}

function PhoneGoal({ o, anim, T, story }: { o: Outcome; anim: Anim; T: number; story: Story }) {
  const v = anim.get(`v:${o.metric}`, o.path[T]);
  const delta = o.path[T] - o.path[0];
  const unit = o.unit === "%" ? "%" : o.unit === "bp" ? " bp" : o.unit === "months" ? " mo" : "%";
  return (
    <div className="st-lhead">
      <span className="st-blob">
        <Icon id={o.metric} />
      </span>
      <b>{o.label}</b>
      <span className="st-lvalue">
        {v.toFixed(o.digits)}
        {unit}
      </span>
      <small>
        {delta >= 0 ? "▲" : "▼"} {signed(delta, o.digits)} since {story.labels[0]}
      </small>
    </div>
  );
}

function Strip({ story, T, cells, anim, onPick, top }: { story: Story; T: number; cells: number[]; anim: Anim; onPick: (t: number) => void; top: number | null }) {
  const tr = story.travel;
  const mk = anim.get("mk", 1);
  const tag = (t: number) => (t === story.clock ? "last" : t === story.clock + 1 ? "now" : t === story.end ? "goal date" : t - story.clock - 1 === 2 ? "+2" : t - story.clock - 1 === 4 ? "+4" : "");
  return (
    <section className="st-strip" style={top === null ? undefined : { top }} aria-label="When effects land: pick a quarter to show on the map">
      <p className="st-strip-head">
        <b>When does it land?</b> <span>{tr ? tr.sentence : "Move a lever: this strip shows, quarter by quarter, when its effect arrives."}</span>
      </p>
      <div className="st-cells" role="group" aria-label="Quarter shown on the map">
        {tr ? (
          <span className="st-rowkeys" aria-hidden="true">
            {tr.diffs.map((d) => (
              <span key={d.metric}>{story.outcomes.find((o) => o.metric === d.metric)?.label}</span>
            ))}
          </span>
        ) : null}
        <span className="st-cells-track">
          {cells.map((t) => (
            <button key={t} type="button" className={`st-cell${t === T ? " is-on" : ""}`} aria-pressed={t === T} onClick={() => onPick(t)} title={`Show ${story.labels[t]} on the map`}>
              <span className="st-cell-q">{shortQ(story.labels[t])}</span>
              {tr
                ? tr.diffs.map((d) => {
                    const h = anim.get(`b:${d.metric}:${t}`);
                    const v = d.values[t] ?? 0;
                    const o = story.outcomes.find((x) => x.metric === d.metric)!;
                    const tone = Math.abs(v) < 0.005 ? "flat" : Math.sign(v) === o.good(t) ? "good" : "bad";
                    return (
                      <span key={d.metric} className={`st-bar is-${tone}`} aria-label={`${o.label} ${signed(v, 2)} pp from your moves`}>
                        <i style={h >= 0 ? { height: `${h * 50}%`, bottom: "50%" } : { height: `${-h * 50}%`, top: "50%" }} />
                        <em>{Math.abs(v) < 0.005 ? "·" : signed(v, Math.abs(v) < 0.095 ? 2 : 1)}</em>
                      </span>
                    );
                  })
                : null}
              <span className="st-cell-tag">{tag(t)}</span>
            </button>
          ))}
          {tr && mk < 1 ? <span className="st-marker" aria-hidden="true" style={{ left: `calc(${(mk * 100).toFixed(2)}% - 6px)` }} /> : null}
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
      .filter((f) => f.metric === o.metric)
      .map((f) => `${causeById.get(f.cause)?.title ?? f.cause} ${signed(f.values[T] ?? 0, 2)} through ${CHANNELS.find((c) => c.id === f.channel)?.title.toLowerCase()}`);
    return `${o.label} ${o.path[T].toFixed(o.digits)} in ${story.labels[T]}${parts.length ? `: ${parts.join("; ")}` : ""}.`;
  });
  return (
    <div className="sr-only">
      <p>Cause and effect map for {story.labels[T]}. {lines.join(" ")} {hidden ? `${hidden} smaller effects are not drawn.` : ""}</p>
      {story.travel ? <p>{story.travel.sentence}</p> : null}
    </div>
  );
}
