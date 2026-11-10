"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sound } from "../audio";
import { quarterLabel } from "../../model/economy";
import { SHOCKS } from "../../model/shocks";
import { useLab, type FocusKey } from "../../store";
import { PLACE } from "../../scene/places";
import { deltaUnit, fmtNum, GAME_METRICS, unitShort } from "../metrics";
import { getMission, knownConfig, MISSIONS, policyForTurn, type MetricKey, type ObjectiveStatus } from "../missions";
import { responsesFor } from "../responses";
import { forecastFor, useGame, type Recap } from "../store";
import { withDecision } from "../useTurn";
import { decompose, type DecompMetric } from "../decompose";
import { Reactions } from "./Advisors";
import { GoalChart, goalEffect } from "./Goals";
import Glyph from "./Glyph";
import { Valence, type Tone } from "./Valence";
import { annual } from "../calibrate";
import { getStartYear, simulate } from "../../model/economy";
import type { Mission } from "../missions";
import { DUR_SLOW, useTween } from "./useTween";
import { useScrollMore } from "../../components/strip";
import { useSceneId } from "../../scenes/registry";
import { headline, matters, metricRef, pushSize, signed, unitWord, type HeadPush, type MetricId, type Story } from "../../scenes/story/model";
import { useStoryShown } from "../../scenes/story/shown";

/** Gap between the debrief stars, shared by their animation delay and their sound pings. */
const STAR_STAGGER = 120;

/** A media query read once after mount (false on the server and in the first render). */
function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => setMatch(window.matchMedia(query).matches), [query]);
  return match;
}

/** Focus the primary action when a card opens, and let Enter press it. */
function usePrimary() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}

export default function Modals() {
  const modal = useGame((s) => s.modal);
  const framework = useGame((s) => s.framework);

  // Each card announces itself; the debrief plays a stinger and a ping per star.
  useEffect(() => {
    if (!modal) return;
    if (modal.kind === "recap") sound.play("open");
    else if (modal.kind === "shock") {
      sound.play("alert");
      sound.stinger("shock");
    } else if (modal.outcome.kind === "won") {
      sound.stinger("win");
      const stars = modal.outcome.stars;
      // Each ping lands as its star finishes: star n starts at n * STAR_STAGGER and runs DUR_SLOW.
      const timers = Array.from({ length: stars }, (_, i) => window.setTimeout(() => sound.stinger("star"), (i + 1) * STAR_STAGGER + DUR_SLOW));
      return () => timers.forEach(clearTimeout);
    } else if (modal.outcome.kind === "lost") sound.stinger("lose");
  }, [modal]);

  // The framework opened from a recap replaces it on screen; closing the framework brings the recap back.
  if (!modal || framework) return null;
  return (
    <div className={`game-modal-backdrop is-${modal.kind}`} role="presentation">
      {modal.kind === "recap" ? <RecapCard recap={modal.recap} /> : modal.kind === "shock" ? <ShockCard ids={modal.shocks.map((s) => s.id)} /> : <DebriefCard />}
    </div>
  );
}

const STATUS_WORD: Record<ObjectiveStatus, string> = { met: "met", failed: "missed", "on-track": "on track", "at-risk": "at risk" };

