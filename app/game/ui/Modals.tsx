"use client";

import { useEffect, useRef } from "react";
import { sound } from "../audio";
import { quarterLabel } from "../../model/economy";
import { SHOCKS } from "../../model/shocks";
import { useLab } from "../../store";
import { deltaUnit, fmtNum, GAME_METRICS, unitShort } from "../metrics";
import { getMission, MISSIONS, policyForTurn, type ObjectiveStatus } from "../missions";
import { responsesFor } from "../responses";
import { useGame, type Recap } from "../store";
import { AdviceList } from "./Advisors";
import { TrustIcon, VotesIcon } from "./Capital";

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

  if (!modal) return null;
  return (
    <div className="game-modal-backdrop" role="presentation">
      {modal.kind === "recap" ? <RecapCard recap={modal.recap} /> : modal.kind === "shock" ? <ShockCard ids={modal.shocks.map((s) => s.id)} /> : <DebriefCard />}
    </div>
  );
}

const STATUS_WORD: Record<ObjectiveStatus, string> = { met: "met", failed: "missed", "on-track": "on track", "at-risk": "at risk" };

function RecapCard({ recap }: { recap: Recap }) {
  const close = useGame((s) => s.closeModal);
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

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))` }}>
        {metrics.map((m) => {
          const meta = GAME_METRICS[m];
          const d = recap.now[m] - recap.prev[m];
          return (
            <div key={m} className="game-recap-stat">
              <span className="text-[0.64rem] font-semibold text-[var(--lab-ink-2)]">{meta.label}</span>
              <span className="text-[1.05rem] font-semibold tabular-nums">
                {fmtNum(recap.now[m], meta.digits)}
                <span className="text-[0.66rem] font-normal">{unitShort(meta.unit)}</span>
              </span>
              <span className="text-[0.64rem] tabular-nums text-[var(--lab-ink-2)]">
                {Math.abs(d) < 0.05 ? "unchanged" : `${fmtNum(d, meta.digits, true)}${deltaUnit(meta.unit)}`}
              </span>
            </div>
          );
        })}
      </div>

      {changes.length ? (
        <ul className="mt-2 flex flex-col gap-1">
          {changes.map((c) => {
            const o = mission.objectives.find((x) => x.id === c.id)!;
            return (
              <li key={c.id} className="text-[0.72rem]">
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

      <h3 className="mt-3 mb-1 text-[0.7rem] font-semibold text-[var(--lab-ink-2)]">Political capital</h3>
      <div className="flex flex-wrap items-start gap-x-5 gap-y-1">
        {(["votes", "trust"] as const).map((c) => {
          const list = recap.points.entries.filter((e) => e.currency === c);
          const total = list.reduce((a, e) => a + e.amount, 0);
          return (
            <div key={c} className="min-w-[13rem] flex-1">
              <div className="flex items-center gap-1.5 text-[0.78rem] font-semibold">
                {c === "votes" ? <VotesIcon /> : <TrustIcon />} {c === "votes" ? "Votes" : "Trust"} {recap.points[c]}
                <span className={`text-[0.7rem] ${total > 0 ? "text-[var(--lab-good)]" : total < 0 ? "text-[var(--lab-bad)]" : "text-[var(--lab-ink-2)]"}`}>({total > 0 ? "+" : ""}{total} this quarter)</span>
              </div>
              <ul className="mt-0.5 text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">
                {list.length ? list.map((e, i) => <li key={i}>{e.amount > 0 ? "+" : ""}{e.amount} {e.reason}</li>) : <li>No change</li>}
              </ul>
            </div>
          );
        })}
      </div>

      <h3 className="mt-3 mb-1 text-[0.7rem] font-semibold text-[var(--lab-ink-2)]">Your advisors on the quarter ahead</h3>
      <AdviceList advice={recap.advice} compact />

      <div className="mt-3 flex justify-end">
        <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={close}>
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
  const primary = usePrimary();
  const shocks = config.shocks.filter((s) => ids.includes(s.id));
  const main = shocks[0];
  if (!main) return null;
  const spec = SHOCKS[main.kind];
  const policy = policyForTurn(config, clock);
  const options = responsesFor(main.kind, { policy, unlocked: new Set(mission.unlocks) });
  const now = main.quarter <= clock + 1;

  return (
    <div className="game-card game-shock" role="dialog" aria-modal="true" aria-labelledby="shock-title">
      <span className="game-shock-kicker">{now && main.quarter > 1 ? "Breaking news" : "On your desk"}</span>
      <h2 id="shock-title" className="game-shock-title">{spec.name}</h2>
      <p className="text-[0.82rem] leading-relaxed">{spec.description}</p>
      <p className="mt-1 text-[0.72rem] text-[var(--lab-ink-2)]">
        It hits in {quarterLabel(main.quarter)}. {options.length ? "How do you respond?" : "Your tools are on the left."}
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {options.map((o, i) => (
          <button
            key={o.id}
            ref={i === 0 ? primary : undefined}
            type="button"
            className="game-choice"
            onClick={() => {
              sound.play("choose");
              if (Object.keys(o.changes).length) decide(o.changes);
              close();
            }}
          >
            <strong>{o.label}</strong>
            <span>{o.detail}</span>
          </button>
        ))}
        <button ref={options.length ? undefined : primary} type="button" className="game-choice is-plain" onClick={close}>
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
  const next = MISSIONS.find((m) => m.number === mission.number + 1);

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
              <li key={o.id} className="text-[0.74rem]">
                <span className={`game-status is-${met ? "met" : "failed"}`}>{met ? "Met" : "Missed"}</span> {o.bonus ? "★ " : ""}
                {o.label}
              </li>
            );
          })}
        </ul>
        <p className="game-lesson">{mission.lesson}</p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>All missions</button>
          <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={restart}>Play again</button>
          {next ? (
            <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={() => startMission(next.id)}>
              Next: {next.title}
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
      <p className="mt-2 text-[0.74rem] leading-relaxed text-[var(--lab-ink-2)]">Rewind one quarter to try a different decision, or start the mission again. The goal cards show where the forecast was heading before each choice.</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>All missions</button>
        <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={restart}>Restart mission</button>
        <button ref={primary} type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={rewind}>Rewind one quarter</button>
      </div>
    </div>
  );
}
