"use client";

import { useState } from "react";
import { getPreset } from "../../model/presets";
import { Segmented } from "../../components/ui";
import { WEO } from "../data";
import { EPISODES, TODAY } from "../economies";
import { quarterLabel } from "../../model/economy";
import { ADVISORS } from "../advisors";
import { GAME_METRICS } from "../metrics";
import { getMission, MISSIONS, type LeverId } from "../missions";
import { INSTITUTIONS } from "../politics";
import { CostChips, TrustIcon, VotesIcon } from "./Capital";
import { missionUnlocked, useGame } from "../store";
import SoundToggle from "./SoundToggle";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const LEVER_NAMES: Record<LeverId, string> = {
  rate: "Policy rate",
  rule: "Policy rule",
  fiscal: "Budget tightening",
  mix: "Cuts or taxes",
  investment: "Public investment",
  fxRegime: "Exchange-rate regime",
  intervention: "FX intervention",
  controls: "Capital flow measures",
  reforms: "Structural reforms",
  imf: "IMF programme",
  devalue: "Devaluation",
  restructure: "Debt restructuring",
};

export function TitleScreen() {
  const progress = useGame((s) => s.progress);
  const startMission = useGame((s) => s.startMission);
  const setScreen = useGame((s) => s.setScreen);
  const won = MISSIONS.filter((m) => (progress.stars[m.id] ?? 0) > 0).length;
  const next = MISSIONS.find((m) => missionUnlocked(m, progress) && !(progress.stars[m.id] > 0)) ?? MISSIONS[MISSIONS.length - 1];

  return (
    <div className="game-overlay">
      <div className="game-title-card">
        <p className="game-eyebrow">A policy game for economists, and for anyone curious</p>
        <h1 className="game-title">WEO Scenario Lab</h1>
        <p className="game-subtitle">Run an economy one quarter at a time. Set rates, budgets and exchange rates, hear out your advisors, and see what your choices do before you commit.</p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button type="button" className="lab-btn lab-btn-primary lab-btn-md game-cta" onClick={() => startMission(next.id)} autoFocus>
            {won === 0 ? "Start the campaign" : `Continue: ${next.title}`}
          </button>
          <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={() => setScreen("missions")}>
            Missions{won ? ` · ${won} of ${MISSIONS.length} won` : ""}
          </button>
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("sandbox")}>
            Free play
          </button>
        </div>
        <ul className="game-title-points">
          <li><strong>6 missions</strong> across four economies, from a first rate decision to a sudden stop.</li>
          <li><strong>One quarter per turn.</strong> Shocks arrive unannounced; the forecast only knows what you know.</li>
          <li><strong>Free play</strong> opens the full lab: every lever, assumption, shock and constraint.</li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SoundToggle />
          <p className="max-w-[24rem] text-[0.66rem] leading-snug text-[var(--lab-ink-2)]">An independent educational game, not affiliated with or endorsed by the IMF. Economies and results are illustrative; details in Settings, About.</p>
        </div>
      </div>
    </div>
  );
}

type Tab = "campaign" | "history" | "today";

