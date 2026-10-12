"use client";

import { useEffect, useMemo, useState } from "react";
import { WEO } from "../../game/data";
import { useGame } from "../../game/store";
import SoundToggle from "../../game/ui/SoundToggle";
import {
  canAct,
  cost,
  COUNTRIES,
  countriesHit,
  createWorld,
  crisisCount,
  def,
  effectiveness,
  INSOLVENT_DEBT,
  link,
  outcome,
  RULES,
  starRescued,
  starTight,
  step,
  vuln,
  type Action,
  type CountryDef,
  type CountryState,
  type Region,
  type World,
} from "../engine";
import { suggest } from "../strategy";
import { ASKS, useContagion } from "../store";
import { DEPUTY, deputyQuip, earnedBadges, headline, verdict } from "../flavour";

const R = 34;
const W = Math.sqrt(3) * R;
const COLS = 16;
const ROWS = 7;

const center = ([c, r]: [number, number]) => ({ x: W / 2 + 6 + c * W + (r & 1 ? W / 2 : 0), y: R + 6 + r * 1.5 * R });
const hexPath = (x: number, y: number, r = R - 1.5) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

const VIEW_W = W * (COLS + 0.5) + 12;
const VIEW_H = 1.5 * R * (ROWS - 1) + 2 * R + 12;

const REGION_NAME: Record<Region, string> = {
  "north-america": "North America",
  "latin-america": "Latin America",
  europe: "Europe",
  "middle-east": "Middle East",
  africa: "Africa",
  "south-asia": "South Asia",
  "east-asia": "East Asia",
  oceania: "Oceania",
};

/** Quiet sage when calm, warming to amber under stress and deep red in crisis. */
const STOPS: [number, number, number, number][] = [
  [0, 160, 18, 70],
  [30, 120, 22, 64],
  [45, 40, 70, 58],
  [70, 12, 72, 50],
  [100, 356, 68, 36],
];
function stressColour(stress: number): string {
  const s = Math.max(0, Math.min(100, stress));
  const i = Math.max(0, STOPS.findIndex((p) => p[0] >= s) - 1);
  const [a, b] = [STOPS[i], STOPS[Math.min(i + 1, STOPS.length - 1)]];
  const f = b[0] === a[0] ? 0 : (s - a[0]) / (b[0] - a[0]);
  let dh = b[1] - a[1];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const mix = (x: number, y: number) => x + (y - x) * f;
  return `hsl(${((a[1] + dh * f + 360) % 360).toFixed(0)} ${mix(a[2], b[2]).toFixed(0)}% ${mix(a[3], b[3]).toFixed(0)}%)`;
}

const STATUS_WORD = { calm: "Calm", stressed: "Under stress", crisis: "In crisis" } as const;

/** What would happen with no help at all, for the origin picker. */
function passivePreview(origin: string, seed: number) {
  let w = createWorld(WEO, origin, seed);
  while (outcome(w).kind === "playing") w = step(w);
  return { hit: countriesHit(w), loss: w.worldLoss, quarter: w.quarter, result: outcome(w) };
}

export default function Contagion() {
  const phase = useContagion((s) => s.phase);
  const setScreen = useGame((s) => s.setScreen);
  return (
    <div className="ctg">
      <header className="ctg-bar">
        <div className="flex items-center gap-3">
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" onClick={() => setScreen("missions")}>
            ← Play
          </button>
          <div>
            <p className="ctg-eyebrow">Contagion</p>
            <h1 className="ctg-title">{phase === "pick" ? "Where does the crisis start?" : "Contain the crisis"}</h1>
          </div>
        </div>
        <SoundToggle />
      </header>
      {phase === "pick" ? <Picker /> : <Board />}
      {phase === "over" ? <Debrief /> : null}
    </div>
  );
}

/* ---- Picking the origin ------------------------------------------------ */

