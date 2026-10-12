// Contagion: a financial crisis starts in one country and spreads through
// trade and finance. The player runs a fictional international stability fund
// with limited money, staff and credibility. Countries' vulnerabilities come
// from their real IMF WEO numbers; the spreading rules are a deliberately
// simple network model, tuned for play, not a forecast.
//
// Pure and deterministic: the same origin, seed and actions give the same world.

import { mulberry32 } from "../model/random.ts";

export type Region = "north-america" | "latin-america" | "europe" | "middle-east" | "africa" | "south-asia" | "east-asia" | "oceania";

export type CountryDef = {
  iso: string;
  name: string;
  region: Region;
  /** Hex cell on the map: column, row (odd rows shifted right). */
  hex: [number, number];
  /** A financial centre: its trouble reaches everyone. */
  center?: boolean;
  /** Reserve-currency or safe-haven discount on vulnerability (0..1). */
  haven?: number;
  commodity?: boolean;
  oil?: boolean;
  /** Major trade or finance partners beyond the neighbourhood. */
  partners?: string[];
};

export const COUNTRIES: CountryDef[] = [
  { iso: "CAN", name: "Canada", region: "north-america", hex: [2, 0], commodity: true },
  { iso: "ISL", name: "Iceland", region: "europe", hex: [6, 0] },
  { iso: "USA", name: "United States", region: "north-america", hex: [2, 1], center: true, haven: 0.45 },
  { iso: "GBR", name: "United Kingdom", region: "europe", hex: [6, 1], center: true, haven: 0.65 },
  { iso: "DEU", name: "Germany", region: "europe", hex: [7, 1], center: true, haven: 0.55 },
  { iso: "POL", name: "Poland", region: "europe", hex: [8, 1] },
  { iso: "KOR", name: "Korea", region: "east-asia", hex: [13, 1] },
  { iso: "JPN", name: "Japan", region: "east-asia", hex: [14, 1], center: true, haven: 0.5 },
  { iso: "MEX", name: "Mexico", region: "north-america", hex: [2, 2] },
  { iso: "FRA", name: "France", region: "europe", hex: [6, 2] },
  { iso: "ITA", name: "Italy", region: "europe", hex: [7, 2] },
  { iso: "TUR", name: "Türkiye", region: "middle-east", hex: [9, 2] },
  { iso: "CHN", name: "China", region: "east-asia", hex: [12, 2], center: true, haven: 0.7 },
  { iso: "COL", name: "Colombia", region: "latin-america", hex: [3, 3], commodity: true },
  { iso: "GRC", name: "Greece", region: "europe", hex: [8, 3] },
  { iso: "EGY", name: "Egypt", region: "middle-east", hex: [9, 3] },
  { iso: "SAU", name: "Saudi Arabia", region: "middle-east", hex: [10, 3], oil: true },
  { iso: "PAK", name: "Pakistan", region: "south-asia", hex: [11, 3] },
  { iso: "VNM", name: "Vietnam", region: "east-asia", hex: [13, 3] },
  { iso: "BRA", name: "Brazil", region: "latin-america", hex: [4, 4], commodity: true },
  { iso: "NGA", name: "Nigeria", region: "africa", hex: [7, 4], oil: true, commodity: true },
  { iso: "IND", name: "India", region: "south-asia", hex: [11, 4] },
  { iso: "THA", name: "Thailand", region: "east-asia", hex: [12, 4] },
  { iso: "PHL", name: "Philippines", region: "east-asia", hex: [14, 4] },
  { iso: "ARG", name: "Argentina", region: "latin-america", hex: [3, 5], commodity: true },
  { iso: "KEN", name: "Kenya", region: "africa", hex: [9, 5] },
  { iso: "IDN", name: "Indonesia", region: "east-asia", hex: [13, 5], commodity: true },
  { iso: "CHL", name: "Chile", region: "latin-america", hex: [3, 6], commodity: true },
  { iso: "ZAF", name: "South Africa", region: "africa", hex: [8, 6], commodity: true },
  { iso: "AUS", name: "Australia", region: "oceania", hex: [14, 6], commodity: true, partners: ["CHN", "JPN", "IDN"] },
];

