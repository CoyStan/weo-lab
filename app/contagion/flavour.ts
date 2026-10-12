// The jokes. The engine says what happened in plain words; this file says it
// the way a slightly unhinged financial paper would. Satire of the profession,
// never of real people or nations. Picks are deterministic, so a replay of the
// same game reads the same.

import { countriesHit, def, RULES, type Action, type News, type Outcome, type World } from "./engine.ts";

function pick<T>(options: T[], ...keys: (string | number)[]): T {
  let h = 2166136261;
  for (const ch of keys.join("|")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return options[(h >>> 0) % options.length];
}

const fill = (line: string, name: string) => line.replaceAll("{name}", name);

const HEADLINES: Record<string, string[]> = {
  origin: [
    "It starts in {name}. It always starts somewhere.",
    "{name} has a bad quarter. The world has a bad feeling.",
    "Day one in {name}: a queue at the ATM, a rumour, and a very long weekend",
  ],
  crisis: [
    "Markets discover {name} exists, immediately regret it",
    "{name} insists everything is fine, from inside a very small bunker",
    "Investors leave {name} at a speed normally reserved for fire drills",
    "{name}'s finance ministry switches every phone to airplane mode",
    "Analysts downgrade {name}, then their own lunch plans",
    "{name}'s central bank holds an emergency meeting; nobody brought snacks",
    "Spreads in {name} widen faster than a consultant's invoice",
    "{name} enters crisis; local economists finally get booked on TV",
  ],
  "crisis-centre": [
    "{name} wobbles; economists everywhere quietly update their CVs",
    "{name} now 'monitoring the situation closely', which is never good",
    "Crisis reaches {name}. The safe haven has a leak.",
  ],
  recovery: [
    "{name} out of crisis; finance minister sleeps more than four hours",
    "{name} recovers; bond traders pretend they never left",
    "Calm returns to {name}. Economists declare victory, then caution",
    "{name} exits crisis; local news goes back to the weather",
  ],
  failed: [
    "Rescue of {name} rescues nobody; the fund's press office takes a long lunch",
    "{name}'s programme fails to hold. Credibility down, coffee consumption up",
  ],
  creditLine: [
    "Credit line for {name}: the most boring success of the decade, probably",
    "{name} gets a credit line it hopes never to use, like a fire extinguisher with paperwork",
    "{name} firewalled. Markets look around for a less defended snack",
  ],
  programme: [
    "Programme for {name}: money now, a 400-page memorandum later",
    "{name} signs a programme; the word 'conditionality' trends locally",
    "Fund staff land in {name} with spreadsheets and a sense of purpose",
  ],
  restructure: [
    "{name} restructures; creditors learn what a 'haircut' means without a barber",
    "{name}'s bondholders take losses and a long walk",
  ],
  assist: [
    "Technical team lands in {name}; brings laptops, leaves slide decks",
    "Experts arrive in {name} to fix the tax system and break the hotel Wi-Fi",
  ],
  calm: [
    "Swap lines announced; central bankers seen high-fiving in Basel",
    "Central banks lend each other dollars. Markets exhale, then check twice",
  ],
  rates: [
    "Major central banks raise rates; safe havens report record bookings",
    "Rates go up. Money goes home. Emerging markets say 'hm'",
  ],
  commodity: [
    "Commodity prices slump; exporters stare very hard at a spreadsheet",
    "Copper, soy and coffee all fall at once. Nobody saw it coming, except everyone",
  ],
  oil: [
    "Oil spikes; importers reconsider their life choices",
    "Oil up, mood down: importers' bills jump",
  ],
  tech: [
    "Tech stocks correct; several apps for buying apps lose value",
    "A tech sell-off rattles the financial centres; founders rediscover profit",
  ],
  recovery_event: [
    "Global recovery! Economists warn it may not last, as is tradition",
    "Trade picks up everywhere. Forecasters revise up, nervously",
  ],
};

/** A funny headline for a plain news item, or null for the deputy's own lines. */
export function headline(n: News, seed: number): string | null {
  if (n.kind === "deputy") return null;
  const name = n.iso ? def(n.iso).name : "";
  let key: string;
  if (n.kind === "event") key = n.tag === "recovery" ? "recovery_event" : (n.tag ?? "rates");
  else if (n.kind === "fund" || n.tag === "failed" || n.tag === "origin") key = n.tag ?? "programme";
  else if (n.kind === "crisis") key = n.iso && def(n.iso).center ? "crisis-centre" : "crisis";
  else key = "recovery";
  const options = HEADLINES[key];
  return options ? fill(pick(options, seed, n.quarter, n.iso ?? "", key), name) : null;
}

/* ---- The deputy ---------------------------------------------------------- */

export const DEPUTY = "Pat Mensah, your deputy";

const QUIPS: Record<Action["kind"] | "none" | "busy", string[]> = {
  programme: [
    "I've seen this film. In the sequel, the money arrives late.",
    "Every quarter we wait, the memorandum gets ten pages longer.",
  ],
  restructure: [
    "I've drafted the memo. I'm calling it 'Trim, Not Shave'.",
    "The creditors will hate it. The creditors hate everything.",
  ],
  creditLine: [
    "Cheap now, expensive later. Like dentistry.",
    "I was on the '98 mission. I still flinch when someone says 'peg'.",
  ],
  assist: [
    "Send the team. They're bored, and bored economists write papers.",
    "Small thing, big difference. Also the team has frequent-flyer status to protect.",
  ],
  calm: [
    "Call the central banks. They love a joint statement almost as much as a podium.",
    "Nothing calms a market like seven governors agreeing on one sentence.",
  ],
  none: [
    "Enjoy it. This is what calm looks like, and it never lasts.",
    "Honestly? Do nothing. It's harder than it sounds.",
  ],
  busy: [
    "Every team is out. I've started answering the phones myself.",
    "No one left to send. I could go, but someone has to water the ficus.",
  ],
};

export function deputyQuip(world: World, a: Action | null): string {
  const key = a ? a.kind : world.staffLeft === 0 ? "busy" : "none";
  return pick(QUIPS[key], world.seed, world.quarter, key);
}

const TOLD_YOU = [
  "I'm not saying I told you so. I'm writing it in my memoir.",
  "For the record, I suggested {name}. In bold. With a highlighter.",
  "{name}. I said {name}. I'm going to go lie down in the archive.",
];

/** The deputy's line when advice about a country was ignored and that country fell. */
export function toldYouSo(world: World, iso: string): News {
  const name = def(iso).name;
  return { quarter: world.quarter, kind: "deputy", iso, tag: "told", text: `${DEPUTY.split(",")[0]}: "${fill(pick(TOLD_YOU, world.seed, world.quarter, iso), name)}"` };
}

/* ---- How it ended ---------------------------------------------------------- */

export function verdict(w: World, result: Outcome): { title: string; line: string } {
  if (result.kind === "won") {
    if (result.stars === 3) return { title: "Firefighter of the Year", line: "Contained fast, cheaply, and almost nobody noticed. The highest compliment in crisis management." };
    if (result.stars === 2) return { title: "Competent, Unglamorous, Correct", line: "No statue, but a very good footnote." };
    return { title: "History Will Be Kind (Probably)", line: "It held. Some of it held. Enough of it held." };
  }
  const crises = Object.values(w.countries).filter((c) => c.status === "crisis").length;
  if (crises >= RULES.maxCrises) return { title: "Your Name Is Now a Verb in Textbooks (Bad)", line: "As in: 'they really pulled a fund director there.'" };
  if (w.countries[w.origin].status === "crisis") return { title: "You Were Technically Employed", line: `${def(w.origin).name} is still burning. The rest is commentary.` };
  if (countriesHit(w) <= RULES.winHit + 2) return { title: "So Close, Yet So Leveraged", line: "One more firewall and this was a different story." };
  return { title: "It Got Away", line: "Contagion is fast. Next time, build the walls before the fire." };
}

/* ---- Badges ------------------------------------------------------------- */

export type Badge = { id: string; title: string; text: string };

export const BADGES: Badge[] = [
  { id: "too-big", title: "Too Big to Fail", text: "Contain a crisis that started in a financial centre." },
  { id: "iceland", title: "The Iceland Gambit", text: "Contain a crisis that started in Iceland." },
  { id: "clean-sheet", title: "Clean Sheet", text: "Win without a single other country falling into crisis." },
  { id: "no-swaps", title: "Nothing to See Here", text: "Win without coordinated swap lines." },
  { id: "solo", title: "Who Needs a Deputy", text: "Win without asking your deputy once." },
  { id: "photo-finish", title: "Photo Finish", text: `Win with exactly ${RULES.winHit} countries hit.` },
  { id: "firewalls", title: "Firewall Enthusiast", text: "Open eight or more credit lines in one game." },
  { id: "haircuts", title: "Austerity Speedrun", text: "Support three debt restructurings in one game." },
  { id: "should-have", title: "Should Have Listened", text: "Lose with every deputy hint unused." },
];

/** Badges earned in a finished game. */
export function earnedBadges(w: World, result: Outcome, asksUsed: number): Badge[] {
  const count = (tag: string) => w.news.filter((n) => n.kind === "fund" && n.tag === tag).length;
  const won = result.kind === "won";
  const ids = new Set<string>();
  if (won && def(w.origin).center) ids.add("too-big");
  if (won && w.origin === "ISL") ids.add("iceland");
  if (won && countriesHit(w) === 0) ids.add("clean-sheet");
  if (won && count("calm") === 0) ids.add("no-swaps");
  if (won && asksUsed === 0) ids.add("solo");
  if (won && countriesHit(w) === RULES.winHit) ids.add("photo-finish");
  if (count("creditLine") >= 8) ids.add("firewalls");
  if (count("restructure") >= 3) ids.add("haircuts");
  if (!won && asksUsed === 0) ids.add("should-have");
  return BADGES.filter((b) => ids.has(b.id));
}