function Picker() {
  const origin = useContagion((s) => s.origin);
  const seed = useContagion((s) => s.seed);
  const pick = useContagion((s) => s.pick);
  const begin = useContagion((s) => s.begin);
  const stars = useGame((s) => s.progress.stars);
  const preview = useMemo(() => passivePreview(origin, seed), [origin, seed]);
  const world = useMemo(() => createWorld(WEO, origin, seed), [origin, seed]);
  const d = def(origin);
  const s = WEO.countries[origin].series;
  const level = d.center ? "Hard" : world.countries[origin].share > 0.03 || preview.hit > 10 ? "Tough" : "Standard";

  return (
    <div className="ctg-layout">
      <div className="ctg-map-wrap">
        <WorldMap world={world} selected={origin} onSelect={pick} picking stars={stars} />
        <Legend />
      </div>
      <aside className="ctg-side">
        <section className="ctg-card">
          <p className="ctg-kicker">{REGION_NAME[d.region]}{d.center ? " · financial centre" : ""}</p>
          <h2 className="ctg-country">{WEO.countries[origin].name}</h2>
          <p className="ctg-level" data-level={level}>{level}</p>
          <dl className="ctg-facts">
            <Fact label="Public debt" value={`${s.debt["2025"].toFixed(0)}% of GDP`} />
            <Fact label="Current account" value={`${s.ca["2025"] > 0 ? "+" : ""}${s.ca["2025"].toFixed(1)}% of GDP`} />
            <Fact label="Inflation" value={`${s.infl["2025"].toFixed(1)}%`} />
            <Fact label="Share of the group's output" value={`${(world.countries[origin].share * 100).toFixed(1)}%`} />
          </dl>
          <p className="ctg-note">
            If nobody acts, the crisis reaches <strong>{preview.hit} more {preview.hit === 1 ? "country" : "countries"}</strong>
            {preview.result.kind === "lost" && preview.quarter < RULES.quarters ? ` and becomes a global crisis in quarter ${preview.quarter}` : ""}.
          </p>
          <button type="button" className="lab-btn lab-btn-primary lab-btn-md mt-3 w-full" onClick={begin} autoFocus>
            Start the crisis in {WEO.countries[origin].name}
          </button>
        </section>
        <section className="ctg-card">
          <h3 className="ctg-h3">How it works</h3>
          <ul className="ctg-how">
            <li>You run an international stability fund for <strong>{RULES.quarters} quarters</strong>. A crisis breaks out where you choose.</li>
            <li>Trouble spreads to <strong>neighbours, trade partners and financial centres</strong>, faster when markets panic. Weak public finances and big external deficits make a country vulnerable (real IMF WEO figures).</li>
            <li>Each quarter you have <strong>{RULES.staff} staff teams</strong> and limited money: build firewalls with credit lines, rescue with programmes, restructure debt that can&rsquo;t be paid.</li>
            <li>Win by <strong>ending the crisis where it started</strong> and keeping it to <strong>{RULES.winHit} more countries or fewer</strong>. A country left alone in crisis only gets worse.</li>
            <li>If a financial centre falls, the G20 tops up the fund: double the money, an extra team and an extra round of swap lines.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Legend() {
  return (
    <div className="ctg-legend" aria-hidden="true">
      <span><i style={{ background: stressColour(10) }} /> Calm</span>
      <span><i style={{ background: stressColour(50) }} /> Under stress</span>
      <span><i style={{ background: stressColour(85) }} /> Crisis</span>
      <span><i className="is-ring" /> Credit line</span>
      <span><i className="is-plus">+</i> Programme</span>
      <span><b>◆</b> Financial centre</span>
    </div>
  );
}

/* ---- The map ----------------------------------------------------------- */

function WorldMap({
  world,
  selected,
  onSelect,
  picking = false,
  flash = {},
  hint,
  stars = {},
}: {
  world: World;
  selected: string | null;
  onSelect: (iso: string) => void;
  picking?: boolean;
  flash?: Record<string, "crisis" | "recovery">;
  hint?: string | null;
  stars?: Record<string, number>;
}) {
  const t = world.quarter;
  const taken = new Set(COUNTRIES.map((c) => c.hex.join(",")));
  const sel = selected ? def(selected) : null;
  // Strong links from the selected country, so the network is visible.
  const links = sel
    ? COUNTRIES.filter((c) => c.iso !== sel.iso)
        .map((c) => ({ c, l: link(sel, c) }))
        .filter((x) => x.l >= 0.6)
    : [];

  return (
    <svg className="ctg-map" viewBox={`0 0 ${VIEW_W.toFixed(0)} ${VIEW_H.toFixed(0)}`} role="group" aria-label="World map of the crisis">
      <g className="ctg-sea" aria-hidden="true">
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            if (taken.has(`${c},${r}`)) return null;
            const p = center([c, r]);
            return <polygon key={`${c},${r}`} points={hexPath(p.x, p.y, R - 4)} />;
          }),
        )}
      </g>
      <g className="ctg-links" aria-hidden="true">
        {links.map(({ c, l }) => {
          const a = center(sel!.hex);
          const b = center(c.hex);
          return <line key={c.iso} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={l >= 1 ? 2 : 1.2} strokeOpacity={l >= 1 ? 0.55 : 0.3} />;
        })}
      </g>
      {COUNTRIES.map((d) => (
        <Hex key={d.iso} d={d} c={world.countries[d.iso]} t={t} origin={world.origin === d.iso} selected={selected === d.iso} onSelect={onSelect} flash={flash[d.iso]} hinted={hint === d.iso} picking={picking} stars={stars[`contagion-${d.iso}`] ?? 0} />
      ))}
      {/* Faces sit above every hex, so neighbours drawn later can't cover them. */}
      {!picking ? (
        <g aria-hidden="true">
          {Object.entries(flash).map(([iso, kind]) => {
            const p = center(def(iso).hex);
            return (
              <g key={`${iso}-${t}`} transform={`translate(${p.x.toFixed(1)} ${(p.y - R + 2).toFixed(1)})`}>
                <text className={`ctg-hex-react is-${kind}`}>{kind === "crisis" ? (def(iso).center ? "😱" : "😬") : "😌"}</text>
              </g>
            );
          })}
        </g>
      ) : null}
    </svg>
  );
}

