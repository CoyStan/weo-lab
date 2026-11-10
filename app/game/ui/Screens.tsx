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
import { CostChips } from "./Capital";
import { missionUnlocked, useGame } from "../store";
import SoundToggle from "./SoundToggle";
import Glyph from "./Glyph";
import { BADGES } from "../../contagion/flavour";

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

/** One line per lever for the briefing's tools table. */
const LEVER_DOES: Record<LeverId, string> = {
  rate: "Set the interest rate: higher cools demand and, later, inflation.",
  rule: "Let a rule set the rate from inflation and the output gap.",
  fiscal: "Tighten or loosen the budget each year, in % of GDP.",
  mix: "Choose whether the budget moves through spending or taxes.",
  investment: "Spend on roads and ports: demand now, capacity later.",
  fxRegime: "Float, manage or peg the currency.",
  intervention: "Sell reserves to steady the currency.",
  controls: "Slow money leaving the country, at a price in spreads.",
  reforms: "Adopt reforms with votes and trust.",
  imf: "Borrow from the IMF while you tighten.",
  devalue: "Reset the peg weaker in one go.",
  restructure: "Cut the debt stock, at a cost in trust and spreads.",
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
        <div className="game-title-actions mt-6 flex flex-wrap items-center gap-2.5">
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
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SoundToggle />
          <p className="max-w-[24rem] text-(length:--t-xs) leading-snug text-[var(--lab-ink-2)]">An independent educational game, not affiliated with or endorsed by the IMF. Economies and results are illustrative; details in Settings, About.</p>
        </div>
      </div>
    </div>
  );
}

type Tab = "campaign" | "history" | "today" | "contagion";

