"use client";

import { useEffect, useRef } from "react";
import { sound } from "../audio";
import { quarterLabel } from "../../model/economy";
import { SHOCKS } from "../../model/shocks";
import { useLab } from "../../store";
import { deltaUnit, fmtNum, GAME_METRICS, unitShort } from "../metrics";
import { getMission, MISSIONS, policyForTurn, type ObjectiveStatus } from "../missions";
import { responsesFor } from "../responses";
import { forecastFor, useGame, type Recap } from "../store";
import { withDecision } from "../useTurn";
import { AdviceList } from "./Advisors";
import { TrustIcon, VotesIcon } from "./Capital";
import { annual } from "../calibrate";
import { getStartYear, simulate } from "../../model/economy";
import type { Mission } from "../missions";

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
      const timers = Array.from({ length: stars }, (_, i) => window.setTimeout(() => sound.stinger("star"), 700 + i * 180));
      return () => timers.forEach(clearTimeout);
    } else if (modal.outcome.kind === "lost") sound.stinger("lose");
  }, [modal]);

  // The framework opened from a recap replaces it on screen; closing the framework brings the recap back.
  if (!modal || framework) return null;
  return (
    <div className="game-modal-backdrop" role="presentation">
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

  return (
    <div className="game-card game-recap" role="dialog" aria-modal="true" aria-labelledby="recap-title">
      <div className="game-paper">
        <div className="game-masthead">
          <span>{recap.headline.paper}</span>
          <span>{quarterLabel(recap.quarter)}</span>
        </div>
        <h2 id="recap-title" className="game-headline">{recap.headline.text}</h2>
      </div>
      <div className="game-stamp-row">
        <p className="game-stamp-note">
          {recap.statuses.filter((st) => !mission.objectives.find((o) => o.id === st.id)?.bonus && (st.after === "on-track" || st.after === "met")).length} of {mission.objectives.filter((o) => !o.bonus).length} goals on track for {quarterLabel(mission.quarters)}
        </p>
        <Stamp mission={mission} recap={recap} />
      </div>

      {recap.stopReasons ? (
        <div className="game-run-recap">
          <p className="text-[0.75rem] font-semibold">
            {recap.from !== undefined && recap.quarter - recap.from > 1
              ? `Fast-forwarded ${recap.quarter - recap.from} quarters, ${quarterLabel(recap.from + 1)} to ${quarterLabel(recap.quarter)}. Changes below are over the whole stretch.`
              : `Played ${quarterLabel(recap.quarter)}.`}
          </p>
          <p className="mt-0.5 text-[0.75rem]">
            <span className="font-semibold">Stopped because:</span> {recap.stopReasons.join(" · ")}
          </p>
          {recap.skipped?.length ? (
            <ul className="mt-1 text-[0.75rem] leading-snug text-[var(--lab-ink-2)]">
              {recap.skipped.map((l) => (
                <li key={l.label}>
                  <span className="font-semibold tabular-nums">{l.label}</span> {l.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))` }}>
        {metrics.map((m) => {
          const meta = GAME_METRICS[m];
          const d = recap.now[m] - recap.prev[m];
          return (
            <div key={m} className="game-recap-stat">
              <span className="flex items-center justify-between gap-2 text-[0.75rem] font-semibold text-[var(--lab-ink-2)]">
                {meta.label}
                <StatusPill status={worstStatus(mission, recap, m)} />
              </span>
              <span className="game-recap-value font-display text-[1.7rem] font-semibold leading-none tabular-nums">
                {fmtNum(recap.now[m], meta.digits)}
                <span className="text-[0.75rem] font-normal">{unitShort(meta.unit)}</span>
              </span>
              <span className={`whitespace-nowrap text-[0.8rem] font-semibold tabular-nums ${["on-track", "met"].includes(worstStatus(mission, recap, m) ?? "") ? "text-[var(--lab-ink-2)]" : verdict(mission, m, d)}`}>
                {Math.abs(d) < 0.05 ? "unchanged" : `${d > 0 ? "▲" : "▼"} ${fmtNum(d, meta.digits, true)}${deltaUnit(meta.unit)}`}
                <span className="block text-[0.75rem] font-normal text-[var(--lab-ink-2)]">{recap.from !== undefined && recap.quarter - recap.from > 1 ? "over the stretch" : "this quarter"}</span>
              </span>
              <GoalLine mission={mission} metric={m} />
            </div>
          );
        })}
      </div>

      {changes.length ? (
        <ul className="mt-2 flex flex-col gap-1">
          {changes.map((c) => {
            const o = mission.objectives.find((x) => x.id === c.id)!;
            return (
              <li key={c.id} className="text-[0.75rem]">
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

      <h3 className="mt-3 mb-1 text-[0.75rem] font-semibold text-[var(--lab-ink-2)]">Political capital</h3>
      <div className="flex flex-wrap items-start gap-x-5 gap-y-1">
        {(["votes", "trust"] as const).map((c) => {
          const list = recap.points.entries.filter((e) => e.currency === c);
          const total = list.reduce((a, e) => a + e.amount, 0);
          return (
            <div key={c} className="min-w-[13rem] flex-1">
              <div className="flex items-center gap-1.5 text-[0.78rem] font-semibold">
                {c === "votes" ? <VotesIcon /> : <TrustIcon />} {c === "votes" ? "Votes" : "Trust"} {recap.points[c]}
                <span className={`text-[0.75rem] ${total > 0 ? "text-[var(--lab-good)]" : total < 0 ? "text-[var(--lab-bad)]" : "text-[var(--lab-ink-2)]"}`}>({total > 0 ? "+" : ""}{total} {recap.from !== undefined && recap.quarter - recap.from > 1 ? "over the stretch" : "this quarter"})</span>
              </div>
              <ul className="mt-0.5 text-[0.75rem] leading-snug text-[var(--lab-ink-2)]">
                {list.length ? groupReasons(list).map((e) => <li key={e.reason}>{e.amount > 0 ? "+" : ""}{e.amount} {e.reason}{e.times > 1 ? ` (×${e.times})` : ""}</li>) : <li>No change</li>}
              </ul>
            </div>
          );
        })}
      </div>

      <h3 className="mt-3 mb-1 text-[0.75rem] font-semibold text-[var(--lab-ink-2)]">Your advisors on the quarter ahead</h3>
      <AdviceList advice={recap.advice.map((a) => ({ ...a, text: firstSentence(a.text) }))} compact />

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
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

function ShockCard({ ids }: { ids: string[] }) {
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
  if (!main) return null;
  const spec = SHOCKS[main.kind];
  const policy = policyForTurn(config, clock);
  const options = responsesFor(main.kind, { policy, unlocked: new Set(mission.unlocks) });
  const now = main.quarter <= clock + 1;

  return (
    <div ref={dialog} tabIndex={-1} className="game-card game-shock" role="dialog" aria-modal="true" aria-labelledby="shock-title">
      <span className="game-shock-kicker">{now && main.quarter > 1 ? "Breaking news" : "On your desk"}</span>
      <h2 id="shock-title" className="game-shock-title">{spec.name}</h2>
      <p className="text-[0.82rem] leading-relaxed">{spec.description}</p>
      <p className="mt-1 text-[0.75rem] text-[var(--lab-ink-2)]">
        It hits in {quarterLabel(main.quarter)}. {options.length ? `How do you respond? Each option shows what it does to your goals by ${quarterLabel(mission.quarters)}, against holding policy.` : "Your tools are on the left."}
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="game-choice"
            onClick={() => {
              sound.play("choose");
              if (Object.keys(o.changes).length) decide(o.changes);
              close();
            }}
          >
            <span className="game-choice-head">
              <strong>{o.label}</strong>
              <OutcomeChips mission={mission} config={config} clock={clock} changes={o.changes} />
            </span>
            <span>{o.detail}</span>
          </button>
        ))}
        <button type="button" className="game-choice is-plain" onClick={close}>
          <strong>I&rsquo;ll decide myself</strong>
          <span>Close this and use the levers. You can see each one&rsquo;s effect before you commit.</span>
        </button>
      </div>
    </div>
  );
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
            <span key={n} className={n <= outcome.stars ? "is-on" : ""} style={{ animationDelay: `${n * 180}ms` }}>
              ★
            </span>
          ))}
        </div>
        <h2 id="debrief-title" className="game-shock-title text-center">Mission complete</h2>
        <p className="text-center text-[0.8rem] text-[var(--lab-ink-2)]">{mission.title}</p>
        <ul className="mt-3 flex flex-col gap-1">
          {mission.objectives.map((o) => {
            const met = !o.bonus || outcome.bonusMet.includes(o.id);
            return (
              <li key={o.id} className="text-[0.75rem]">
                <span className={`game-status is-${met ? "met" : "failed"}`}>{met ? "Met" : "Missed"}</span> {o.bonus ? "★ " : ""}
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
      <p className="text-[0.86rem] leading-relaxed">{outcome.reason}</p>
      <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--lab-ink-2)]">Rewind one quarter to try a different decision, or start the mission again. The goal cards show where the forecast was heading before each choice.</p>
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
            <p key={p} className="mb-1 text-[0.75rem] leading-relaxed">{p}</p>
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

/** What a ready-made response does to each goal by the end of the mission, against holding policy. */
function OutcomeChips({ mission, config, clock, changes }: { mission: Mission; config: import("../../model/types").ScenarioConfig; clock: number; changes: Partial<import("../../model/types").Policy> }) {
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  if (!Object.keys(changes).length) return <span className="game-outcome is-hold">Baseline</span>;
  const end = mission.quarters;
  const base = forecastFor(config, clock)[end];
  const next = forecastFor(withDecision(config, clock + 1, changes), clock)[end];
  const parts = metrics.map((m) => ({ m, d: next[m] - base[m] })).filter((p) => Math.abs(p.d) >= 0.05);
  if (!parts.length) return <span className="game-outcome is-hold">Little change</span>;
  return (
    <span className="game-outcomes" title={`Effect by ${quarterLabel(end)}, against holding policy`}>
      {parts.map((p) => (
        <span key={p.m} className={`game-outcome ${outcomeTone(mission, p.m, p.d)}`}>
          {p.d > 0 ? "▲ " : "▼ "}
          {GAME_METRICS[p.m].label} {fmtNum(p.d, GAME_METRICS[p.m].digits, true)}
          {deltaUnit(GAME_METRICS[p.m].unit)}
        </span>
      ))}
    </span>
  );
}

/** Colour a change by whether it moves toward the mission's goal for that metric. */
function verdict(mission: Mission, metric: string, d: number): string {
  const o = mission.objectives.find((x) => x.metric === metric && !x.bonus) ?? mission.objectives.find((x) => x.metric === metric);
  if (!o || Math.abs(d) < 0.05) return "text-[var(--lab-ink-2)]";
  const good = o.op === "<=" ? d < 0 : d > 0;
  return good ? "text-[var(--lab-good)]" : "text-[var(--lab-bad)]";
}

function outcomeTone(mission: Mission, metric: string, d: number): string {
  const o = mission.objectives.find((x) => x.metric === metric && !x.bonus) ?? mission.objectives.find((x) => x.metric === metric);
  if (!o) return "";
  return (o.op === "<=" ? d < 0 : d > 0) ? "is-good" : "is-bad";
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : text;
}

function worstStatus(mission: Mission, recap: Recap, metric: string): ObjectiveStatus | null {
  const order: ObjectiveStatus[] = ["failed", "at-risk", "on-track", "met"];
  const list = recap.statuses.filter((s) => mission.objectives.find((o) => o.id === s.id && o.metric === metric && !o.bonus)).map((s) => s.after);
  return order.find((o) => list.includes(o)) ?? null;
}

function StatusPill({ status }: { status: ObjectiveStatus | null }) {
  if (!status) return null;
  return <span className={`game-status is-${status}`}>{STATUS_WORD[status].charAt(0).toUpperCase() + STATUS_WORD[status].slice(1)}</span>;
}

/** "Forecast 3.9% by 2027Q4 · goal ≤ 4.5%": why a rising number can still be on track. */
function GoalLine({ mission, metric }: { mission: Mission; metric: keyof typeof GAME_METRICS }) {
  const config = useLab((st) => st.config);
  const clock = useLab((st) => st.clock);
  const o = mission.objectives.find((x) => x.metric === metric && !x.bonus);
  if (!o || clock >= mission.quarters) return null;
  const meta = GAME_METRICS[metric];
  const f = forecastFor(config, clock)[mission.quarters][metric];
  return (
    <span className="text-[0.75rem] leading-snug text-[var(--lab-ink-2)]">
      Forecast {fmtNum(f, meta.digits)}
      {unitShort(meta.unit)} by {quarterLabel(mission.quarters)} · goal {o.op === "<=" ? "≤" : "≥"} {fmtNum(o.threshold, meta.digits)}
      {unitShort(meta.unit)}
    </span>
  );
}

/** The quarter's verdict, stamped on the paper: every goal on track, or not. */
function Stamp({ mission, recap }: { mission: Mission; recap: Recap }) {
  const main = recap.statuses.filter((st) => !mission.objectives.find((o) => o.id === st.id)?.bonus);
  if (!main.length) return null;
  const bad = main.filter((st) => st.after === "at-risk" || st.after === "failed").length;
  return (
    <span className={`game-stamp ${bad ? "is-bad" : "is-good"}`} aria-label={bad ? `${bad} goal${bad > 1 ? "s" : ""} at risk` : "All goals on track"}>
      {bad ? `${bad} goal${bad > 1 ? "s" : ""} at risk` : "All goals on track"}
    </span>
  );
}