function Hex({ d, c, t, origin, selected, onSelect, flash, hinted, picking, stars }: { d: CountryDef; c: CountryState; t: number; origin: boolean; selected: boolean; onSelect: (iso: string) => void; flash?: "crisis" | "recovery"; hinted: boolean; picking: boolean; stars: number }) {
  const p = center(d.hex);
  const fill = stressColour(picking ? 10 + 55 * c.baseVuln : c.stress);
  const name = WEO.countries[d.iso].name;
  const label = picking ? `${name}, vulnerability ${Math.round(c.baseVuln * 100)}` : `${name}: ${STATUS_WORD[c.status]}, stress ${Math.round(c.stress)}`;
  return (
    <g
      className={`ctg-hex is-${picking ? "pick" : c.status} ${d.center && !picking && c.status !== "calm" ? "is-wobbly" : ""} ${selected ? "is-selected" : ""} ${flash ? `is-flash-${flash}` : ""} ${hinted ? "is-hinted" : ""}`}
      transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(d.iso)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(d.iso);
        }
      }}
    >
      <title>{label}</title>
      <polygon className="ctg-hex-body" points={hexPath(0, 0)} style={{ fill }} />
      {!picking && c.firewallUntil >= t + 1 ? <polygon className="ctg-hex-ring" points={hexPath(0, 0, R - 6)} /> : null}
      <text className="ctg-hex-iso" y={picking ? 2 : -2}>{d.iso}</text>
      {!picking ? <rect className="ctg-hex-meter-bg" x={-14} y={8} width={28} height={3.5} rx={1.75} /> : null}
      {!picking ? <rect className="ctg-hex-meter" x={-14} y={8} width={(28 * c.stress) / 100} height={3.5} rx={1.75} /> : null}
      {d.center ? <text className="ctg-hex-mark" x={0} y={-16}>◆</text> : null}
      {!picking && c.programmeUntil >= t + 1 ? <text className="ctg-hex-badge" x={17} y={-9}>+</text> : null}
      {!picking && c.assistUntil >= t + 1 ? <circle className="ctg-hex-assist" cx={-17} cy={-10} r={3} /> : null}
      {!picking && c.restructured ? <text className="ctg-hex-badge is-small" x={-17} y={22}>R</text> : null}
      {origin && !picking ? <circle className="ctg-hex-origin" r={R - 2} /> : null}
      {picking && stars > 0 ? <text className="ctg-hex-stars" y={18}>{"★".repeat(stars)}</text> : null}
    </g>
  );
}

/* ---- Playing ----------------------------------------------------------- */