/** Regions that trade heavily with each other. */
const NEIGHBOURS: Record<Region, Region[]> = {
  "north-america": ["latin-america", "europe", "east-asia"],
  "latin-america": ["north-america"],
  europe: ["north-america", "middle-east", "africa"],
  "middle-east": ["europe", "south-asia", "africa"],
  africa: ["europe", "middle-east"],
  "south-asia": ["middle-east", "east-asia"],
  "east-asia": ["south-asia", "oceania", "north-america"],
  oceania: ["east-asia"],
};

export type WeoSeries = Record<string, Record<string, number>>;
export type WeoLike = { countries: Record<string, { name: string; series: WeoSeries }> };

export type Status = "calm" | "stressed" | "crisis";

export type CountryState = {
  iso: string;
  stress: number;
  status: Status;
  /** Underlying vulnerability from the data, 0.15..1, before temporary shocks. */
  baseVuln: number;
  /** Temporary extra vulnerability from global events. */
  extraVuln: number;
  extraUntil: number;
  /** Share of the group's GDP. */
  share: number;
  debt: number;
  firewallUntil: number;
  programmeUntil: number;
  programmeFrom: number;
  assistUntil: number;
  restructured: boolean;
  everCrisis: boolean;
  /** Output lost so far, % of this country's GDP. */
  loss: number;
};

export type ActionKind = "creditLine" | "programme" | "restructure" | "assist" | "calm";
export type Action = { kind: Exclude<ActionKind, "calm">; iso: string } | { kind: "calm" };

export type News = { quarter: number; kind: "crisis" | "recovery" | "event" | "fund" | "warning"; text: string; iso?: string };

export type GlobalEventKind = "rates" | "commodity" | "oil" | "tech" | "recovery";

export type World = {
  origin: string;
  seed: number;
  quarter: number;
  countries: Record<string, CountryState>;
  /** Global risk aversion, 0..100. */
  panic: number;
  /** Lending capacity, in % of the fund's resources. */
  capacity: number;
  /** The fund's credibility, 0..10. */
  trust: number;
  staffLeft: number;
  /** The fund's resources for this game; bigger when a financial centre is the origin. */
  staff: number;
  maxCapacity: number;
  calmUses: number;
  /** The G20 topped up the fund because a financial centre fell. */
  boosted: boolean;
  calmLeft: number;
  /** Cumulative output loss, % of the group's GDP. */
  worldLoss: number;
  /** The part of it outside the origin: what contagion cost. */
  spillLoss: number;
  events: { quarter: number; kind: GlobalEventKind }[];
  news: News[];
  /** Actions taken this quarter, so they can be undone before the quarter ends. */
  pending: Action[];
  history: { quarter: number; worldLoss: number; panic: number; crises: number }[];
};