function RecapCard({ recap }: { recap: Recap }) {
  const close = useGame((s) => s.closeModal);
  const setFramework = useGame((s) => s.setFramework);
  const missionId = useGame((s) => s.missionId);
  const mission = getMission(missionId ?? "")!;
  const primary = usePrimary();
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  const changes = recap.statuses.filter((s) => s.before !== s.after);
  const lead = outcomeHeadline(mission, recap);
  const roomy = useMedia("(min-width: 1100px) and (min-height: 1040px)");
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollMore(bodyRef, recap.quarter);

  return (
    <div className="game-card game-recap" role="dialog" aria-modal="true" aria-labelledby="recap-title">
      {/* The sheet scrolls in its own body, so the actions bar below never sits over its text. */}
      <div ref={bodyRef} className="game-recap-body">
      <div className="game-paper">
        <div className="game-masthead-row">
          <p className="game-masthead">{recap.headline.paper}</p>
          <EditionMark mission={mission} recap={recap} />
        </div>
        <p className="game-dateline">
          <span>{quarterLabel(recap.quarter)} edition</span>
          <span>{mission.number ? `Mission ${mission.number} · ${mission.title}` : mission.title}</span>
        </p>
        <h2 id="recap-title" className="game-headline">{lead}</h2>
        {lead !== recap.headline.text ? <p className="game-dek">{recap.headline.text}</p> : null}
      </div>
      <Reactions advice={recap.advice} />
      {/* The verdict on the left; the score (Votes, Trust) boxed on the right, above the fold. */}
      <div className="game-stamp-row has-score">
        <div className="game-stamp-lead">
          <Stamp mission={mission} recap={recap} />
          <StarNote mission={mission} recap={recap} />
        </div>
        <CapitalStrip recap={recap} />
      </div>
      {/* Why, right under the verdict (always above the fold): the biggest push on the goal that
          matters most, and the player's own, with when it lands. In both views; the island view
          adds where to look. */}
      <RecapWhy mission={mission} recap={recap} />
      <WatchLine mission={mission} recap={recap} />

      {recap.stopReasons ? (
        <div className="game-run-recap">
          <p className="text-(length:--t-sm) font-semibold">
            {recap.from !== undefined && recap.quarter - recap.from > 1
              ? `Fast-forwarded ${recap.quarter - recap.from} quarters, ${quarterLabel(recap.from + 1)} to ${quarterLabel(recap.quarter)}. Changes below are over the whole stretch.`
              : `Played ${quarterLabel(recap.quarter)}.`}
          </p>
          <p className="mt-0.5 text-(length:--t-sm)">
            <span className="font-semibold">Stopped because:</span> {recap.stopReasons.join(" · ")}
          </p>
          {recap.skipped?.length ? (
            <ul className="mt-1 text-(length:--t-sm) leading-snug text-[var(--lab-ink-2)]">
              {recap.skipped.map((l) => (
                <li key={l.label}>
                  <span className="font-semibold tabular-nums">{l.label}</span> {l.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className={`game-recap-stats is-${Math.min(metrics.length, 4)}`}>
        {metrics.map((m) => {
          const meta = GAME_METRICS[m];
          const d = recap.now[m] - recap.prev[m];
          const tone = Math.abs(d) >= 0.05 ? toneFor(mission, m, d) : "neutral";
          return (
            <div key={m} className="game-recap-stat">
              <span className="game-recap-label">{meta.label}</span>
              <span className="game-recap-value font-display font-bold leading-none tabular-nums">
                <CountUp from={recap.prev[m]} to={recap.now[m]} digits={meta.digits} />
                <span className="game-recap-unit">{unitShort(meta.unit)}</span>
              </span>
              {/* The quarter's move is a fact, in ink: the verdict lives on the forecast line below. */}
              <span className="game-recap-change whitespace-nowrap tabular-nums">
                {Math.abs(d) < 0.05 ? (
                  "unchanged"
                ) : (
                  <>
                    <Glyph name={d > 0 ? "up" : "down"} /> {fmtNum(Math.abs(d), meta.digits)}
                    {deltaUnit(meta.unit)}
                  </>
                )}{" "}
                <span className="game-recap-when">{recap.from !== undefined && recap.quarter - recap.from > 1 ? "over the stretch" : "this quarter"}</span>
                {/* The move's verdict, in the past tense: this quarter's step toward the goal helped, away from it hurt.
                    The goal's own verdict below says whether that changed its course ("Still on track"). */}
                {tone !== "neutral" ? <> <Valence tone={tone} label={tone === "good" ? "helped" : "hurt"} /></> : null}
              </span>
              <span className="game-recap-chart">
                <GoalChart metric={m} height={118} />
              </span>
              <GoalLine mission={mission} metric={m} status={worstStatus(mission, recap, m)} was={worstStatus(mission, recap, m, "before")} move={tone} />
            </div>
          );
        })}
      </div>

      {changes.length ? (
        <ul className="mt-2 flex flex-col gap-1">
          {changes.map((c) => {
            const o = mission.objectives.find((x) => x.id === c.id)!;
            return (
              <li key={c.id} className="text-(length:--t-sm)">
                <span className={`game-status is-${c.after}`}>{STATUS_WORD[c.after]}</span> {o.label}
              </li>
            );
          })}
        </ul>
      ) : null}

      {recap.election ? (
        <p className={`game-banner ${recap.election.won ? "is-good" : "is-bad"}`}>
          {recap.election.won ? `Election won with ${recap.election.votes} votes. Your mandate continues.` : `Election lost with ${recap.election.votes} votes.`}
        </p>
      ) : null}
      {recap.crisis ? <p className="game-banner is-bad">Trust has collapsed. Markets will test you next quarter.</p> : null}

      <details className="game-recap-more" open={roomy || undefined}>
      <summary>Why votes and trust moved</summary>
      <h3 className="mt-2 mb-1 text-(length:--t-xs) font-semibold text-[var(--lab-ink-2)]">Political capital</h3>
      <div className="flex flex-wrap items-start gap-x-5 gap-y-1">
        {(["votes", "trust"] as const).map((c) => {
          const list = recap.points.entries.filter((e) => e.currency === c);
          const total = list.reduce((a, e) => a + e.amount, 0);
          return (
            <div key={c} className="min-w-[13rem] flex-1">
              <div className="flex items-center gap-1.5 text-(length:--t-sm) font-semibold">
                {c === "votes" ? "Votes" : "Trust"} {recap.points[c]}
                <span className={`text-(length:--t-sm) ${total > 0 ? "text-[var(--lab-good)]" : total < 0 ? "text-[var(--lab-bad)]" : "text-[var(--lab-ink-2)]"}`}>({total > 0 ? "+" : ""}{total} {recap.from !== undefined && recap.quarter - recap.from > 1 ? "over the stretch" : "this quarter"})</span>
              </div>
              <ul className="mt-0.5 text-(length:--t-sm) leading-snug text-[var(--lab-ink-2)]">
                {list.length ? groupReasons(list).map((e) => <li key={e.reason}>{e.amount > 0 ? "+" : ""}{e.amount} {e.reason}{e.times > 1 ? ` (×${e.times})` : ""}</li>) : <li>No change</li>}
              </ul>
            </div>
          );
        })}
      </div>

      </details>
      </div>

      <div className="game-recap-actions mt-3 flex flex-wrap items-center justify-end gap-2">
        <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setFramework(true)} title="Every sector, every channel, and why things moved">
          See every sector
        </button>
        <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md game-recap-go" onClick={close}>
          Plan {quarterLabel(recap.quarter + 1)}
        </button>
      </div>
    </div>
  );
}

/**
 * Counts a recap figure up from last quarter's value to this one's. The moving
 * text is hidden from screen readers, which read the final value instead.
 */
function CountUp({ from, to, digits }: { from: number; to: number; digits: number }) {
  const shown = useTween(to, DUR_SLOW, from);
  return (
    <>
      <span aria-hidden="true">{fmtNum(shown, digits)}</span>
      <span className="sr-only">{fmtNum(to, digits)}</span>
    </>
  );
}

function ShockCard({ ids }: { ids: string[] }) {
  const sceneId = useSceneId();
  const close = useGame((s) => s.closeModal);
  const decide = useGame((s) => s.decide);
  const missionId = useGame((s) => s.missionId);
  const mission = getMission(missionId ?? "")!;
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  // Focus the card itself, so no option looks pre-selected.
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => dialog.current?.focus({ preventScroll: true }), []);
  const shocks = config.shocks.filter((s) => ids.includes(s.id));
  const main = shocks[0];
  const pick = (changes: Partial<import("../../model/types").Policy>) => {
    sound.play("choose");
    if (Object.keys(changes).length) decide(changes);
    close();
  };
  const keyed = useRef(pick);
  keyed.current = pick;
  const optionsRef = useRef<Partial<import("../../model/types").Policy>[]>([]);
  // The district the news lands on pulses harder while the card is open.
  const kind = main?.kind;
  useEffect(() => {
    const hit = kind ? shockDistrict(kind) : null;
    useLab.setState({ shockFocus: hit?.key ?? null });
    return () => useLab.setState({ shockFocus: null });
  }, [kind]);
  // Keys 1-4 choose, as Enter ends a quarter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      const list = optionsRef.current;
      if (n <= list.length) {
        e.preventDefault();
        keyed.current(list[n - 1]);
      } else if (n === list.length + 1) {
        e.preventDefault();
        keyed.current({});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!main) return null;
  const spec = SHOCKS[main.kind];
  const policy = policyForTurn(config, clock);
  const options = responsesFor(main.kind, { policy, unlocked: new Set(mission.unlocks) });
  optionsRef.current = options.map((o) => o.changes);
  const now = main.quarter <= clock + 1;
  const hit = shockDistrict(main.kind);
  const where = hit && PLACE[hit.key] ? { place: PLACE[hit.key]!, what: hit.what } : null;

  return (
    <div ref={dialog} tabIndex={-1} className="game-card game-shock" role="dialog" aria-modal="true" aria-labelledby="shock-title">
      {/* The news leads as an event: a kicker naming what it hits (the goal; the district while
          the island is showing), then the headline. */}
      <p className="game-shock-kicker">
        {now && main.quarter > 1 ? "Breaking news" : "On your desk"}
        {where && sceneId === "island" ? (
          <span className="game-shock-kicker-where"> · hits the {where.place.toLowerCase()}</span>
        ) : hit ? (
          <span className="game-shock-kicker-where"> · hits {hit.what}</span>
        ) : null}
      </p>
      <h2 id="shock-title" className="game-shock-title">{spec.name}</h2>
      <p className="game-shock-dek">{spec.description}</p>
      <ShockSize mission={mission} shockId={main.id} quarter={main.quarter} />
      <p className="game-shock-intro">
        It hits in {quarterLabel(main.quarter)}. {options.length ? `How do you respond? ${optionsSentence(mission)}` : "Your tools are on the left."}
      </p>
      {where && sceneId === "island" ? (
        <p className="game-shock-where">
          <strong>On the island:</strong> the {where.place.toLowerCase()} is pulsing ({where.what}).
        </p>
      ) : null}
      {/* Each option is one button: its number key is the affordance, no per-row "Choose". */}
      <ol className="game-choices" aria-label="Your response">
        {options.map((o, i) => (
          <li key={o.id}>
            <button type="button" className="game-choice" onClick={() => pick(o.changes)}>
              <kbd className="game-choice-key" aria-hidden="true">{i + 1}</kbd>
              <span className="game-choice-body">
                <span className="game-choice-head">
                  <strong>{o.label}</strong>
                </span>
                <OutcomeChips mission={mission} config={config} clock={clock} changes={o.changes} />
                <span className="game-choice-detail">{o.detail}</span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="game-choice is-plain" onClick={close}>
            <kbd className="game-choice-key" aria-hidden="true">{options.length + 1}</kbd>
            <span className="game-choice-body">
              <span className="game-choice-head">
                <strong>I&rsquo;ll decide myself</strong>
              </span>
              <span className="game-choice-detail">Close this and use the levers. You can see each one&rsquo;s effect before you commit.</span>
            </span>
          </button>
        </li>
      </ol>
    </div>
  );
}

/**
 * The shock's size in the forecast, under its description (which gives the size of the impulse
 * alone): its push on the goal it moves most, with knock-ons, from the same shocks-vs-policy
 * decomposition the map draws, e.g. "In the forecast, with knock-ons: inflation +2.4 pp in
 * 2026Q1, at most +5.3 pp in 2026Q4."
 */
function ShockSize({ mission, shockId, quarter }: { mission: Mission; shockId: string; quarter: number }) {
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  const turns = useGame((s) => s.turns);
  const start = turns[0] ?? config;
  const end = mission.quarters;
  const decomp = useMemo(() => decompose(knownConfig(config, clock), start, end), [config, clock, start, end]);
  const comp = decomp.components.find((c) => c.id === `shock:${shockId}`);
  if (!comp) return null;
  const goals = Array.from(new Set(mission.objectives.map((o) => o.metric))).filter((m): m is MetricKey & DecompMetric => m in comp.values);
  const ref = (m: string) => (m in REF ? REF[m] : 1);
  let best: { m: MetricKey & DecompMetric; at: number; n: number } | null = null;
  for (const m of goals) {
    const vals = comp.values[m];
    for (let t = Math.max(1, quarter); t <= end; t++) {
      const n = Math.abs(vals[t] ?? 0) / ref(m);
      if (!best || n > best.n) best = { m, at: t, n };
    }
  }
  if (!best || best.n < 0.05) return null;
  const meta = GAME_METRICS[best.m];
  const vals = comp.values[best.m];
  const unit = deltaUnit(meta.unit);
  const d = meta.digits;
  const first = vals[Math.min(end, Math.max(1, quarter))] ?? 0;
  const peak = vals[best.at] ?? 0;
  const firstQ = Math.min(end, Math.max(1, quarter));
  return (
    <p className="game-shock-size">
      In the forecast, with knock-ons: {meta.label.toLowerCase()} {signed(first, d)}
      {unit} in {quarterLabel(firstQ)}
      {best.at !== firstQ && Math.abs(peak - first) >= 0.05 * ref(best.m) ? (
        <>
          , at most {signed(peak, d)}
          {unit} in {quarterLabel(best.at)}
        </>
      ) : null}
      .
    </p>
  );
}

/** One unit of push per goal, to compare a shock's pull on goals with different units (as the map's arrows). */
const REF: Record<string, number> = { infl: 1, growth: 1, debt: 2, unemp: 0.5, ob: 1, ca: 1, reserves: 0.5, spread: 50, rate: 1 };

/** "Each option shows what it does to your goals …": by the end, or at the quarter that decides an every-quarter goal. */
function optionsSentence(mission: Mission): string {
  const end = quarterLabel(mission.quarters);
  const metrics = Array.from(new Set(mission.objectives.filter((o) => !o.bonus).map((o) => o.metric)));
  const parts = metrics.map((m) => {
    const o = mission.objectives.find((x) => x.metric === m && !x.bonus)!;
    return { m, every: o.when === "every", text: o.when === "every" ? `${GAME_METRICS[m].label.toLowerCase()} at its ${o.op === ">=" ? "low" : "high"} point` : `${GAME_METRICS[m].label.toLowerCase()} by ${end}` };
  });
  if (!parts.some((p) => p.every)) return `Each option shows what it does to your goals by ${end}, against holding policy.`;
  return `Each option shows what it does to your goals, against holding policy: ${parts.map((p) => p.text).join(", ")}.`;
}

/** The district a shock lands on first, from the shape of its impulse. */
function shockDistrict(kind: keyof typeof SHOCKS): { key: FocusKey; what: string } | null {
  const spec = SHOCKS[kind];
  const imp = { ...spec.at(1, 1), ...spec.at(0, 1) };
  if (imp.inflAdd) return { key: "infl", what: "inflation" };
  if (imp.oilMult !== undefined && imp.oilMult !== 1) return { key: "oil", what: "oil prices" };
  if (imp.spendingAdd || imp.debtOneOff) return { key: "debt", what: "public debt" };
  if (imp.riskPremiumAdd || imp.capitalFlowAdd) return { key: "reserves", what: "reserves and capital flows" };
  if (imp.globalGrowthAdd || imp.partnerGrowthAdd || (imp.commodityMult !== undefined && imp.commodityMult !== 1)) return { key: "ca", what: "exports" };
  if (imp.gapAdd || (imp.potentialLevelMult !== undefined && imp.potentialLevelMult !== 1)) return { key: "growth", what: "output" };
  if (imp.credAdd) return { key: "cred", what: "credibility" };
  return null;
}

function DebriefCard() {
  const modal = useGame((s) => s.modal);
  const missionId = useGame((s) => s.missionId);
  const startMission = useGame((s) => s.startMission);
  const rewind = useGame((s) => s.rewind);
  const restart = useGame((s) => s.restart);
  const setScreen = useGame((s) => s.setScreen);
  const primary = usePrimary();
  const mission = getMission(missionId ?? "")!;
  if (modal?.kind !== "debrief") return null;
  const outcome = modal.outcome;
  const next = mission.number ? MISSIONS.find((m) => m.number === mission.number + 1) : undefined;

  if (outcome.kind === "won") {
    return (
      <div className="game-card game-debrief is-won" role="dialog" aria-modal="true" aria-labelledby="debrief-title">
        <div className="game-stars" aria-label={`${outcome.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= outcome.stars ? "is-on" : ""} style={{ animationDelay: `${n * STAR_STAGGER}ms` }}>
              <Glyph name={n <= outcome.stars ? "star" : "star-outline"} />
            </span>
          ))}
        </div>
        <h2 id="debrief-title" className="game-shock-title text-center">Mission complete</h2>
        <p className="text-center text-(length:--t-sm) text-[var(--lab-ink-2)]">{mission.title}</p>
        <ul className="mt-3 flex flex-col gap-1">
          {mission.objectives.map((o) => {
            const met = !o.bonus || outcome.bonusMet.includes(o.id);
            return (
              <li key={o.id} className="text-(length:--t-sm)">
                <span className={`game-status is-${met ? "met" : "failed"}`}>{met ? "Met" : "Missed"}</span> {o.bonus ? <><Glyph name="star" label="Extra star" />{" "}</> : null}
                {o.label}
              </li>
            );
          })}
        </ul>
        <p className="game-lesson">{mission.lesson}</p>
        <Comparison mission={mission} />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>All missions</button>
          <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={restart}>Play again</button>
          {next ? (
            <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={() => startMission(next.id)}>
              Next: {next.title}
            </button>
          ) : mission.number === 0 ? (
            <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={() => setScreen("missions")}>
              Choose another
            </button>
          ) : (
            <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={() => setScreen("sandbox")}>
              Open free play
            </button>
          )}
        </div>
      </div>
    );
  }

  if (outcome.kind !== "lost") return null;
  return (
    <div className="game-card game-debrief is-lost" role="dialog" aria-modal="true" aria-labelledby="debrief-title">
      <h2 id="debrief-title" className="game-shock-title">Mission failed</h2>
      <p className="text-(length:--t-sm) leading-relaxed">{outcome.reason}</p>
      <p className="mt-2 text-(length:--t-sm) leading-relaxed text-[var(--lab-ink-2)]">Rewind one quarter to try a different decision, or start the mission again. The goal cards show where the forecast was heading before each choice.</p>
      <Comparison mission={mission} />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>All missions</button>
        <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={restart}>Restart mission</button>
        <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={rewind}>Rewind one quarter</button>
      </div>
    </div>
  );
}

const ROWS = [
  { key: "growth", label: "Growth, %" },
  { key: "infl", label: "Inflation, %" },
  { key: "balance", label: "Budget balance, % GDP" },
  { key: "debt", label: "Debt, % GDP (year end)" },
] as const;

/** Year by year: your path next to what happened (or the WEO projection), plus the story for history. */
function Comparison({ mission }: { mission: Mission }) {
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  if (!mission.comparison) return null;
  const mine = simulate(config).path;
  const theirs = simulate(mission.comparison.config).path;
  const start = getStartYear();
  const years = Array.from({ length: Math.floor(Math.min(clock, mission.quarters) / 4) }, (_, i) => start + i);
  return (
    <div className="mt-3">
      {years.length ? (
        <table className="game-compare">
          <thead>
            <tr>
              <th scope="col">You / {mission.comparison.label.toLowerCase()}</th>
              {years.map((y) => (
                <th key={y} scope="col">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                {years.map((y) => {
                  const a = annual(mine, y, start)[r.key];
                  const b = annual(theirs, y, start)[r.key];
                  const better = r.key === "growth" || r.key === "balance" ? a > b + 0.05 : r.key === "debt" || r.key === "infl" ? a < b - 0.05 : false;
                  const worse = r.key === "growth" || r.key === "balance" ? a < b - 0.05 : a > b + 0.05;
                  return (
                    <td key={y} className={better ? "is-better" : worse ? "is-worse" : ""}>
                      <strong>{a.toFixed(1)}</strong> <span>/ {b.toFixed(1)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {mission.comparison.story ? (
        <div className="mt-2">
          <h3 className="game-section">What actually happened</h3>
          {mission.comparison.story.map((p) => (
            <p key={p} className="mb-1 text-(length:--t-sm) leading-relaxed">{p}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Merge repeated reasons ("Prices rising fast (8.4%)", "Prices rising fast (8.8%)") into one line. */
function groupReasons(list: { amount: number; reason: string }[]) {
  const out = new Map<string, { reason: string; amount: number; times: number }>();
  for (const e of list) {
    const key = e.reason.replace(/\s*\([^)]*\)\s*$/, "");
    const prev = out.get(key);
    if (prev) {
      prev.amount += e.amount;
      prev.times += 1;
    } else out.set(key, { reason: key, amount: e.amount, times: 1 });
  }
  return [...out.values()];
}

/**
 * What a ready-made response does to each goal, against holding policy: by the end of the
 * mission, or, for a goal that must hold every quarter, at the quarter that decides it on the
 * option's own path (its low or high point, or its first miss), as the goal cards read it.
 */
function OutcomeChips({ mission, config, clock, changes }: { mission: Mission; config: import("../../model/types").ScenarioConfig; clock: number; changes: Partial<import("../../model/types").Policy> }) {
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  if (!Object.keys(changes).length) return <span className="game-outcome is-hold">Baseline</span>;
  const end = mission.quarters;
  const base = forecastFor(config, clock);
  const next = forecastFor(withDecision(config, clock + 1, changes), clock);
  const parts = metrics
    .map((m) => {
      const o = mission.objectives.find((x) => x.metric === m && !x.bonus);
      const e = goalEffect(o, next, base, clock, end, m);
      // Low point against low point when they fall in different quarters ("at its low point").
      return { m, d: e.d, at: e.at ? { q: e.at.other ? null : quarterLabel(e.at.q), word: e.at.word } : null };
    })
    .filter((p) => Math.abs(p.d) >= 0.05);
  if (!parts.length) return <span className="game-outcome is-hold">Little change</span>;
  return (
    <span className="game-outcomes" title={`Effect against holding policy: by ${quarterLabel(end)}, or at the quarter that decides an every-quarter goal`}>
      {parts.map((p, i) => (
        <span key={p.m} className={`game-outcome ${outcomeTone(mission, p.m, p.d)}`}>
          <span className="game-outcome-name">{GAME_METRICS[p.m].label}</span>{" "}
          <b className="game-outcome-d">
            <Glyph name={p.d > 0 ? "up" : "down"} /> {fmtNum(Math.abs(p.d), GAME_METRICS[p.m].digits)}
            {deltaUnit(GAME_METRICS[p.m].unit)}
          </b>
          {p.at ? (
            <span className="game-outcome-at">
              {p.at.q ? (
                <>
                  {" "}
                  in&nbsp;{p.at.q}
                  <span className="game-outcome-word"> ({p.at.word})</span>
                </>
              ) : (
                <> on its {p.at.word}</>
              )}
            </span>
          ) : null}{" "}
          <Valence tone={toneFor(mission, p.m, p.d)} />
          {i < parts.length - 1 ? (
            <span className="game-outcome-sep" aria-hidden="true">
              {" "}
              ·
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

/** Whether a change moves toward the mission's goal for that metric. */
function toneFor(mission: Mission, metric: string, d: number): Tone {
  const o = mission.objectives.find((x) => x.metric === metric && !x.bonus) ?? mission.objectives.find((x) => x.metric === metric);
  if (!o || Math.abs(d) < 0.05) return "neutral";
  return (o.op === "<=" ? d < 0 : d > 0) ? "good" : "bad";
}

const outcomeTone = (mission: Mission, metric: string, d: number) => `is-${toneFor(mission, metric, d)}`;

const trimNum = (v: number, d: number) => v.toFixed(d).replace(/\.?0+$/, "");

/**
 * The recap's headline written from the outcome: what the bank did and what moved the most
 * among the goals, e.g. "Central bank lifts rates to 10.5% as food price surge pushes
 * inflation to 6.9%". The generic news line becomes the dek under it.
 */
function outcomeHeadline(mission: Mission, recap: Recap): string {
  const { prev, now } = recap;
  const dRate = now.rate - prev.rate;
  const rate = Math.abs(dRate) >= 0.1 ? `Central bank ${dRate > 0 ? "lifts" : "cuts"} rates to\u00a0${trimNum(now.rate, 2)}%` : null;
  const judged = Array.from(new Set(mission.objectives.filter((o) => !o.bonus).map((o) => o.metric)));
  const moves = judged.map((m) => ({ m, d: now[m] - prev[m] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const top = moves[0];
  const shock = recap.events.find((e) => e.kind === "shock");
  if (!top || Math.abs(top.d) < 0.05) return rate ?? recap.headline.text;
  const meta = GAME_METRICS[top.m];
  const name = meta.label.toLowerCase();
  const value = `${fmtNum(now[top.m], meta.digits)}${unitShort(meta.unit) === "%" ? "%" : unitShort(meta.unit)}`;
  const clause = shock
    ? `${shock.title.toLowerCase()} ${top.d > 0 ? "pushes" : "drags"} ${name} to\u00a0${value}`
    : `${name} ${top.d > 0 ? "rises" : "falls"} to\u00a0${value}`;
  if (rate) return `${rate} as ${clause}`;
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

function worstStatus(mission: Mission, recap: Recap, metric: string, when: "before" | "after" = "after"): ObjectiveStatus | null {
  const order: ObjectiveStatus[] = ["failed", "at-risk", "on-track", "met"];
  const list = recap.statuses.filter((s) => mission.objectives.find((o) => o.id === s.id && o.metric === metric && !o.bonus)).map((s) => s[when]);
  return order.find((o) => list.includes(o)) ?? null;
}

/**
 * The goal's verdict, worded against the quarter's move so the two never contradict each other:
 * a move that hurt a goal still on track reads "Still on track", one that helped a goal still at
 * risk "Still at risk"; a change of verdict says so ("Back on track", "Now at risk").
 */
function verdictWord(status: ObjectiveStatus, was: ObjectiveStatus | null, move: Tone): string {
  const changed = was !== null && was !== status;
  if (status === "on-track") return changed && (was === "at-risk" || was === "failed") ? "Back on track" : move === "bad" ? "Still on track" : "On track";
  if (status === "at-risk") return changed && (was === "on-track" || was === "met") ? "Now at risk" : move === "good" ? "Still at risk" : "At risk";
  if (status === "met") return move === "bad" ? "Still met" : "Met";
  return !changed && move === "good" ? "Already missed" : "Missed";
}

function StatusPill({ status, was = null, move = "neutral" }: { status: ObjectiveStatus | null; was?: ObjectiveStatus | null; move?: Tone }) {
  if (!status) return null;
  return <span className={`game-status is-${status}`}>{verdictWord(status, was, move)}</span>;
}

/** "■ Still on track · forecast 3.9% by 2027Q4, goal ≤ 4.5%": the goal's one verdict, and why. */
function GoalLine({ mission, metric, status, was = null, move = "neutral" }: { mission: Mission; metric: keyof typeof GAME_METRICS; status: ObjectiveStatus | null; was?: ObjectiveStatus | null; move?: Tone }) {
  const config = useLab((st) => st.config);
  const clock = useLab((st) => st.clock);
  const o = mission.objectives.find((x) => x.metric === metric && !x.bonus);
  if (!o) return null;
  const meta = GAME_METRICS[metric];
  const unit = unitShort(meta.unit);
  const done = clock >= mission.quarters;
  const f = forecastFor(config, clock)[mission.quarters][metric];
  return (
    <span className="game-recap-goal">
      <StatusPill status={status} was={was} move={move} />
      <span className="game-recap-goal-text">
        {done ? "" : <>Forecast&nbsp;{fmtNum(f, meta.digits)}{unit} by&nbsp;{quarterLabel(mission.quarters)}, </>}
        goal&nbsp;{o.op === "<=" ? "≤" : "≥"}&nbsp;{fmtNum(o.threshold, meta.digits)}
        {unit}
      </span>
    </span>
  );
}

/** Where to look on the island: the district whose goal figure moved most this quarter. */
const WATCH: Partial<Record<string, string>> = {
  infl: "the campus flags",
  growth: "the smoke over industry",
  unemp: "the lights in the houses",
  debt: "the treasury tower",
  ca: "the ships in the port",
  reserves: "the gold in the vault",
  rate: "the central bank",
};

/**
 * The recap's island hint: where to look for the goal the recap is about (the Why line's goal,
 * a goal in trouble first); else the judged figure that moved most this quarter.
 */
function WatchLine({ mission, recap }: { mission: Mission; recap: Recap }) {
  // The pointers name island landmarks; the other scene concepts label themselves.
  const sceneId = useSceneId();
  const story = useStoryShown((s) => s.story);
  if (sceneId !== "island") return null;
  const about = story && story.clock === recap.quarter ? whyGoal(mission, recap, story) : null;
  let m: string | null = about && WATCH[about] ? about : null;
  if (!m) {
    const judged = Array.from(new Set(mission.objectives.filter((o) => !o.bonus).map((o) => o.metric)));
    const top = judged.map((k) => ({ k, d: recap.now[k] - recap.prev[k] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    if (!top || Math.abs(top.d) < 0.1 || !WATCH[top.k]) return null;
    m = top.k;
  }
  // The figure itself is on the goal's card just below; the line only says where to look.
  return (
    <p className="game-recap-watch">
      <strong>On the island:</strong> watch {WATCH[m]} ({GAME_METRICS[m as MetricKey].label.toLowerCase()}).
    </p>
  );
}

/** "Food price surge" → "food price surge" mid-sentence; "IMF …" keeps its capitals. */
const lowerFirst = (s: string) => (s.length > 1 && /[A-Z]/.test(s[1]) ? s : s.charAt(0).toLowerCase() + s.slice(1));
/** A cause named mid-sentence: the map's "Its own drift" card needs its owner in a sentence. */
const causeName = (p: HeadPush) => (p.cause.kind === "momentum" ? "the economy's own drift" : lowerFirst(p.cause.title));
/** "+2.4 pp", "−0.07 pp", "+30 bp", "−0.5 mo": a push in its goal's units. */
const pushAmount = (v: number, m: MetricId) => `${pushSize(v, m)}${unitWord(m) === " pp" ? " pp" : ""}`;
const STATUS_RANK: Record<ObjectiveStatus, number> = { failed: 0, "at-risk": 1, "on-track": 2, met: 3 };

/**
 * The goal that matters most this quarter: one in trouble first (missed, then at risk), and
 * among equals the one that moved most for its scale; only goals the map draws.
 */
function whyGoal(mission: Mission, recap: Recap, story: Story): MetricId | null {
  const shown = new Set<string>(story.outcomes.map((o) => o.metric));
  const judged = Array.from(new Set(mission.objectives.filter((o) => !o.bonus && shown.has(o.metric)).map((o) => o.metric as MetricId)));
  const rank = (m: MetricId) => STATUS_RANK[worstStatus(mission, recap, m) ?? "on-track"];
  const moved = (m: MetricId) => Math.abs((recap.now[m] ?? 0) - (recap.prev[m] ?? 0)) / metricRef(m);
  return judged.sort((a, b) => rank(a) - rank(b) || moved(b) - moved(a))[0] ?? null;
}

/**
 * When the player's own push lands: its size at the goal date, or, when it is biggest well
 * before then (a rate move on growth peaks within a year, then fades), its peak and when.
 * With one lever moved, that is the strip (forecast against "had you changed nothing"); with
 * several, the named lever's own flows alone, so one lever is never credited with all moves.
 */
function landing(story: Story, mine: HeadPush, T: number): { value: number; label: string; t: number; peak: boolean } | null {
  if (story.end <= T) return null;
  const own = new Set(story.causes.filter((c) => c.kind === "lever").map((c) => c.id));
  const strip = own.size === 1 ? story.travel?.diffs.find((d) => d.metric === mine.metric)?.values : undefined;
  const at = (t: number) => (strip ? strip[t] : story.flows.filter((f) => f.cause === mine.cause.id && f.metric === mine.metric).reduce((a, f) => a + (f.values[t] ?? 0), 0)) ?? 0;
  let best = story.end;
  for (let t = T + 1; t < story.end; t++) if (Math.abs(at(t)) > Math.abs(at(best))) best = t;
  const end = at(story.end);
  if (best !== story.end && matters(at(best), mine.metric) && Math.abs(at(best)) >= 1.25 * Math.abs(end) && Math.abs(at(best)) - Math.abs(end) >= 0.1 * metricRef(mine.metric))
    return { value: at(best), label: story.labels[best] ?? "", t: best, peak: true };
  return matters(end, mine.metric) ? { value: end, label: story.labels[story.end] ?? "", t: story.end, peak: false } : null;
}

/** A cause named a second time in the same line: "drift", "food price surge", "your rate hike". */
const causeShort = (p: HeadPush) => (p.cause.kind === "momentum" ? "drift" : lowerFirst(p.cause.title));

/**
 * The recap's "why" line, read from the cause-and-effect map's own story (model.ts headline):
 * on the goal that matters most this quarter, the biggest push from outside the player's hands
 * and the player's own, with when it lands. Every push is a total since the mission began (the
 * map's base, unlike the card's figures, which are this quarter's changes), and every figure
 * names its quarter; when the line quotes a lever's peak, the outside push is quoted at that
 * same quarter, e.g.
 * "Why, since 2025Q4: in 2026Q1, the economy's own drift ▼ −0.6 pp on growth · your rate hike
 * ▼ −0.2 pp; by 2026Q4 (its peak): drift ▼ −1.2 pp, your rate hike ▼ −0.8 pp".
 * Shown in both views (the map publishes its story whichever view is on screen).
 */
function RecapWhy({ mission, recap }: { mission: Mission; recap: Recap }) {
  const story = useStoryShown((s) => s.story);
  const max = useStoryShown((s) => s.max);
  // The map rebuilds its story for the new quarter just after the recap opens: wait for it.
  if (!story || story.clock !== recap.quarter) return null;
  const m = whyGoal(mission, recap, story);
  if (!m) return null;
  // The map's story on that one goal: headline() then names its biggest push and the player's own there.
  const one: Story = { ...story, flows: story.flows.filter((f) => f.metric === m), outcomes: story.outcomes.filter((o) => o.metric === m) };
  const T = Math.max(story.first, Math.min(story.end, recap.quarter));
  const { top, mine } = headline(one, T, max);
  if (!top && !mine) return null;
  const goal = (top ?? mine)!.goal;
  const arrow = (v: number) => <Glyph name={v >= 0 ? "up" : "down"} />;
  const amount = (v: number) => (
    <b>
      {arrow(v)} {pushAmount(v, m)}
    </b>
  );
  const lands = mine ? landing(one, mine, T) : null;
  // The outside push at the lever's peak, all its roads together.
  const topAt = (t: number) => (top ? one.flows.filter((f) => f.cause === top.cause.id).reduce((a, f) => a + (f.values[t] ?? 0), 0) : 0);
  return (
    <p className="game-recap-why">
      <strong className="game-recap-why-key">Why, since {story.labels[0]}:</strong>{" "}
      <span className="game-recap-why-part">
        in {story.labels[T]},{" "}
        {top ? (
          <>
            {causeName(top)} {amount(top.value)} on {goal}
          </>
        ) : null}
      </span>
      {top ? <span aria-hidden="true"> · </span> : null}
      {mine ? (
        <span className="game-recap-why-part">
          {causeName(mine)} {amount(mine.value)}
          {top ? "" : ` on ${goal}`}
        </span>
      ) : (
        <span className="game-recap-why-part">{story.travel ? `your moves barely touch ${goal} yet` : "no move of yours yet"}</span>
      )}
      {mine && lands ? (
        lands.peak ? (
          <span className="game-recap-why-when">
            ; by {lands.label} (its peak):{" "}
            {top && matters(topAt(lands.t), m) ? (
              <>
                {causeShort(top)} {amount(topAt(lands.t))},{" "}
              </>
            ) : null}
            {causeShort(mine)} {amount(lands.value)}
          </span>
        ) : (
          <span className="game-recap-why-when">
            ; by {lands.label}: {causeShort(mine)} {amount(lands.value)}
          </span>
        )
      ) : null}
    </p>
  );
}

/** The quarter's verdict, leading under the headline: every goal on track, or not. */
function Stamp({ mission, recap }: { mission: Mission; recap: Recap }) {
  const main = recap.statuses.filter((st) => !mission.objectives.find((o) => o.id === st.id)?.bonus);
  if (!main.length) return null;
  const risky = main.filter((st) => st.after === "at-risk" || st.after === "failed");
  const failed = risky.some((st) => st.after === "failed");
  const names = Array.from(new Set(risky.map((st) => GAME_METRICS[mission.objectives.find((o) => o.id === st.id)!.metric].label)));
  const text = !risky.length ? "All goals on track" : names.length === 1 ? `${names[0]} goal ${failed ? "missed" : "at risk"}` : `${risky.length} goals ${failed ? "in trouble" : "at risk"}`;
  return <span className={`game-stamp ${!risky.length ? "is-good" : failed ? "is-bad" : "is-warn"}`}>{text}</span>;
}

/**
 * The edition mark beside the masthead: a flat, double-ruled "ear" box, as a newspaper's
 * index box, with the verdict in sentence case and its square marker ("On track", "At
 * risk", "Missed"). Newsprint, not a rubber stamp.
 */
function EditionMark({ mission, recap }: { mission: Mission; recap: Recap }) {
  const main = recap.statuses.filter((st) => !mission.objectives.find((o) => o.id === st.id)?.bonus);
  if (!main.length) return null;
  const failed = main.some((st) => st.after === "failed");
  const risky = failed || main.some((st) => st.after === "at-risk");
  return (
    <span className={`game-edition-mark ${risky ? (failed ? "is-bad" : "is-warn") : "is-good"}`} aria-hidden="true">
      <i />
      {failed ? "Missed" : risky ? "At risk" : "On track"}
    </span>
  );
}

/** Votes and trust, the score: a two-cell box, each new figure at display size with its change beside it. */
function CapitalStrip({ recap }: { recap: Recap }) {
  const stretch = recap.from !== undefined && recap.quarter - recap.from > 1;
  return (
    <dl className="game-recap-capital" aria-label={`Political capital ${stretch ? "over the stretch" : "this quarter"}`}>
      {(["votes", "trust"] as const).map((c) => {
        const now = recap.points[c];
        const d = recap.points.entries.filter((e) => e.currency === c).reduce((a, e) => a + e.amount, 0);
        return (
          <div key={c}>
            <dt>{c === "votes" ? "Votes" : "Trust"}</dt>
            <dd className="tabular-nums">
              {/* The new figure at display size, counting up with the goals' figures. */}
              <b><CountUp from={now - d} to={now} digits={0} /></b>
              {d ? <span className={`game-recap-capital-d ${d > 0 ? "is-up" : "is-down"}`}><Glyph name={d > 0 ? "up" : "down"} /> {Math.abs(d)} <span className="game-recap-capital-was">from {now - d}</span></span> : <span className="game-recap-capital-d">unchanged</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Next to the stamp: what's at stake for the stars, not a repeat of the verdict. */
function StarNote({ mission, recap }: { mission: Mission; recap: Recap }) {
  const bonus = mission.objectives.filter((o) => o.bonus);
  const risky = bonus.filter((o) => {
    const st = recap.statuses.find((x) => x.id === o.id)?.after;
    return st === "at-risk" || st === "failed";
  });
  if (!bonus.length) return null;
  return (
    <p className="game-stamp-note">
      <Glyph name="star" />{" "}
      {risky.length ? `${risky.length} of ${bonus.length} bonus star${bonus.length > 1 ? "s" : ""} at risk: ${risky[0].label.charAt(0).toLowerCase()}${risky[0].label.slice(1)}` : `Every bonus star still in reach`}
    </p>
  );
}