function Board() {
  const world = useContagion((s) => s.world)!;
  const quarterStart = useContagion((s) => s.quarterStart)!;
  const selected = useContagion((s) => s.selected);
  const select = useContagion((s) => s.select);
  const perform = useContagion((s) => s.perform);
  const undo = useContagion((s) => s.undo);
  const endQuarter = useContagion((s) => s.endQuarter);
  const flash = useContagion((s) => s.flash);
  const phase = useContagion((s) => s.phase);
  const [advice, setAdvice] = useState<Action | null | undefined>(undefined);
  const asksLeft = useContagion((s) => s.asksLeft);
  const spendAsk = useContagion((s) => s.spendAsk);

  // A new quarter or a new action makes old advice stale.
  useEffect(() => setAdvice(undefined), [world]);

  const over = phase === "over";
  const crises = crisisCount(world);
  const hit = countriesHit(world);
  const changed = world !== quarterStart;

  return (
    <div className="ctg-layout">
      <div className="ctg-map-wrap">
        <Dashboard world={world} crises={crises} hit={hit} />
        {world.boosted ? <p className="ctg-boost">A financial centre has fallen: the G20 has doubled the fund&rsquo;s resources.</p> : null}
        <WorldMap world={world} selected={selected} onSelect={select} flash={flash} hint={advice && advice.kind !== "calm" ? advice.iso : null} />
        <Legend />
      </div>
      <aside className="ctg-side">
        {selected ? <CountryCard world={world} iso={selected} onAct={perform} advice={advice ?? null} /> : null}
        <section className="ctg-card">
          <div className="flex items-center justify-between gap-2">
            <h3 className="ctg-h3">Global</h3>
            <span className="ctg-muted">{world.calmLeft} of {world.calmUses} left</span>
          </div>
          <ActionButton world={world} action={{ kind: "calm" }} title="Coordinate swap lines" text="Central banks lend dollars to each other. Panic falls sharply, once or twice a game." onAct={perform} advised={advice?.kind === "calm"} />
        </section>
        <section className="ctg-card ctg-turn">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="lab-btn lab-btn-soft lab-btn-sm"
              disabled={over || (asksLeft === 0 && advice === undefined)}
              onClick={() => {
                if (advice !== undefined) return;
                const a = suggest(world);
                spendAsk(a);
                setAdvice(a);
              }}
            >
              Ask your deputy · {asksLeft} left
            </button>
            <button type="button" className="lab-btn lab-btn-ghost lab-btn-sm" disabled={!changed || over} onClick={undo}>
              Undo this quarter
            </button>
          </div>
          {advice !== undefined ? (
            <div className="ctg-advice">
              <p className="ctg-deputy">{DEPUTY}</p>
              <p>{adviceText(world, advice)}</p>
              <p className="ctg-quip">&ldquo;{deputyQuip(world, advice)}&rdquo;</p>
            </div>
          ) : null}
          <button type="button" className="game-end-btn mt-3" disabled={over} onClick={endQuarter}>
            End quarter {world.quarter + 1} of {RULES.quarters}
          </button>
        </section>
        <News world={world} />
      </aside>
    </div>
  );
}

function adviceText(world: World, a: Action | null): string {
  if (!a) return world.staffLeft === 0 ? "Our teams are all busy this quarter. End the quarter." : "Nothing urgent. Save the money for the next fire.";
  if (a.kind === "calm") return `Panic is at ${Math.round(world.panic)}. Coordinate swap lines before it pulls healthy countries under.`;
  const name = WEO.countries[a.iso].name;
  const c = world.countries[a.iso];
  if (a.kind === "programme") return `${name} is ${c.status === "crisis" ? "in crisis" : "close to the edge"}, and it is ${(c.share * 100).toFixed(1)}% of world output. A programme there stops the fire spreading.`;
  if (a.kind === "restructure") return `${name}'s debt is ${c.debt.toFixed(0)}% of GDP. A programme won't work until the debt is cut to something payable.`;
  if (a.kind === "creditLine") return `${name} is exposed and still standing. A credit line now is cheaper than a rescue later.`;
  return `A technical team can make ${name} a little sturdier while it is under stress.`;
}