export const RULES = {
  quarters: 12,
  staff: 3,
  startCapacity: 100,
  capacityRefill: 8,
  maxCapacity: 120,
  boost: 2,
  startTrust: 5,
  calmUses: 2,
  crisisAt: 70,
  crisisExit: 50,
  stressedAt: 40,
  contagion: 14,
  panicPull: 15,
  panicShare: 25,
  epicentre: 1.6,
  centreLink: 0.45,
  stressedSpread: 0.2,
  recovery: 4,
  crisisRecovery: -2,
  originStress: 95,
  noise: 4,
  programmeRecovery: 9,
  programmeHit: 12,
  crisisLoss: 2.2,
  stressedLoss: 0.3,
  lossCap: 6,
  maxCrises: 10,
  winLoss: 3,
  winCrises: 3,
  winHit: 3,
  starHit: 1,
  starLoss: 0.6,
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function vulnerability(def: CountryDef, s: WeoSeries): number {
  const debt = s.debt?.["2025"] ?? 60;
  const ca = s.ca?.["2025"] ?? 0;
  const infl = s.infl?.["2025"] ?? 3;
  const growth = s.growth?.["2025"] ?? 2;
  const raw = 0.25 + 0.004 * Math.max(0, debt - 40) + 0.035 * Math.max(0, -ca) + 0.012 * Math.max(0, infl - 3) + 0.04 * Math.max(0, 2 - growth);
  return clamp(raw * (def.haven ?? 1), 0.15, 1);
}

export function createWorld(data: WeoLike, origin: string, seed: number): World {
  const gdp = Object.fromEntries(COUNTRIES.map((c) => [c.iso, data.countries[c.iso]?.series.gdp?.["2025"] ?? 100]));
  const total = Object.values(gdp).reduce((a, b) => a + b, 0);
  const countries: Record<string, CountryState> = {};
  for (const def of COUNTRIES) {
    const s = data.countries[def.iso]?.series ?? {};
    const base = vulnerability(def, s);
    const start = def.iso === origin ? RULES.originStress : 8 + 18 * base;
    countries[def.iso] = {
      iso: def.iso,
      stress: start,
      status: start >= RULES.crisisAt ? "crisis" : start >= RULES.stressedAt ? "stressed" : "calm",
      baseVuln: base,
      extraVuln: 0,
      extraUntil: 0,
      share: gdp[def.iso] / total,
      debt: s.debt?.["2025"] ?? 60,
      firewallUntil: 0,
      programmeUntil: 0,
      programmeFrom: 0,
      assistUntil: 0,
      restructured: false,
      everCrisis: def.iso === origin,
      loss: 0,
    };
  }
  const rand = mulberry32(seed);
  const kinds: GlobalEventKind[] = ["rates", "commodity", "oil", "tech", "recovery"];
  const events: World["events"] = [];
  const used = new Set<GlobalEventKind>();
  while (events.length < 3) {
    const kind = kinds[Math.floor(rand() * kinds.length)];
    if (used.has(kind)) continue;
    used.add(kind);
    events.push({ quarter: 2 + Math.floor(rand() * (RULES.quarters - 3)), kind });
  }
  events.sort((a, b) => a.quarter - b.quarter);
  const def = COUNTRIES.find((c) => c.iso === origin)!;
  return {
    origin,
    seed,
    quarter: 0,
    countries,
    panic: 20 + (def.center ? 15 : 0),
    capacity: RULES.startCapacity * (def.center ? RULES.boost : 1),
    trust: RULES.startTrust,
    staffLeft: RULES.staff + (def.center ? 1 : 0),
    staff: RULES.staff + (def.center ? 1 : 0),
    maxCapacity: RULES.maxCapacity * (def.center ? RULES.boost : 1),
    calmUses: RULES.calmUses + (def.center ? 1 : 0),
    calmLeft: RULES.calmUses + (def.center ? 1 : 0),
    boosted: Boolean(def.center),
    worldLoss: 0,
    spillLoss: 0,
    events,
    news: [{ quarter: 0, kind: "crisis", iso: origin, text: `Crisis breaks out in ${def.name}.` }],
    pending: [],
    history: [{ quarter: 0, worldLoss: 0, panic: 20 + (def.center ? 15 : 0), crises: 1 }],
  };
}

export const def = (iso: string) => COUNTRIES.find((c) => c.iso === iso)!;
export const vuln = (c: CountryState, quarter: number) => clamp(c.baseVuln + (c.extraUntil > quarter ? c.extraVuln : 0) - (c.assistUntil > quarter ? 0.08 : 0) - (c.restructured ? 0.1 : 0), 0.1, 1.2);

/** Debt above this, a programme without restructuring works only half as well. */
export const INSOLVENT_DEBT = 100;

export function cost(world: World, action: Action): { capacity: number; staff: number; trust: number } {
  if (action.kind === "calm") return { capacity: 15, staff: 1, trust: 0 };
  const c = world.countries[action.iso];
  switch (action.kind) {
    case "creditLine":
      return { capacity: Math.round(4 + 30 * c.share), staff: 1, trust: 0 };
    case "programme":
      return { capacity: Math.round(10 + 80 * c.share), staff: 1, trust: 0 };
    case "restructure":
      return { capacity: 3, staff: 1, trust: 1 };
    case "assist":
      return { capacity: 2, staff: 1, trust: 0 };
  }
}

export function canAct(world: World, action: Action): { ok: boolean; reason?: string } {
  if (world.quarter >= RULES.quarters) return { ok: false, reason: "The game is over" };
  const k = cost(world, action);
  if (world.staffLeft < k.staff) return { ok: false, reason: "No staff left this quarter" };
  if (world.capacity < k.capacity) return { ok: false, reason: "Not enough lending capacity" };
  if (world.trust < k.trust) return { ok: false, reason: "Not enough credibility" };
  if (action.kind === "calm") return world.calmLeft > 0 ? { ok: true } : { ok: false, reason: "No coordinated actions left" };
  const c = world.countries[action.iso];
  const t = world.quarter;
  if (world.pending.some((a) => a.kind !== "calm" && a.iso === action.iso && a.kind === action.kind)) return { ok: false, reason: "Already done this quarter" };
  switch (action.kind) {
    case "creditLine":
      if (c.status === "crisis") return { ok: false, reason: "Too late for a precautionary line" };
      if (c.firewallUntil > t) return { ok: false, reason: "Credit line already in place" };
      if (vuln(c, t) > 0.75) return { ok: false, reason: "Too vulnerable to qualify" };
      return { ok: true };
    case "programme":
      if (c.status === "calm") return { ok: false, reason: "Not needed yet" };
      if (c.programmeUntil > t) return { ok: false, reason: "Programme already running" };
      return { ok: true };
    case "restructure":
      if (c.restructured) return { ok: false, reason: "Already restructured" };
      if (def(c.iso).center) return { ok: false, reason: "Reserve-currency debt is not restructured" };
      if (c.debt < 60) return { ok: false, reason: "Debt is sustainable" };
      if (c.status !== "crisis") return { ok: false, reason: "Only in a crisis" };
      return { ok: true };
    case "assist":
      if (c.assistUntil > t) return { ok: false, reason: "Mission already on the ground" };
      return { ok: true };
  }
}

/** Programmes work better when the fund is credible, and poorly on unpayable debt unless it is restructured. */
export function effectiveness(world: World, c: CountryState): number {
  return (0.7 + 0.06 * world.trust) * (c.debt > INSOLVENT_DEBT && !c.restructured && !def(c.iso).center ? 0.5 : 1);
}

function clone(world: World): World {
  return { ...world, countries: Object.fromEntries(Object.entries(world.countries).map(([k, v]) => [k, { ...v }])), news: [...world.news], pending: [...world.pending], history: [...world.history], events: [...world.events] };
}

export function act(world: World, action: Action): World {
  if (!canAct(world, action).ok) return world;
  const w = clone(world);
  const k = cost(world, action);
  w.capacity -= k.capacity;
  w.staffLeft -= k.staff;
  w.trust -= k.trust;
  w.pending.push(action);
  const t = w.quarter;
  if (action.kind === "calm") {
    w.calmLeft -= 1;
    w.panic = Math.max(0, w.panic - 22);
    w.news.push({ quarter: t + 1, kind: "fund", text: "Central banks announce coordinated swap lines. Markets breathe out." });
    return w;
  }
  const c = w.countries[action.iso];
  const name = def(action.iso).name;
  if (action.kind === "creditLine") {
    c.firewallUntil = t + 5;
    w.news.push({ quarter: t + 1, kind: "fund", iso: c.iso, text: `${name} secures a precautionary credit line.` });
  } else if (action.kind === "programme") {
    c.programmeFrom = t + 1;
    c.programmeUntil = t + 5;
    c.stress = clamp(c.stress - RULES.programmeHit * effectiveness(w, c), 0, 100);
    w.news.push({ quarter: t + 1, kind: "fund", iso: c.iso, text: `Emergency programme approved for ${name}.` });
  } else if (action.kind === "restructure") {
    c.restructured = true;
    c.debt *= 0.75;
    w.panic = clamp(w.panic + 4, 0, 100);
    w.news.push({ quarter: t + 1, kind: "fund", iso: c.iso, text: `${name} restructures its debt; creditors take losses.` });
  } else {
    c.assistUntil = t + 4;
    w.news.push({ quarter: t + 1, kind: "fund", iso: c.iso, text: `Technical team arrives in ${name}.` });
  }
  return w;
}

const EVENT_TEXT: Record<GlobalEventKind, string> = {
  rates: "Major central banks raise rates. Money flows back to safe havens.",
  commodity: "Commodity prices slump. Exporters' revenues fall.",
  oil: "Oil prices spike. Importers' bills jump.",
  tech: "A tech-stock correction rattles the financial centres.",
  recovery: "A strong global recovery lifts trade everywhere.",
};

function applyEvent(w: World, kind: GlobalEventKind) {
  const t = w.quarter;
  for (const c of Object.values(w.countries)) {
    const d = def(c.iso);
    if (kind === "rates" && !d.center) {
      c.extraVuln = 0.08;
      c.extraUntil = t + 4;
    }
    if (kind === "commodity" && d.commodity) {
      c.extraVuln = 0.15;
      c.extraUntil = t + 4;
    }
    if (kind === "oil" && !d.oil) {
      c.extraVuln = 0.06;
      c.extraUntil = t + 3;
    }
    if (kind === "oil" && d.oil) c.stress = clamp(c.stress - 6, 0, 100);
    if (kind === "tech" && d.center) c.stress = clamp(c.stress + 14, 0, 100);
    if (kind === "recovery") c.stress = clamp(c.stress - 6, 0, 100);
  }
  if (kind === "rates") w.panic = clamp(w.panic + 12, 0, 100);
  if (kind === "recovery") w.panic = clamp(w.panic - 10, 0, 100);
  w.news.push({ quarter: t, kind: "event", text: EVENT_TEXT[kind] });
}

/** Steps between two cells on the map (odd rows shifted right). */
export function hexDistance([c1, r1]: [number, number], [c2, r2]: [number, number]): number {
  const cube = (c: number, r: number) => {
    const x = c - (r - (r & 1)) / 2;
    return [x, r, -x - r];
  };
  const a = cube(c1, r1);
  const b = cube(c2, r2);
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

export function link(a: CountryDef, b: CountryDef): number {
  let l = a.region === b.region ? 1 : NEIGHBOURS[a.region].includes(b.region) ? 0.35 : 0.1;
  const d = hexDistance(a.hex, b.hex);
  if (d === 1) l = Math.max(l, 1);
  else if (d === 2) l = Math.max(l, 0.6);
  if (b.center) l = Math.max(l, RULES.centreLink);
  if (a.partners?.includes(b.iso) || b.partners?.includes(a.iso)) l = Math.max(l, 1);
  return l;
}

/** Advance one quarter: contagion, recovery, losses, panic and the fund's standing. */
export function step(world: World): World {
  const w = clone(world);
  // Market noise: the same seed and quarter always give the same jolts.
  const rand = mulberry32(world.seed * 31 + world.quarter * 7919 + 1);
  w.quarter += 1;
  const t = w.quarter;
  w.pending = [];
  for (const e of w.events) if (e.quarter === t) applyEvent(w, e.kind);

  const all = Object.values(w.countries);
  const maxShare = Math.max(...all.map((c) => c.share));
  const intensity = Object.fromEntries(all.map((c) => [c.iso, (c.status === "crisis" ? 1 : c.status === "stressed" ? RULES.stressedSpread : 0) * (0.6 + 0.5 * Math.sqrt(c.share / maxShare)) * (c.iso === w.origin ? RULES.epicentre : 1)]));
  const before = Object.fromEntries(all.map((c) => [c.iso, c.status]));

  const next: Record<string, number> = {};
  for (const c of all) {
    const d = def(c.iso);
    let exposure = 0;
    for (const o of all) if (o.iso !== c.iso && intensity[o.iso] > 0) exposure += link(d, def(o.iso)) * intensity[o.iso];
    let inflow = RULES.contagion * vuln(c, t) * exposure + RULES.panicPull * vuln(c, t) * (w.panic / 100);
    if (c.firewallUntil >= t) inflow *= 0.4;
    let recovery = c.status === "crisis" ? RULES.crisisRecovery : RULES.recovery;
    if (c.programmeUntil >= t) recovery += RULES.programmeRecovery * effectiveness(w, c);
    if (c.assistUntil >= t) recovery += 1;
    const jolt = RULES.noise * (rand() * 2 - 1);
    next[c.iso] = clamp(c.stress + inflow - recovery + jolt, 0, 100);
  }

  let newCrises = 0;
  let crisisShare = 0;
  for (const c of all) {
    c.stress = next[c.iso];
    const was = before[c.iso];
    c.status = was === "crisis" ? (c.stress < RULES.crisisExit ? "stressed" : "crisis") : c.stress >= RULES.crisisAt ? "crisis" : c.stress >= RULES.stressedAt ? "stressed" : "calm";
    const name = def(c.iso).name;
    if (was !== "crisis" && c.status === "crisis") {
      newCrises++;
      c.everCrisis = true;
      w.news.push({ quarter: t, kind: "crisis", iso: c.iso, text: `Contagion reaches ${name}: crisis.` });
      if (c.programmeUntil >= t) {
        w.trust = clamp(w.trust - 1, 0, 10);
        w.news.push({ quarter: t, kind: "warning", iso: c.iso, text: `${name}'s programme failed to hold. The fund's credibility suffers.` });
      }
    }
    if (was === "crisis" && c.status !== "crisis") {
      w.news.push({ quarter: t, kind: "recovery", iso: c.iso, text: `${name} is out of crisis.` });
      if (c.programmeFrom > 0 && c.programmeFrom >= t - 6) w.trust = clamp(w.trust + 1, 0, 10);
    }
    const loss = c.status === "crisis" ? RULES.crisisLoss * (c.programmeUntil >= t ? 0.6 : 1) : c.status === "stressed" ? RULES.stressedLoss : 0;
    c.loss += loss;
    w.worldLoss += c.share * loss;
    if (c.iso !== w.origin) w.spillLoss += c.share * loss;
    if (c.status === "crisis") crisisShare += c.share;
  }

  w.panic = clamp(0.75 * w.panic + RULES.panicShare * Math.sqrt(crisisShare) + 4 * newCrises - 2 * (w.trust - 5), 0, 100);
  w.capacity = Math.min(w.maxCapacity, w.capacity + RULES.capacityRefill * (w.boosted ? RULES.boost : 1));
  w.staffLeft = w.staff;
  const crises = all.filter((c) => c.status === "crisis").length;
  w.history.push({ quarter: t, worldLoss: w.worldLoss, panic: w.panic, crises });
  return w;
}

export type Outcome = { kind: "playing" } | { kind: "won"; stars: number } | { kind: "lost"; reason: string };

export function outcome(w: World): Outcome {
  const crises = Object.values(w.countries).filter((c) => c.status === "crisis").length;
  if (crises >= RULES.maxCrises) return { kind: "lost", reason: `${crises} countries are in crisis at once: a global financial crisis.` };
  if (w.spillLoss > RULES.lossCap) return { kind: "lost", reason: `Contagion has cost the rest of the world ${w.spillLoss.toFixed(1)}% of a year's output.` };
  if (w.quarter < RULES.quarters) return { kind: "playing" };
  if (w.spillLoss > RULES.winLoss) return { kind: "lost", reason: `Contagion cost the rest of the world ${w.spillLoss.toFixed(1)}% of output; the goal was ${RULES.winLoss}% or less.` };
  if (crises > RULES.winCrises) return { kind: "lost", reason: `${crises} countries are still in crisis; the goal was ${RULES.winCrises} or fewer.` };
  const hit = countriesHit(w);
  if (hit > RULES.winHit) return { kind: "lost", reason: `The crisis spread to ${hit} more countries; the goal was ${RULES.winHit} or fewer.` };
  if (!starRescued(w)) return { kind: "lost", reason: `${def(w.origin).name}, where it started, is still in crisis.` };
  return { kind: "won", stars: 1 + (starTight(w) ? 1 : 0) + (w.spillLoss <= RULES.starLoss ? 1 : 0) };
}

export const crisisCount = (w: World) => Object.values(w.countries).filter((c) => c.status === "crisis").length;

/** Countries other than the origin that have fallen into crisis at some point. */
export const countriesHit = (w: World) => Object.values(w.countries).filter((c) => c.everCrisis && c.iso !== w.origin).length;

/** Star: the crisis spread to at most one country, and no other financial centre. */
export const starTight = (w: World) => countriesHit(w) <= RULES.starHit && !COUNTRIES.some((c) => c.center && c.iso !== w.origin && w.countries[c.iso].everCrisis);
/** Required: the country where it started is out of crisis by the end. */
export const starRescued = (w: World) => w.countries[w.origin].status !== "crisis";
