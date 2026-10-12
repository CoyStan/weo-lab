"use client";

import { Fragment } from "react";
import { quarterLabel } from "../../model/economy";
import { canAdopt, INSTITUTIONS, type Institution } from "../politics";
import { useGame } from "../store";
import { useProbeEffect, useTurn } from "../useTurn";
import { GAME_METRICS, deltaUnit, fmtNum } from "../metrics";
import { CostChips } from "./Capital";

/** Institutions and reforms on offer in this mission: adopt them with Votes and Trust. */
export default function Reforms() {
  const { mission, config, books, clock } = useTurn();
  const adopt = useGame((s) => s.adopt);
  const unadopt = useGame((s) => s.unadopt);
  const setProbe = useGame((s) => s.setProbe);
  const probe = useGame((s) => s.probe);
  if (!books) return null;
  const owned = new Map((config.institutions ?? []).map((a) => [a.id, a.quarter]));
  const list = mission.politics.institutions.map((id) => INSTITUTIONS[id]);
  const branches = Array.from(new Set(list.map((i) => i.branch)));

  return (
    <div className="flex flex-col gap-2">
      <p className="game-turn-note">
        Reforms last for the rest of the mission. Pay with <strong>Votes</strong> and <strong>Trust</strong>; you have {books.votes} and {books.trust}.
        {mission.politics.elections.some((q) => q > clock) ? ` Keep at least ${mission.politics.threshold} votes for the election.` : ""}
      </p>
      {branches.map((branch) => (
        <section key={branch} className="game-lever-group">
          <h3>{branch}</h3>
          <ul className="flex flex-col gap-1.5">
            {list
              .filter((i) => i.branch === branch)
              .map((inst) => {
                const since = owned.get(inst.id);
                const thisTurn = since === clock + 1;
                const check = canAdopt(inst.id, mission.politics, config, { votes: books.votes, trust: books.trust });
                return (
                  <li
                    key={inst.id}
                    className={`game-reform ${since !== undefined ? "is-owned" : ""} ${!check.ok && since === undefined ? "is-locked" : ""}`}
                    onPointerEnter={() => since === undefined && setProbe(`inst:${inst.id}`)}
                    onPointerLeave={() => setProbe(null)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-[0.78rem] leading-tight">{inst.name}</strong>
                      <CostChips cost={inst.cost} />
                    </div>
                    <p className="game-hint">{inst.effect}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {since !== undefined ? (
                        thisTurn ? (
                          <>
                            <span className="text-[0.68rem] font-semibold text-[var(--lab-good)]">Adopting from {quarterLabel(since)}</span>
                            <button type="button" className="lab-btn lab-btn-ghost lab-btn-xs" onClick={() => unadopt(inst.id)}>Undo</button>
                          </>
                        ) : (
                          <span className="text-[0.68rem] font-semibold text-[var(--lab-good)]">In force since {quarterLabel(since)}</span>
                        )
                      ) : (
                        <>
                          <span className="text-[0.66rem] text-[var(--lab-ink-2)]">{check.ok ? "" : check.reason}</span>
                          <button type="button" className="lab-btn lab-btn-soft lab-btn-xs" disabled={!check.ok} onClick={() => adopt(inst.id)}>
                            Adopt
                          </button>
                        </>
                      )}
                    </div>
                    {probe === `inst:${inst.id}` ? <ReformEffect inst={inst} /> : null}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ReformEffect({ inst }: { inst: Institution }) {
  const { mission } = useTurn();
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  const effect = useProbeEffect(metrics);
  if (!effect) return null;
  const parts = metrics.map((m) => ({ m, d: effect.deltas[m] })).filter((p) => Math.abs(p.d) >= 0.05);
  return (
    <div className="game-probe" role="status">
      <strong>{inst.name}</strong> would move, by {effect.by}:{" "}
      {parts.length === 0
        ? "little you are judged on, this time."
        : parts.map((p, i) => (
            <Fragment key={p.m}>
              <span className="whitespace-nowrap">
                {GAME_METRICS[p.m].label.toLowerCase()} {fmtNum(p.d, GAME_METRICS[p.m].digits, true)}
                {deltaUnit(GAME_METRICS[p.m].unit)}
              </span>
              {i < parts.length - 1 ? ", " : ""}
            </Fragment>
          ))}
    </div>
  );
}