function Dashboard({ world, crises, hit }: { world: World; crises: number; hit: number }) {
  const panicTone = world.panic > 60 ? "bad" : world.panic > 35 ? "warn" : "good";
  return (
    <div className="ctg-dash">
      <Stat label="Quarter" value={`${Math.min(world.quarter + 1, RULES.quarters)}/${RULES.quarters}`} />
      <Stat label="Market panic" value={`${Math.round(world.panic)}`} tone={panicTone} bar={world.panic / 100} />
      <Stat label="Lending capacity" value={`${Math.round(world.capacity)}`} bar={world.capacity / world.maxCapacity} tone={world.capacity < 20 ? "warn" : undefined} />
      <Stat label="Staff teams" value={`${world.staffLeft}/${world.staff}`} pips={[world.staffLeft, world.staff]} />
      <Stat label="Credibility" value={`${world.trust}/10`} pips={[world.trust, 10]} />
      <Stat label="Spread to" value={`${hit} / ${RULES.winHit}`} tone={hit > RULES.winHit ? "bad" : hit === RULES.winHit ? "warn" : "good"} hint="Countries beyond the origin that fell into crisis, and the most you can allow" />
      <Stat label="In crisis now" value={`${crises}`} tone={crises >= 7 ? "bad" : crises >= 4 ? "warn" : undefined} hint={`${RULES.maxCrises} at once is a global crisis`} />
      <Stat label="Spillover losses" value={`${world.spillLoss.toFixed(1)}%`} tone={world.spillLoss > RULES.winLoss ? "bad" : world.spillLoss > RULES.winLoss * 0.66 ? "warn" : undefined} hint={`Output lost outside the origin, % of world GDP. Goal: ${RULES.winLoss}% or less`} />
    </div>
  );
}

function Stat({ label, value, tone, bar, pips, hint }: { label: string; value: string; tone?: "good" | "warn" | "bad"; bar?: number; pips?: [number, number]; hint?: string }) {
  return (
    <div className={`ctg-stat ${tone ? `is-${tone}` : ""}`} title={hint}>
      <span className="ctg-stat-label">{label}</span>
      <span className="ctg-stat-value">{value}</span>
      {bar !== undefined ? (
        <span className="ctg-stat-bar">
          <span style={{ width: `${Math.max(0, Math.min(1, bar)) * 100}%` }} />
        </span>
      ) : null}
      {pips ? (
        <span className="ctg-stat-pips" aria-hidden="true">
          {Array.from({ length: pips[1] }, (_, i) => (
            <i key={i} className={i < pips[0] ? "is-on" : ""} />
          ))}
        </span>
      ) : null}
    </div>
  );
}

const ACTIONS: { kind: Exclude<Action["kind"], "calm">; title: string; text: string }[] = [
  { kind: "creditLine", title: "Precautionary credit line", text: "A firewall: contagion hits it much less for five quarters. Only for countries still standing." },
  { kind: "programme", title: "Emergency programme", text: "Money now, reforms after. Immediate relief and faster recovery for four quarters." },
  { kind: "restructure", title: "Support a debt restructuring", text: "Cuts debt by a quarter so a programme can work. Creditors' losses unsettle markets." },
  { kind: "assist", title: "Technical assistance", text: "A team on the ground: a little sturdier and a little faster to recover." },
];

function CountryCard({ world, iso, onAct, advice }: { world: World; iso: string; onAct: (a: Action) => void; advice: Action | null }) {
  const d = def(iso);
  const c = world.countries[iso];
  const s = WEO.countries[iso].series;
  const t = world.quarter;
  const v = vuln(c, t);
  const protections = [
    c.firewallUntil > t ? `Credit line until Q${c.firewallUntil}` : null,
    c.programmeUntil > t ? `Programme until Q${c.programmeUntil}` : null,
    c.assistUntil > t ? `Technical team until Q${c.assistUntil}` : null,
    c.restructured ? "Debt restructured" : null,
  ].filter(Boolean);
  const eff = effectiveness(world, c);

  return (
    <section className="ctg-card" aria-live="polite">
      <p className="ctg-kicker">
        {REGION_NAME[d.region]}
        {d.center ? " · financial centre" : ""}
        {world.origin === iso ? " · where it started" : ""}
      </p>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="ctg-country">{WEO.countries[iso].name}</h2>
        <span className={`ctg-status is-${c.status}`}>{STATUS_WORD[c.status]}</span>
      </div>
      <div className="ctg-stress" aria-label={`Stress ${Math.round(c.stress)} of 100`}>
        <span style={{ width: `${c.stress}%`, background: stressColour(c.stress) }} />
        <i style={{ left: `${RULES.stressedAt}%` }} />
        <i style={{ left: `${RULES.crisisAt}%` }} />
      </div>
      <p className="ctg-muted mt-1">
        Stress {Math.round(c.stress)}. Crisis at {RULES.crisisAt}; once in crisis, it ends below {RULES.crisisExit}.
      </p>
      <dl className="ctg-facts">
        <Fact label="Vulnerability" value={`${Math.round(v * 100)}`} />
        <Fact label="Public debt" value={`${c.debt.toFixed(0)}% of GDP`} />
        <Fact label="Current account" value={`${s.ca["2025"] > 0 ? "+" : ""}${s.ca["2025"].toFixed(1)}%`} />
        <Fact label="Output lost" value={`${c.loss.toFixed(1)}%`} />
      </dl>
      {protections.length ? <p className="ctg-protect">{protections.join(" · ")}</p> : null}
      {c.debt > INSOLVENT_DEBT && !c.restructured && !d.center && c.status !== "calm" ? <p className="ctg-warn">Debt this high halves what a programme can do.</p> : null}
      <div className="ctg-actions">
        {ACTIONS.map((a) => (
          <ActionButton key={a.kind} world={world} action={{ kind: a.kind, iso }} title={a.title} text={a.kind === "programme" ? `${a.text} Works at ${Math.round(eff * 100)}% given your credibility${eff < 0.7 ? " and its debt" : ""}.` : a.text} onAct={onAct} advised={advice?.kind === a.kind && advice.iso === iso} />
        ))}
      </div>
    </section>
  );
}