export function MissionSelect() {
  const progress = useGame((s) => s.progress);
  const startMission = useGame((s) => s.startMission);
  const startEpisode = useGame((s) => s.startEpisode);
  const startToday = useGame((s) => s.startToday);
  const setScreen = useGame((s) => s.setScreen);
  const [tab, setTab] = useState<Tab>("campaign");
  return (
    <div className="game-overlay is-scroll">
      <div className="game-missions">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-[1.6rem] font-semibold leading-none">Play</h1>
          <Segmented<Tab>
            ariaLabel="Mode"
            size="md"
            value={tab}
            onChange={setTab}
            options={[
              { value: "campaign", label: "Campaign" },
              { value: "history", label: "History" },
              { value: "today", label: "World today" },
            ]}
          />
          <div className="flex gap-2">
            <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={() => setScreen("title")}>Back</button>
            <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={() => setScreen("sandbox")}>Free play</button>
          </div>
        </div>

        {tab === "campaign" ? (
          <ol className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {MISSIONS.map((m) => {
              const open = missionUnlocked(m, progress);
              const preset = getPreset(m.presetId);
              return (
                <li key={m.id}>
                  <button type="button" className={`game-mission ${open ? "" : "is-locked"}`} disabled={!open} onClick={() => startMission(m.id)}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="game-mission-number">Mission {m.number}</span>
                      <Stars n={progress.stars[m.id] ?? 0} />
                    </span>
                    <span className="game-mission-title">{m.title}</span>
                    <span className="game-mission-meta">{preset.name} · {preset.archetype} · {m.quarters} quarters</span>
                    <span className="game-mission-kicker">{open ? m.kicker : "Win the previous mission to unlock."}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : tab === "history" ? (
          <>
            <p className="game-tab-note">Real crises, rebuilt from IMF data. You start just before things went wrong, with the shocks that actually hit. Can you do better than history did?</p>
            <ol className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {EPISODES.map((ep) => (
                <li key={ep.id}>
                  <button type="button" className="game-mission" onClick={() => startEpisode(ep.id)}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="game-mission-number">{ep.span}</span>
                      <Stars n={progress.stars[`episode-${ep.id}`] ?? 0} />
                    </span>
                    <span className="game-mission-title">{ep.title}</span>
                    <span className="game-mission-kicker">{ep.context[0]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <p className="game-tab-note">Start from a country&rsquo;s latest numbers in the IMF&rsquo;s {WEO.vintage} and try to beat its projection. Each run draws two surprises.</p>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {TODAY.map((c) => {
                const d = WEO.countries[c.iso];
                const g = d.series.growth["2025"];
                const i = d.series.infl["2025"];
                const debt = d.series.debt["2025"];
                return (
                  <li key={c.iso}>
                    <button type="button" className="game-country" onClick={() => startToday(c.iso)}>
                      <span className="flex items-center justify-between gap-2">
                        <strong>{d.name}</strong>
                        <Stars n={progress.stars[`today-${c.iso}`] ?? 0} />
                      </span>
                      <span className="game-mission-meta">
                        {c.euro ? "Euro area" : c.regime === "float" ? "Floating currency" : "Managed currency"} · target {c.target}%
                      </span>
                      <span className="game-country-stats">
                        <span>Growth {g?.toFixed(1)}%</span>
                        <span>Inflation {i?.toFixed(1)}%</span>
                        <span>Debt {debt?.toFixed(0)}%</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-[0.66rem] text-[var(--lab-ink-2)]">2025 figures. Source: IMF, {WEO.vintage}, retrieved {WEO.fetched}. The game is independent of the IMF.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="game-mission-stars" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((k) => (
        <span key={k} className={k <= n ? "is-on" : ""}>★</span>
      ))}
    </span>
  );
}

export function Briefing() {
  const missionId = useGame((s) => s.missionId);
  const beginPlay = useGame((s) => s.beginPlay);
  const setScreen = useGame((s) => s.setScreen);
  const mission = getMission(missionId ?? "");
  if (!mission) return null;
  const preset = getPreset(mission.presetId);
  const primary = mission.objectives.filter((o) => !o.bonus);
  const bonus = mission.objectives.filter((o) => o.bonus);

  return (
    <div className="game-overlay is-scroll">
      <div className="game-card game-briefing" role="dialog" aria-labelledby="briefing-title">
        <p className="game-eyebrow">{mission.number ? `Mission ${mission.number} of ${MISSIONS.length} · ${preset.name}, ${preset.archetype.toLowerCase()}` : mission.comparison?.story ? `History · ${mission.kicker}` : `World today · ${preset.name}`}</p>
        <h1 id="briefing-title" className="game-title is-small">{mission.title}</h1>
        <div className="mt-2 flex flex-col gap-2 text-[0.86rem] leading-relaxed">
          {mission.briefing.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <h2 className="game-section">To win</h2>
            <ul className="flex flex-col gap-1 text-[0.78rem]">
              {primary.map((o) => (
                <li key={o.id} className="game-bullet">{o.label}</li>
              ))}
            </ul>
            <h2 className="game-section mt-2">For extra stars</h2>
            <ul className="flex flex-col gap-1 text-[0.78rem]">
              {bonus.map((o) => (
                <li key={o.id} className="game-bullet is-star">{o.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="game-section">Your tools</h2>
            <div className="flex flex-wrap gap-1">
              {mission.unlocks.map((l) => (
                <span key={l} className="lab-chip lab-chip-info">{LEVER_NAMES[l]}</span>
              ))}
            </div>
            <h2 className="game-section mt-2">Political capital</h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.74rem]">
              <span className="game-counter is-votes"><VotesIcon /> {mission.politics.start.votes}</span>
              <span className="game-counter is-trust"><TrustIcon /> {mission.politics.start.trust}</span>
              <span className="text-[var(--lab-ink-2)]">
                {mission.politics.elections.length ? `Elections end ${mission.politics.elections.map((q) => quarterLabel(q)).join(" and ")}; you need ${mission.politics.threshold} votes.` : "No elections in this mission."}
              </span>
            </p>
            <ul className="mt-1 flex flex-col gap-0.5 text-[0.7rem]">
              {mission.politics.institutions.slice(0, 4).map((id) => (
                <li key={id} className="flex items-center justify-between gap-2">
                  <span>{INSTITUTIONS[id].name}</span>
                  <CostChips cost={INSTITUTIONS[id].cost} />
                </li>
              ))}
              {mission.politics.institutions.length > 4 ? <li className="text-[var(--lab-ink-2)]">and {mission.politics.institutions.length - 4} more reforms</li> : null}
            </ul>
            <h2 className="game-section mt-2">Your advisors</h2>
            <ul className="flex flex-col gap-1.5">
              {mission.advisors.map((id) => {
                const a = ADVISORS[id];
                return (
                  <li key={id} className="flex items-center gap-2">
                    <img src={`${base}${a.portrait}`} alt="" width={30} height={30} className="game-portrait is-small" style={{ ["--advisor" as string]: a.accent }} />
                    <span className="text-[0.74rem] leading-tight">
                      <strong>{a.name}</strong>
                      <span className="block text-[var(--lab-ink-2)]">Cares about {a.cares.toLowerCase()}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[0.7rem] text-[var(--lab-ink-2)]">
              {mission.number === 0 ? `Data: IMF, ${WEO.vintage}. Policy rates, reserves and spreads are model estimates. ` : ""}
              {mission.quarters} quarters, {quarterLabel(1)} to {quarterLabel(mission.quarters)}. Watched: {Array.from(new Set(mission.objectives.map((o) => GAME_METRICS[o.metric].label.toLowerCase()))).join(", ")}.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>All missions</button>
          <button type="button" className="lab-btn lab-btn-primary lab-btn-md game-cta" onClick={beginPlay} autoFocus>
            Take the job
          </button>
        </div>
      </div>
    </div>
  );
}