export function MissionSelect() {
  const progress = useGame((s) => s.progress);
  const startMission = useGame((s) => s.startMission);
  const startEpisode = useGame((s) => s.startEpisode);
  const startToday = useGame((s) => s.startToday);
  const setScreen = useGame((s) => s.setScreen);
  const [tab, setTab] = useState<Tab>("campaign");
  // The next mission to play leads the page as a double-width card.
  const nextUp = MISSIONS.find((m) => missionUnlocked(m, progress) && !(progress.stars[m.id] > 0));
  return (
    <div className="game-overlay is-scroll">
      <div className="game-missions">
        <div className="game-missions-head mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="game-missions-title font-display text-(length:--t-lg) font-semibold leading-none">Play</h1>
          <Segmented<Tab>
            ariaLabel="Mode"
            size="md"
            value={tab}
            onChange={setTab}
            options={[
              { value: "campaign", label: "Campaign" },
              { value: "history", label: "History" },
              { value: "today", label: "World today" },
              { value: "contagion", label: "Contagion" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SoundToggle />
            <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={() => setScreen("title")}>Back</button>
            <button type="button" className="lab-btn lab-btn-soft lab-btn-sm" onClick={() => setScreen("sandbox")}>Free play</button>
          </div>
        </div>

        {tab === "campaign" ? (
          <ol className="game-mission-grid grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {MISSIONS.map((m) => {
              const open = missionUnlocked(m, progress);
              const preset = getPreset(m.presetId);
              const lead = m.id === nextUp?.id;
              return (
                <li key={m.id} className={lead ? "game-mission-lead" : undefined}>
                  <button type="button" className={`game-mission ${open ? "" : "is-locked"} ${lead ? "is-lead" : ""}`} disabled={!open} onClick={() => startMission(m.id)}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="game-mission-number">Mission {m.number}</span>
                      {open ? <Stars n={progress.stars[m.id] ?? 0} /> : <LockIcon />}
                    </span>
                    <span className="game-mission-title">{m.title}</span>
                    <span className="game-mission-meta">{preset.name} · {preset.archetype} · {m.quarters} quarters</span>
                    <span className="game-mission-kicker">{m.kicker}</span>
                    {open ? null : <span className="game-mission-unlock">Locked: win mission {m.number - 1} to open it</span>}
                    {lead ? <span className="game-mission-play">Play mission {m.number}</span> : null}
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
        ) : tab === "contagion" ? (
          <ContagionTab />
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
            <p className="mt-3 text-(length:--t-xs) text-[var(--lab-ink-2)]">2025 figures. Source: IMF, {WEO.vintage}, retrieved {WEO.fetched}. The game is independent of the IMF.</p>
          </>
        )}
      </div>
    </div>
  );
}

function ContagionTab() {
  const setScreen = useGame((s) => s.setScreen);
  const stars = useGame((s) => s.progress.stars);
  const contained = Object.entries(stars).filter(([k, v]) => k.startsWith("contagion-") && v > 0).length;
  const badges = BADGES.filter((b) => stars[`badge-${b.id}`]).length;
  return (
    <div className="game-mission game-contagion-intro">
      <span className="game-mission-number">New mode · the whole world</span>
      <span className="game-mission-title">Contagion</span>
      <span className="game-mission-kicker">
        Pick a country and start a financial crisis there. Then switch sides: you run an international stability fund with a few staff teams, limited money and your credibility, and try to stop the crisis spreading through trade, finance and panic. Thirty economies, each as vulnerable as its real IMF WEO numbers say.
      </span>
      <span className="game-mission-meta">12 quarters · {contained ? `${contained} of 30 origins contained` : "30 possible origins"} · {badges} of {BADGES.length} badges</span>
      <span className="mt-3">
        <button type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={() => setScreen("contagion")}>
          Open the world map
        </button>
      </span>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="game-lock" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-label="Locked">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="game-mission-stars" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((k) => (
        <span key={k} className={k <= n ? "is-on" : ""}><Glyph name={k <= n ? "star" : "star-outline"} /></span>
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
    <div className="game-overlay is-scroll is-briefing">
      <div className="game-card game-briefing" role="dialog" aria-labelledby="briefing-title">
        <p className="game-eyebrow">{mission.number ? `Mission ${mission.number} of ${MISSIONS.length} · ${preset.name}, ${preset.archetype.toLowerCase()}` : mission.comparison?.story ? `History · ${mission.kicker}` : `World today · ${preset.name}`}</p>
        <h1 id="briefing-title" className="game-title is-small">{mission.title}</h1>
        <div className="mt-2 flex flex-col gap-2 text-(length:--t-sm) leading-relaxed">
          <p>{mission.briefing[0]}</p>
          {mission.briefing.length > 1 ? (
            <details className="game-brief-more">
              <summary>More</summary>
              {mission.briefing.slice(1).map((p) => (
                <p key={p} className="mt-2">{p}</p>
              ))}
            </details>
          ) : null}
        </div>

        <div className="game-brief-cols mt-4 grid gap-3">
          <div>
            <h2 className="game-section">To win</h2>
            <ul className="flex flex-col gap-1 text-(length:--t-sm)">
              {primary.map((o) => (
                <li key={o.id} className="game-bullet">{o.label}</li>
              ))}
            </ul>
            <h2 className="game-section mt-2">For extra stars</h2>
            <ul className="flex flex-col gap-1 text-(length:--t-sm)">
              {bonus.map((o) => (
                <li key={o.id} className="game-bullet is-star"><Glyph name="star" label="Extra star" /> {o.label}</li>
              ))}
            </ul>
            <h2 className="game-section mt-3">Your advisors</h2>
            <ul className="flex flex-col gap-1.5">
              {mission.advisors.map((id) => {
                const a = ADVISORS[id];
                return (
                  <li key={id} className="flex items-center gap-2">
                    <img src={`${base}${a.portrait}`} alt="" width={30} height={30} className="game-portrait is-small" style={{ ["--advisor" as string]: a.accent }} />
                    <span className="game-brief-advisor text-(length:--t-sm) leading-tight">
                      <strong>{a.name}</strong>
                      <span className="block text-[var(--lab-ink-2)]">Cares about {a.cares.toLowerCase()}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2 className="game-section">Your tools</h2>
            <table className="game-tools">
              <thead>
                <tr>
                  <th scope="col">Tool</th>
                  <th scope="col">What it does</th>
                  <th scope="col">Cost</th>
                </tr>
              </thead>
              <tbody>
                {mission.unlocks.filter((l) => l !== "reforms").map((l) => (
                  <tr key={l}>
                    <th scope="row">{LEVER_NAMES[l]}</th>
                    <td>{LEVER_DOES[l]}</td>
                    <td>{l === "imf" ? "3 votes to start" : l === "controls" ? "2 trust to start" : l === "devalue" ? "1 vote, 2 trust" : l === "restructure" ? "3 trust" : "free"}</td>
                  </tr>
                ))}
                {mission.politics.institutions.slice(0, 3).map((id) => (
                  <tr key={id}>
                    <th scope="row">{INSTITUTIONS[id].name}</th>
                    <td>{INSTITUTIONS[id].effect}</td>
                    <td><CostChips cost={INSTITUTIONS[id].cost} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mission.politics.institutions.length > 3 ? <p className="game-tools-more">and {mission.politics.institutions.length - 3} more reforms under Reforms</p> : null}
            <h2 className="game-section mt-3">Votes and trust</h2>
            <p className="game-capital-note">
              You start with <strong>Votes {mission.politics.start.votes} · Trust {mission.politics.start.trust}</strong>. Higher is better: votes come from growth and jobs, trust from hitting targets; reforms spend them.{" "}
              {mission.politics.elections.length ? `Elections end ${mission.politics.elections.map((q) => quarterLabel(q)).join(" and ")}; you need ${mission.politics.threshold} votes.` : "No elections in this mission."}
            </p>
            <p className="game-brief-watched mt-2 text-(length:--t-sm) leading-snug text-[var(--lab-ink-2)]">
              {mission.number === 0 ? `Data: IMF, ${WEO.vintage}. Policy rates, reserves and spreads are model estimates. ` : ""}
              {mission.quarters} quarters, {quarterLabel(1)} to {quarterLabel(mission.quarters)}. Watched: {Array.from(new Set(mission.objectives.map((o) => GAME_METRICS[o.metric].label.toLowerCase()))).join(", ")}.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>All missions</button>
          <button type="button" className="lab-btn lab-btn-primary lab-btn-md game-cta" onClick={beginPlay} ref={(el) => { if (el && document.activeElement !== el) el.focus({ preventScroll: true }); }}>
            Take the job
          </button>
        </div>
      </div>
    </div>
  );
}