function ActionButton({ world, action, title, text, onAct, advised }: { world: World; action: Action; title: string; text: string; onAct: (a: Action) => void; advised: boolean }) {
  const check = canAct(world, action);
  const k = cost(world, action);
  return (
    <button type="button" className={`ctg-action ${advised ? "is-advised" : ""}`} disabled={!check.ok} onClick={() => onAct(action)}>
      <span className="flex items-center justify-between gap-2">
        <strong>{title}</strong>
        <span className="ctg-cost">
          {k.capacity ? <span title="Lending capacity">{k.capacity} cap</span> : null}
          {k.trust ? <span title="Credibility">−{k.trust} cred</span> : null}
        </span>
      </span>
      <span>{check.ok ? text : check.reason}</span>
    </button>
  );
}

function News({ world }: { world: World }) {
  const items = world.news.filter((n) => n.quarter >= world.quarter - 1).slice(-8).reverse();
  return (
    <section className="ctg-card">
      <h3 className="ctg-h3">Wire</h3>
      <ul className="ctg-news">
        {items.map((n, i) => (
          <li key={`${n.quarter}-${i}-${n.text}`} className={`is-${n.kind}`}>
            <span className="ctg-news-q">{n.quarter === 0 ? "Start" : `Q${n.quarter}`}</span>
            {headline(n, world.seed) ? (
              <>
                <strong className="ctg-news-head">{headline(n, world.seed)}</strong>
                <span className="ctg-news-fact">{n.text}</span>
              </>
            ) : (
              <span className="ctg-news-deputy">{n.text}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---- The end ----------------------------------------------------------- */

const LESSONS = [
  "In 1997 Thailand's crisis jumped to Indonesia, Korea and beyond within months: investors who lost money in one emerging market pulled out of others that looked similar.",
  "In 2008 a crisis at the centre went everywhere at once. Coordinated central-bank swap lines did more to calm it than any single rescue.",
  "In 2010–12 the euro area learned that a programme on unpayable debt only buys time; Greece's debt was finally restructured in 2012.",
];

function Debrief() {
  const world = useContagion((s) => s.world)!;
  const result = useContagion((s) => s.result)!;
  const again = useContagion((s) => s.again);
  const chooseAgain = useContagion((s) => s.chooseAgain);
  const setScreen = useGame((s) => s.setScreen);
  const recordStars = useGame((s) => s.recordStars);
  const asksLeft = useContagion((s) => s.asksLeft);
  const won = result.kind === "won";
  const badges = useMemo(() => earnedBadges(world, result, ASKS - asksLeft), [world, result, asksLeft]);
  // Which badges were already earned before this game, read once when the card opens.
  const [before] = useState(() => new Set(Object.keys(useGame.getState().progress.stars).filter((k) => k.startsWith("badge-"))));
  const title = verdict(world, result);

  useEffect(() => {
    if (result.kind === "won") recordStars(`contagion-${world.origin}`, result.stars);
    for (const b of badges) recordStars(`badge-${b.id}`, 1);
  }, [result, world.origin, recordStars, badges]);

  const peak = Math.max(...world.history.map((h) => h.crises));
  const hit = countriesHit(world);
  const lesson = LESSONS[world.seed % LESSONS.length];

  return (
    <div className="game-modal-backdrop" role="presentation">
      <div className={`game-card game-debrief ${won ? "" : "is-lost"}`} role="dialog" aria-modal="true" aria-labelledby="ctg-debrief-title">
        <p className="game-eyebrow">Contagion · started in {WEO.countries[world.origin].name}</p>
        <h2 id="ctg-debrief-title" className="font-display text-[1.7rem] font-semibold leading-tight">
          {title.title}
        </h2>
        <p className="ctg-verdict">{won ? "Contained. " : "It got away. "}{title.line}</p>
        {won ? (
          <p className="game-mission-stars mt-1 text-[1.3rem]" aria-label={`${result.stars} of 3 stars`}>
            {[1, 2, 3].map((k) => (
              <span key={k} className={k <= result.stars ? "is-on" : ""}>★</span>
            ))}
          </p>
        ) : (
          <p className="mt-1 text-[0.9rem]">{result.kind === "lost" ? result.reason : ""}</p>
        )}
        <dl className="ctg-facts mt-3">
          <Fact label="Spread to" value={`${hit} ${hit === 1 ? "country" : "countries"}`} />
          <Fact label="Most in crisis at once" value={`${peak}`} />
          <Fact label="Spillover losses" value={`${world.spillLoss.toFixed(1)}% of world GDP`} />
          <Fact label="Fund credibility" value={`${world.trust}/10`} />
        </dl>
        <ul className="ctg-how mt-2">
          <li>{starRescued(world) ? "✓" : "✗"} {WEO.countries[world.origin].name} out of crisis</li>
          <li>{hit <= RULES.winHit ? "✓" : "✗"} Spread to {RULES.winHit} countries or fewer</li>
          <li>{starTight(world) ? "★" : "☆"} Spread to {RULES.starHit} country at most, and no other financial centre</li>
          <li>{world.spillLoss <= RULES.starLoss ? "★" : "☆"} Spillover losses of {RULES.starLoss}% of world GDP or less</li>
        </ul>
        {badges.length ? (
          <ul className="ctg-badges" aria-label="Badges earned">
            {badges.map((b) => (
              <li key={b.id} title={b.text}>
                <strong>{b.title}</strong>
                {!before.has(`badge-${b.id}`) ? <span className="ctg-badge-new">New</span> : null}
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <Spark world={world} />
        <p className="ctg-lesson">{lesson}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="lab-btn lab-btn-primary lab-btn-md" onClick={again} autoFocus>
            Try {WEO.countries[world.origin].name} again
          </button>
          <button type="button" className="lab-btn lab-btn-soft lab-btn-md" onClick={chooseAgain}>
            Choose another origin
          </button>
          <button type="button" className="lab-btn lab-btn-ghost lab-btn-md" onClick={() => setScreen("missions")}>
            Back to Play
          </button>
        </div>
        <p className="mt-3 text-[0.64rem] text-[var(--lab-ink-2)]">A deliberately simple network model built on IMF WEO figures, for play and learning. Independent of the IMF.</p>
      </div>
    </div>
  );
}

/** Countries in crisis and market panic, quarter by quarter. */
function Spark({ world }: { world: World }) {
  const h = world.history;
  const w = 320;
  const ht = 70;
  const x = (q: number) => 6 + (q / RULES.quarters) * (w - 12);
  const yC = (n: number) => ht - 6 - (Math.min(n, RULES.maxCrises) / RULES.maxCrises) * (ht - 12);
  const yP = (p: number) => ht - 6 - (p / 100) * (ht - 12);
  return (
    <figure className="ctg-spark">
      <svg viewBox={`0 0 ${w} ${ht}`} role="img" aria-label="Countries in crisis and market panic over the game">
        <line x1={6} x2={w - 6} y1={yC(RULES.maxCrises)} y2={yC(RULES.maxCrises)} className="ctg-spark-limit" />
        <polyline points={h.map((p) => `${x(p.quarter)},${yP(p.panic)}`).join(" ")} className="ctg-spark-panic" />
        <polyline points={h.map((p) => `${x(p.quarter)},${yC(p.crises)}`).join(" ")} className="ctg-spark-crises" />
      </svg>
      <figcaption>
        <span className="is-crises">Countries in crisis</span> <span className="is-panic">Market panic</span>
      </figcaption>
    </figure>
  );
}
