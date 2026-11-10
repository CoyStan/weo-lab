// Review shots: the standard set of stills and motion sheets for a design-review round, in one run.
//
//   npm run build && node scripts/review-shots.mjs <out-dir>
//
// Serves the static build from out/, drives the game with Playwright, and writes to <out-dir>:
//   design-*    the design-shots set (scripts/design-shots.mjs): title, missions, briefing, shock
//               card, play, recap and the framework tabs, desktop 1440x900 and phone 390x844;
//   m1-*        mission 1 after raising the rate 2 pp, in the map view and the island view (key I),
//               at 1440x900, 1280x720, 1024x768, 390x844 and 2560x1440;
//   recap-*     the recap after ending 2026Q1, desktop and phone, from the map and from the island;
//   mission-*   missions 2, 4 and 6 (cost-shock, commodity-bust, sudden-stop) with their budget and
//               currency levers moved where unlocked, at the first decision and once the mission's
//               shock has landed (played with the policy the mission tests win with), desktop and
//               phone, map view;
//   backdrop-*  the title screen's island and free play (the sandbox), desktop;
//   motion-*    contact sheets. The map and the Map / Island control are filmed in real time from
//               a DevTools screencast (CSS transitions slowed where a 200 ms fade must be seen); the
//               island's moving parts on a virtual clock that the script steps by hand, since
//               headless WebGL draws only a few frames a second, except the tags' glide to a new
//               spot, a CSS transition filmed from a screencast with CSS slowed. The island films
//               include the sky clearing while the recap is open and the storm coming back after;
//   index.md    every file with one line on what it shows, and what the page said when it was
//               taken (view, quarter, open card); manifest.json holds the same. A last section
//               names the standard set's island elements this build has no code for (gulls, road
//               traffic), so their absence is stated rather than silently skipped.
//
// Env: ONLY=<regex> runs only the jobs whose names match (index.md keeps the files of earlier
// runs into the same folder); JOBS=<n> runs that many jobs at once (default 2; the real-time
// films always run alone, so the load does not change what they show).

import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const outDir = resolve(process.argv[2] ?? "review-shots");
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const parallel = Math.max(1, Number(process.env.JOBS ?? 2));
const root = resolve("out");
if (!existsSync(root)) {
  console.error("No out/ folder: run `npm run build` first.");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg", ".json": "application/json", ".txt": "text/plain", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();

// ---- The index ---------------------------------------------------------------------------

const GROUPS = [
  ["design", "Design shots (as scripts/design-shots.mjs)"],
  ["m1", "Mission 1, the rate raised 2 pp: map and island at five sizes"],
  ["recap", "The recap after ending 2026Q1"],
  ["mission", "Missions 2, 4 and 6: budget and currency levers moved (map view)"],
  ["backdrop", "The island as backdrop: title screen and free play"],
  ["motion-map", "Motion: the map and the Map / Island control (real time)"],
  ["motion-island", "Motion: the island's moving parts (virtual clock; the tag glide in real time)"],
];
const manifestPath = join(outDir, "manifest.json");
const manifest = new Map(existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")).map((e) => [e.file, e]) : []);
const errors = [];
const failed = [];

function record(file, group, what, note = "") {
  manifest.set(file, { file, group, what, note });
  console.log(`  ${file}${note ? `  [${note}]` : ""}`);
}

function writeIndex() {
  const entries = [...manifest.values()];
  writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
  const lines = ["# Review shots", "", `Taken by scripts/review-shots.mjs from out/ (${provenance()}). Square brackets: what the page said when the file was taken.`, ""];
  for (const [id, title] of GROUPS) {
    const rows = entries.filter((e) => e.group === id).sort((a, b) => a.file.localeCompare(b.file, "en", { numeric: true }));
    if (!rows.length) continue;
    lines.push(`## ${title}`, "");
    for (const e of rows) lines.push(`- \`${e.file}\`: ${e.what}${e.note ? ` [${e.note}]` : ""}`);
    lines.push("");
  }
  const absent = absentFromBuild();
  if (absent.length) {
    lines.push("## In the standard set, not in this build", "");
    for (const a of absent) lines.push(`- ${a}`);
    lines.push("");
  }
  writeFileSync(join(outDir, "index.md"), lines.join("\n"));
}

const git = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

/** What the shots were taken from: the checkout's commit, whether app/ differs from it, and when out/ was built. */
function provenance() {
  const head = git("rev-parse", "--short", "HEAD") || "unknown";
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  const dirty = git("status", "--porcelain", "--", "app", "public");
  const built = statSync(join(root, "index.html")).mtime.toISOString().replace(/\.\d+Z$/, "Z");
  return `checkout at ${head}${branch && branch !== "HEAD" ? ` on ${branch}` : ""}${dirty ? ", with uncommitted changes in app/ or public/" : ", app/ and public/ as committed"}; out/index.html written ${built}`;
}

/**
 * The standard set asks for gulls and road traffic on the island. Say so when the island's code
 * has none, so a missing film reads as "not in the build", not as a film that was skipped.
 */
function absentFromBuild() {
  const dirs = ["app/scene", "app/scenes/story"].map((d) => resolve(d)).filter((d) => existsSync(d));
  const src = dirs.flatMap((d) => readdirSync(d).filter((f) => /\.(tsx?|css)$/.test(f)).map((f) => readFileSync(join(d, f), "utf8"))).join("\n");
  const out = [];
  if (!/gull/i.test(src)) out.push("Gulls: no code in app/scene or app/scenes/story mentions gulls (they were removed in round 1, commit 78a38e9), so there is nothing to film.");
  if (!/traffic/i.test(src)) out.push("Road traffic: no code in app/scene or app/scenes/story mentions traffic (removed in round 1, commit 78a38e9); the roads only lay out or narrow away as landmarks rise or sink (`motion-island-16-*`).");
  return out;
}

// ---- Pages -------------------------------------------------------------------------------

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const SIZES = [
  ["1-desktop", DESKTOP],
  ["2-laptop", { width: 1280, height: 720 }],
  ["3-laptop", { width: 1024, height: 768 }],
  ["4-phone", PHONE],
  ["5-tv", { width: 2560, height: 1440 }],
];
const dims = (v) => `${v.width}x${v.height}`;

/**
 * A fresh browser context. unlock: every mission open (three stars each); noCoach: the
 * first-play pointer at the Map / Island control already seen; noHint: free play's hint
 * dismissed; vclock: performance.now() can be frozen and stepped by hand (see stepped()).
 */
async function open(job, { viewport = DESKTOP, reduced = false, unlock = false, noCoach = false, noHint = false, vclock = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference" });
  await ctx.addInitScript(
    ({ unlock, noCoach, noHint, vclock }) => {
      if (vclock) {
        const real = performance.now.bind(performance);
        let virt = null;
        window.__vclock = {
          freeze: () => (virt = real()),
          advance: (ms) => (virt = (virt ?? real()) + ms),
        };
        performance.now = () => (virt === null ? real() : virt);
      }
      try {
        if (unlock) window.localStorage.setItem("weo-lab.campaign.v1", JSON.stringify({ stars: { "first-quarter": 3, "cost-shock": 3, "debt-mountain": 3, "commodity-bust": 3, "defend-peg": 3, "sudden-stop": 3 } }));
        if (noCoach) window.localStorage.setItem("palari.weo-lab.island-coach.v1", "1");
        if (noHint) window.localStorage.setItem("palari.weo-lab.hint", "dismissed");
      } catch {
        // Storage blocked: the defaults show.
      }
    },
    { unlock, noCoach, noHint, vclock },
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${job}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${job} (console): ${m.text()}`);
  });
  return page;
}

/** From the title screen into a mission's play screen (mission 1 by default), with its first card open. */
async function startMission(page, title) {
  await page.goto(base);
  await page.waitForTimeout(1200);
  if (title) {
    await page.getByRole("button", { name: /mission/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator(`text=${title}`).first().click();
    await page.waitForTimeout(500);
    await page.locator(".game-cta").first().click();
  } else {
    await page.locator(".game-cta").first().click();
    await page.waitForTimeout(400);
    await page.locator(".game-cta").first().click();
  }
  await page.waitForTimeout(800);
}

/** Close news cards and recaps (a news card with its plain "carry on" choice). Never touches a debrief. */
async function closeCards(page) {
  for (let i = 0; i < 4; i++) {
    if (await page.locator(".game-debrief").count()) return "debrief";
    const btn = page.locator(".game-modal-backdrop .game-choice.is-plain, .game-modal-backdrop .lab-btn-primary").first();
    if (!(await btn.count())) return "none";
    await btn.click();
    await page.waitForTimeout(400);
  }
  return "open";
}

/** End the quarter, plan the next one from the recap, and close any news that follows. */
async function endQuarter(page) {
  await page.getByRole("button", { name: /^End / }).click();
  await page.waitForTimeout(1000);
  if (await page.locator(".game-debrief").count()) return "debrief";
  const plan = page.getByRole("button", { name: /^Plan / });
  if (await plan.count()) await plan.first().click();
  await page.waitForTimeout(700);
  return closeCards(page);
}

/** Press a lever's slider n steps (negative: down). Leaves the slider focused. */
async function nudge(page, label, n) {
  const s = page.getByRole("slider", { name: label, exact: true }).first();
  await s.focus();
  for (let i = 0; i < Math.abs(n); i++) await s.press(n < 0 ? "ArrowLeft" : "ArrowRight");
}

async function choose(page, group, option) {
  await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option, exact: true }).first().click();
  await page.waitForTimeout(200);
}

async function blur(page) {
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el && el instanceof HTMLElement) el.blur();
  });
}

const top = (page) => page.evaluate(() => window.scrollTo(0, 0));

/** Mounted, paused and ready: the island warms up a few seconds after the cards close. */
async function islandWarm(page) {
  await page.waitForSelector("#game-view-island canvas", { state: "attached", timeout: 30000 });
  await page.waitForTimeout(3000);
}

/** Switch the play screen's slot to the island with the I key and let it draw. */
async function toIsland(page) {
  await blur(page);
  await page.keyboard.press("i");
  await page.waitForSelector(".game-scene.is-island", { timeout: 60000 });
  await page.waitForTimeout(2500);
}

/** What the page says now, for the index: view, quarter, open card, the island's line. */
async function probe(page) {
  return page
    .evaluate(() => {
      const q = (s) => document.querySelector(s);
      const text = (s) => q(s)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const modal = q(".game-modal-backdrop");
      return {
        modal: modal ? (modal.classList.contains("game-fw-backdrop") ? "macro framework" : (modal.className.match(/is-(\w+)/)?.[1] ?? "card")) : "",
        lost: Boolean(q(".game-debrief.is-lost")),
        view: q(".game-scene")?.className.match(/is-(map|island)\b/)?.[1] ?? "",
        list: Boolean(q(".game-scene.is-list")),
        coach: Boolean(q(".game-scene-coach")),
        quarter: text(".game-progress-head strong"),
        line: text(".game-scene-islandline"),
        scrolls: document.documentElement.scrollHeight > window.innerHeight + 4,
      };
    })
    .catch(() => null);
}

function describe(p) {
  if (!p) return "";
  const out = [];
  if (p.quarter) out.push(p.quarter);
  if (p.view) out.push(`${p.view} view${p.list ? " (list)" : ""}`);
  out.push(p.modal ? `card open: ${p.modal}${p.lost ? " (Mission failed)" : ""}` : "no card open");
  if (p.coach) out.push("island pointer showing");
  if (p.view === "island" && p.line) out.push(`island line: "${p.line.slice(0, 160)}"`);
  return out.join("; ");
}

async function shoot(page, file, group, what, { full = false } = {}) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, file), fullPage: full });
  const p = await probe(page);
  record(file, group, what, describe(p));
  return p;
}

/** A viewport shot, and a full-page one when the page scrolls. */
async function shootBoth(page, stem, group, what) {
  await top(page);
  const p = await shoot(page, `${stem}.png`, group, what);
  // Below 1180 px the end-turn bar is position: fixed, so a whole-page capture draws it where it
  // sits on the first screen, over the page, not at the foot: say so, so it is not read as a bug.
  const fixedBar = await page.evaluate(() => {
    const bar = document.querySelector(".game-end");
    return Boolean(bar && getComputedStyle(bar).position === "fixed");
  });
  if (p?.scrolls) await shoot(page, `${stem}-full.png`, group, `${what}, whole page${fixedBar ? " (the end-turn bar is fixed to the screen's foot, so this capture draws it over the page where the first screen ends)" : ""}`, { full: true });
  return p;
}

// ---- Films -------------------------------------------------------------------------------

async function boxOf(page, selector) {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`nothing to film: ${selector} has no box`);
  return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
}

/** Play CSS transitions and animations at `rate` (DevTools Animation domain) until the page closes. */
async function slowCss(page, rate) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: rate });
  return cdp;
}

/**
 * Real time, from a DevTools screencast: `act` runs at t = 0, and frame i is what was on screen
 * at i * every ms (the last frame the page painted by then; its caption says how old it was).
 */
async function cast(page, { frames, every, act, lead = 500 }) {
  const { got, t0, took } = await screencast(page, { ms: frames * every + 600, act, lead });
  const out = pick(got, Array.from({ length: frames }, (_, i) => t0 + i * every), every, t0);
  // How long the key press or tap took to return: the page may only react once it has.
  if (act) out[0].note += ` · the action returned after ${took} ms`;
  return out;
}

/** Every frame a DevTools screencast sends for `ms` after `act` starts (t0, wall clock). */
async function screencast(page, { ms, act, lead = 500 }) {
  const cdp = await page.context().newCDPSession(page);
  const got = [];
  cdp.on("Page.screencastFrame", (f) => {
    got.push({ t: f.metadata.timestamp * 1000, data: f.data, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1 });
  await page.waitForTimeout(lead);
  const t0 = Date.now();
  if (act) await act();
  const took = Date.now() - t0;
  await page.waitForTimeout(Math.max(0, ms - took));
  await cdp.send("Page.stopScreencast");
  await cdp.detach().catch(() => {});
  if (!got.length) throw new Error("the screencast sent no frames");
  return { got, t0, took };
}

/** For each wall-clock time, the last frame painted by then; captions in ms from `zero`. */
function pick(got, times, every, zero) {
  return times.map((at) => {
    let best = got[0];
    for (const s of got) if (s.t <= at) best = s;
    const age = Math.max(0, Math.round(at - best.t));
    return { src: `data:image/jpeg;base64,${best.data}`, full: { width: best.w, height: best.h }, note: `${Math.round(at - zero)} ms${age > every ? ` · last paint ${age} ms before` : ""}` };
  });
}

/**
 * On the virtual clock: performance.now() (which three.js's clock reads) is frozen, then moved
 * on by hand, `slice` ms per drawn frame, so frame i is the scene exactly i * step ms of
 * animation time after the first, however long each frame took to draw. `act` runs just after
 * the first frame. The page must come from open(..., { vclock: true }).
 */
async function stepped(page, { clip, frames, step, slice = 50, settle = 0, act }) {
  const frame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  const advance = async (ms) => {
    for (let left = ms; left > 0; left -= slice) {
      await page.evaluate((d) => window.__vclock.advance(d), Math.min(slice, left));
      await frame();
    }
  };
  await page.evaluate(() => window.__vclock.freeze());
  await advance(settle);
  const out = [];
  for (let i = 0; i < frames; i++) {
    if (i === 1 && act) await act();
    if (i > 0) await advance(step);
    await frame();
    const buf = await page.screenshot({ clip: typeof clip === "function" ? await clip() : clip });
    out.push({ src: `data:image/png;base64,${buf.toString("base64")}`, note: `t + ${((i * step) / 1000).toFixed(2)} s` });
  }
  return out;
}

/** Lay the frames out as one contact sheet (left to right, top to bottom), with a title line. */
async function sheet(file, group, what, shots, { clip, cols = 4, note = "" }) {
  const scale = Math.min(1, 1600 / (cols * clip.width));
  const w = Math.round(clip.width * scale);
  const h = Math.round(clip.height * scale);
  const cell = (s) =>
    s.full
      ? `<div style="width:${w}px;height:${h}px;background:url(${s.src}) ${-clip.x * scale}px ${-clip.y * scale}px / ${s.full.width * scale}px ${s.full.height * scale}px no-repeat"></div>`
      : `<img src="${s.src}" width="${w}" height="${h}" style="display:block">`;
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: cols * (w + 8) + 8, height: 400 } });
  await page.setContent(
    `<body style="margin:0;padding:4px;background:#222;font:13px/1.35 sans-serif;color:#eee">` +
      `<p style="margin:2px 2px 6px;max-width:${cols * (w + 8) - 8}px">${file.replace(".png", "")}: ${what}</p>` +
      `<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px 8px">` +
      shots.map((s, i) => `<figure style="margin:0">${cell(s)}<figcaption>#${i + 1} · ${s.note}</figcaption></figure>`).join("") +
      "</div></body>",
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, file), fullPage: true });
  await page.close();
  record(file, group, what, note);
}

// ---- Jobs --------------------------------------------------------------------------------

const jobs = [];
/** solo: real-time films, run one at a time after the rest. */
const job = (name, run, solo = false) => jobs.push({ name, run, solo });

// Design shots: the same path as scripts/design-shots.mjs, with names that say what they are.
for (const [label, viewport] of [
  ["desktop", DESKTOP],
  ["phone", PHONE],
]) {
  job(`design-${label}`, async (name) => {
    const page = await open(name, { viewport });
    const g = "design";
    const sz = `${label} ${dims(viewport)}`;
    await page.goto(base);
    await page.waitForTimeout(1500);
    await shoot(page, `design-${label}-1-title.png`, g, `Title screen, ${sz}`);
    await page.getByRole("button", { name: /mission/i }).first().click();
    await shoot(page, `design-${label}-2-missions.png`, g, `Mission select, ${sz} (new player: mission 1 open)`);
    await page.goto(base);
    await page.waitForTimeout(1000);
    await page.locator(".game-cta").first().click();
    await shoot(page, `design-${label}-3-briefing.png`, g, `Mission 1 briefing, ${sz}`);
    await page.locator(".game-cta").first().click();
    await page.waitForTimeout(800);
    await shoot(page, `design-${label}-4-shock-card.png`, g, `Mission 1's first news card (food price surge), ${sz}`);
    await closeCards(page);
    const slider = page.locator("input[type=range]").first();
    await slider.focus();
    for (let i = 0; i < 8; i++) await slider.press("ArrowRight");
    await page.locator("body").click({ position: { x: 2, y: 2 } }).catch(() => {});
    await shoot(page, `design-${label}-5-play.png`, g, `Play screen right after raising the rate 8.5% to 10.5%, ${sz}`);
    await page.getByRole("button", { name: /^End / }).click();
    await page.waitForTimeout(700);
    await shoot(page, `design-${label}-6-recap.png`, g, `Recap after ending 2026Q1, ${sz}`);
    await page.getByRole("button", { name: "See every sector" }).click();
    await page.waitForTimeout(600);
    await shoot(page, `design-${label}-7-framework-top.png`, g, `Macro framework opened from the recap, ${sz}`);
    await page.getByRole("tab", { name: /Shocks vs policy/ }).click();
    await shoot(page, `design-${label}-8-decomposition.png`, g, `Framework: shocks vs policy tab, ${sz}`);
    await page.getByRole("tab", { name: /Channels/ }).click();
    await shoot(page, `design-${label}-9-channels.png`, g, `Framework: channels tab, ${sz}`);
    await page.getByRole("tab", { name: /Sector accounts/ }).click();
    await shoot(page, `design-${label}-10-sectors.png`, g, `Framework: sector accounts tab, ${sz}`);
    await page.context().close();
  });
}

// Mission 1, the rate raised 2 pp: the map, then the island (key I), at each size.
for (const [label, viewport] of SIZES) {
  job(`m1-${label}`, async (name) => {
    const page = await open(name, { viewport });
    await startMission(page);
    await closeCards(page);
    await nudge(page, "Policy rate", 8);
    // On the slider, letters reach the shortcuts (its arrows and Enter stay with it): I asks for the island...
    await page.keyboard.press("i");
    const asked = await page.locator('.game-scene-tabs button[data-view="island"][aria-pressed="true"]').count();
    if (!asked) errors.push(`${name}: I on the slider did not switch the view`);
    // ...and I again comes back to the map; then the slider lets go of focus before the shot.
    await page.keyboard.press("i");
    await blur(page);
    await page.waitForTimeout(2600);
    const sz = `${label.slice(2)} ${dims(viewport)}`;
    const stem = `m1-${label}-${dims(viewport)}`;
    const p = await shootBoth(page, `${stem}-map`, "m1", `Mission 1, rate 8.5% to 10.5%, map view (I pressed twice on the slider: to the island and back), ${sz}`);
    if (p?.view !== "map") errors.push(`${name}: I twice on the slider did not come back to the map`);
    await toIsland(page);
    await top(page);
    await shoot(page, `${stem}-island.png`, "m1", `The same after pressing I: island view, ${sz}`);
    await page.context().close();
  });
}

// The recap after ending 2026Q1 (rate raised 2 pp first), from each view.
for (const [label, viewport] of [
  ["desktop", DESKTOP],
  ["phone", PHONE],
]) {
  for (const view of ["map", "island"]) {
    job(`recap-${label}-${view}`, async (name) => {
      const page = await open(name, { viewport });
      await startMission(page);
      await closeCards(page);
      await nudge(page, "Policy rate", 8);
      await blur(page);
      if (view === "island") {
        await islandWarm(page);
        await toIsland(page);
      } else await page.waitForTimeout(1500);
      await page.getByRole("button", { name: /^End / }).click();
      await page.waitForTimeout(1500);
      await shootBoth(page, `recap-${label}-${view}`, "recap", `Recap card after ending 2026Q1 (rate raised to 10.5%), ${view} view behind it, ${label} ${dims(viewport)}`);
      await page.context().close();
    });
  }
}

// Missions 2, 4 and 6: the levers each unlocks moved, at the first decision ("start") and in the
// quarter its shock lands ("shock"), played with the plan app/game/missions.test.ts wins with.
const MISSIONS = [
  {
    id: "cost-shock",
    title: "A cost shock",
    start: { what: "rule reacts x0.6 to x1.5 (no budget or currency levers in this mission)", act: (p) => nudge(p, "How hard the rule reacts", 9) },
    shock: {
      what: "rule x1.5 from the start, three quarters played, the supply shock's news closed in the quarter it lands",
      plan: async (p, clock) => {
        if (clock === 0) await nudge(p, "How hard the rule reacts", 9);
      },
      quarters: 3,
    },
  },
  {
    id: "commodity-bust",
    title: "When the price falls",
    start: {
      what: "budget tightening +1 pp of GDP a year, intervention 50% to 25% of pressure",
      act: async (p) => {
        await nudge(p, "Tightening per year", 4);
        await nudge(p, "Intervention", -5);
      },
    },
    shock: {
      what: "budget +1 pp from the start, two quarters played, the commodity bust's news closed, then the currency floated (Float) in the quarter it lands",
      plan: async (p, clock) => {
        if (clock === 0) await nudge(p, "Tightening per year", 4);
        if (clock === 2) await choose(p, "Exchange-rate regime", "Float");
      },
      quarters: 2,
    },
  },
  {
    id: "sudden-stop",
    title: "Sudden stop",
    start: {
      what: "budget +1 pp a year, regime Managed with intervention 50% of pressure, IMF programme 2% of GDP a year",
      act: async (p) => {
        await nudge(p, "Tightening per year", 4);
        await choose(p, "Exchange-rate regime", "Managed");
        await nudge(p, "Intervention", 10);
        await nudge(p, "IMF programme", 4);
      },
    },
    shock: {
      what: "four quiet quarters played, the sudden stop's news closed, then budget +1 pp, Managed at 50% and IMF 2% (the mission's three-star plan) in the quarter it lands",
      plan: async (p, clock) => {
        if (clock !== 4) return;
        await nudge(p, "Tightening per year", 4);
        await choose(p, "Exchange-rate regime", "Managed");
        await nudge(p, "Intervention", 10);
        await nudge(p, "IMF programme", 4);
      },
      quarters: 4,
    },
  },
];
for (const m of MISSIONS) {
  for (const [label, viewport] of [
    ["desktop", DESKTOP],
    ["phone", PHONE],
  ]) {
    job(`mission-${m.id}-${label}-start`, async (name) => {
      const page = await open(name, { viewport, unlock: true, noCoach: true });
      await startMission(page, m.title);
      await closeCards(page);
      await m.start.act(page);
      await blur(page);
      await page.waitForTimeout(2600);
      await shootBoth(page, `mission-${m.id}-${label}-1-start`, "mission", `"${m.title}", first decision: ${m.start.what}; map view, ${label} ${dims(viewport)}`);
      await page.context().close();
    });
    job(`mission-${m.id}-${label}-shock`, async (name) => {
      const page = await open(name, { viewport, unlock: true, noCoach: true });
      await startMission(page, m.title);
      let state = await closeCards(page);
      for (let clock = 0; clock < m.shock.quarters && state !== "debrief"; clock++) {
        await m.shock.plan(page, clock);
        await blur(page);
        state = await endQuarter(page);
      }
      if (state === "debrief") errors.push(`${name}: a debrief card (mission over) opened before the shock`);
      else await m.shock.plan(page, m.shock.quarters);
      await blur(page);
      await page.waitForTimeout(2600);
      await shootBoth(page, `mission-${m.id}-${label}-2-shock`, "mission", `"${m.title}", ${m.shock.what}; map view, ${label} ${dims(viewport)}`);
      await page.context().close();
    });
  }
}

// The island as backdrop.
job("backdrop-title", async (name) => {
  const page = await open(name);
  await page.goto(base);
  await page.waitForTimeout(6000);
  await shoot(page, "backdrop-1-title-desktop.png", "backdrop", "Title screen with the island behind it, 6 s after load, desktop 1440x900");
  await page.addStyleTag({ content: ".game-backdrop > :not(.game-backdrop-scene) { visibility: hidden !important; }" });
  await page.waitForTimeout(500);
  await shoot(page, "backdrop-2-title-desktop-bare.png", "backdrop", "The same backdrop with the title card hidden by the script (CSS), to see the island alone");
  await page.context().close();
});
job("backdrop-sandbox", async (name) => {
  const page = await open(name);
  await page.goto(`${base}?mode=sandbox`);
  await page.waitForTimeout(6000);
  await shoot(page, "backdrop-3-sandbox-desktop.png", "backdrop", "Free play (the sandbox, ?mode=sandbox) as a new visitor sees it, 6 s after load, desktop 1440x900");
  await page.context().close();
});

// ---- Motion: the map and the control, in real time (solo) ----

const MAPG = "motion-map";
job(
  "motion-map-intro",
  async (name) => {
    const page = await open(name);
    await startMission(page);
    const clip = await boxOf(page, ".game-scene");
    const shots = await cast(page, { frames: 12, every: 250, act: () => closeCards(page) });
    await sheet("motion-map-1-intro.png", MAPG, "Mission 1's map entering as the first news card closes (closed at 0 ms), desktop", shots, { clip, cols: 3 });
    await page.context().close();
  },
  true,
);
job(
  "motion-map-idle-lever",
  async (name) => {
    const page = await open(name);
    await startMission(page);
    await closeCards(page);
    await islandWarm(page);
    await page.waitForTimeout(6000); // the island pointer has come and gone
    const clip = await boxOf(page, ".game-scene");
    const idle = await cast(page, { frames: 8, every: 500 });
    await sheet("motion-map-2-idle.png", MAPG, "Mission 1's map at rest, nothing touched, 4 s, desktop (a caption's \"last paint\" means nothing was repainted since)", idle, { clip, cols: 4 });
    const slider = page.getByRole("slider", { name: "Policy rate", exact: true }).first();
    await slider.focus();
    await top(page);
    await page.waitForTimeout(800);
    const strip = await boxOf(page, ".st-strip");
    const lever = await cast(page, {
      frames: 18,
      every: 150,
      act: async () => {
        for (let i = 0; i < 8; i++) await slider.press("ArrowRight");
      },
    });
    await sheet("motion-map-3-lever.png", MAPG, "Rate raised 8.5% to 10.5% with eight arrow presses at 0 ms: the arrows' pulse and the \"When does it land?\" strip regrowing, desktop", lever, { clip, cols: 3 });
    await sheet("motion-map-4-lever-strip.png", MAPG, "The same lever move, close on the \"When does it land?\" strip", lever, { clip: strip, cols: 3 });
    await page.context().close();
  },
  true,
);
job(
  "motion-toggle",
  async (name) => {
    const page = await open(name, { noCoach: true });
    await startMission(page);
    await closeCards(page);
    await nudge(page, "Policy rate", 8);
    await blur(page);
    await islandWarm(page);
    const clip = await boxOf(page, ".game-scene");
    const slow = await slowCss(page, 0.1);
    const inShots = await cast(page, { frames: 12, every: 200, act: () => page.keyboard.press("i") });
    await sheet("motion-map-5-map-to-island.png", MAPG, "Map to island, I pressed at 0 ms, CSS slowed 10x (the 200 ms cross-fade runs 2 s), desktop", inShots, { clip, cols: 3 });
    await page.waitForTimeout(2500);
    const outShots = await cast(page, { frames: 12, every: 200, act: () => page.keyboard.press("i") });
    await sheet("motion-map-6-island-to-map.png", MAPG, "Island back to map, I pressed at 0 ms, CSS slowed 10x, desktop", outShots, { clip, cols: 3 });
    await slow.detach().catch(() => {});
    await page.context().close();
  },
  true,
);
job(
  "motion-reduced",
  async (name) => {
    const page = await open(name, { reduced: true, noCoach: true });
    await startMission(page);
    await closeCards(page);
    await islandWarm(page);
    const clip = await boxOf(page, ".game-scene");
    const inShots = await cast(page, { frames: 12, every: 150, act: () => page.keyboard.press("i") });
    await sheet("motion-map-7-reduced-map-to-island.png", MAPG, "Reduced motion (prefers-reduced-motion: reduce), map to island, I pressed at 0 ms, CSS at normal speed: the switch should be instant", inShots, { clip, cols: 4 });
    await page.waitForTimeout(2500);
    const outShots = await cast(page, { frames: 12, every: 150, act: () => page.keyboard.press("i") });
    await sheet("motion-map-8-reduced-island-to-map.png", MAPG, "Reduced motion, island back to map, I pressed at 0 ms", outShots, { clip, cols: 4 });
    await page.waitForTimeout(1500);
    const slider = page.getByRole("slider", { name: "Policy rate", exact: true }).first();
    await slider.focus();
    await top(page);
    await page.waitForTimeout(800);
    const lever = await cast(page, {
      frames: 8,
      every: 200,
      act: async () => {
        for (let i = 0; i < 8; i++) await slider.press("ArrowRight");
      },
    });
    await sheet("motion-map-9-reduced-lever.png", MAPG, "Reduced motion, rate raised 2 pp at 0 ms: no pulse or regrowing strip expected, the map should jump to its new state", lever, { clip, cols: 4 });
    await page.context().close();
  },
  true,
);
job(
  "motion-phone-toggle",
  async (name) => {
    const page = await open(name, { viewport: PHONE, noCoach: true });
    await startMission(page);
    await closeCards(page);
    await nudge(page, "Policy rate", 8);
    await blur(page);
    await top(page);
    await islandWarm(page);
    const clip = await boxOf(page, ".game-scene");
    const slow = await slowCss(page, 0.1);
    // A tap at the button's place: Playwright's click() waits for the button to stop moving,
    // which with slowed CSS and a busy WebGL page can be seconds after the frames began.
    const tap = async (label) => {
      const b = await page.getByRole("button", { name: label, exact: true }).first().boundingBox();
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    };
    const inShots = await cast(page, { frames: 12, every: 200, act: () => tap("Island") });
    await sheet("motion-map-10-phone-tap-island.png", MAPG, "Phone 390x844: Island tapped at 0 ms, CSS slowed 10x", inShots, { clip, cols: 6 });
    await page.waitForTimeout(2500);
    const outShots = await cast(page, { frames: 12, every: 200, act: () => tap("Map") });
    await sheet("motion-map-11-phone-tap-map.png", MAPG, "Phone 390x844: Map tapped at 0 ms, CSS slowed 10x", outShots, { clip, cols: 6 });
    await slow.detach().catch(() => {});
    await page.context().close();
  },
  true,
);

// ---- Motion: the island on the virtual clock ----

const ISLG = "motion-island";
/** Free play with every landmark; `focus` clicks an indicator tile so the camera flies to its landmark. */
async function sandbox(name, { focus, reduced = false } = {}) {
  const page = await open(name, { vclock: true, noHint: true, reduced });
  await page.goto(`${base}?mode=sandbox`);
  await page.waitForTimeout(5000);
  if (focus) {
    await page.getByRole("button", { name: new RegExp(`^${focus} `) }).first().click();
    await page.waitForTimeout(300);
  }
  return page;
}
/** The middle of the canvas, where a focused landmark sits once the camera has flown in. */
async function centre(page, selector, w, h) {
  const b = await boxOf(page, selector);
  return { x: Math.round(b.x + (b.width - w) / 2), y: Math.round(b.y + (b.height - h) / 2), width: w, height: h };
}

for (const [id, focus, what, frames, step] of [
  ["1-lighthouse", "Credibility", "Lighthouse (credibility): beams sweeping round the lamp", 12, 500],
  ["2-port-ships", "Current account", "Port (current account): the moored freighter riding the swell, ships at anchor swaying", 12, 700],
  ["3-factory-smoke", "Real GDP growth", "Factories (growth): smoke puffs rising from the chimneys", 12, 600],
  ["4-campus-flags", "Inflation", "Campus (inflation): flags stirring on their poles, and the sea", 8, 300],
]) {
  job(`motion-island-${id}`, async (name) => {
    const page = await sandbox(name, { focus });
    // The port reaches out to its ships at anchor: film the whole canvas; the rest, its middle.
    const clip = id === "2-port-ships" ? await boxOf(page, ".lab-scene canvas") : await centre(page, ".lab-scene canvas", 600, 420);
    const shots = await stepped(page, { clip, frames, step, settle: 3000, slice: 100 });
    await sheet(`motion-island-${id}.png`, ISLG, `${what}; free play, camera flown in by clicking the ${focus} tile, ${step} ms of animation time apart`, shots, { clip, cols: 4 });
    await page.context().close();
  });
}
job("motion-island-5-tanker", async (name) => {
  // No tile flies to the tanker: click the ship itself, just below its "Oil" tag, so the camera
  // flies in to it; if no click lands, film it from the overview around its tag.
  const page = await sandbox(name);
  const anchor = await page.evaluate(() => {
    const pin = [...document.querySelectorAll(".isl-pin")].find((p) => p.querySelector(".isl-tag-name")?.textContent?.trim() === "Oil");
    const stem = pin?.querySelector(".isl-stem");
    const b = (stem ?? pin)?.getBoundingClientRect();
    return b ? { x: b.x + b.width / 2, y: b.y + b.height } : null;
  });
  if (!anchor) throw new Error("no Oil tag on the island");
  let focused = false;
  for (const [dx, dy] of [[0, 50], [0, 40], [0, 60], [-12, 50], [12, 50], [0, 30]]) {
    await page.mouse.click(anchor.x + dx, anchor.y + dy);
    await page.waitForTimeout(400);
    focused = await page.locator(".lab-chip-info", { hasText: "Focus" }).count().then((n) => n > 0);
    if (focused) break;
  }
  const clip = focused ? await centre(page, ".lab-scene canvas", 600, 420) : { x: Math.round(anchor.x - 180), y: Math.round(anchor.y - 40), width: 360, height: 200 };
  const shots = await stepped(page, { clip, frames: 8, step: 800, settle: focused ? 3000 : 1000, slice: 100 });
  const how = focused ? "camera flown in by clicking the ship" : "from the free-play overview, a crop round its tag (no click on the ship focused it)";
  await sheet("motion-island-5-tanker.png", ISLG, `Oil tanker riding the swell, ${how}, 800 ms of animation time apart`, shots, { clip, cols: 4 });
  await page.context().close();
});
job("motion-island-6-camera-fly-in", async (name) => {
  const page = await sandbox(name);
  const clip = await boxOf(page, ".lab-scene");
  const shots = await stepped(page, { clip, frames: 10, step: 200, settle: 500, act: () => page.getByRole("button", { name: /^Credibility / }).first().click() });
  await sheet("motion-island-6-camera-fly-in.png", ISLG, "Camera flying in to the lighthouse after a click on the Credibility tile (clicked after frame 1), free play, 200 ms apart", shots, { clip, cols: 5 });
  await page.context().close();
});
job("motion-island-7-camera-title-turn", async (name) => {
  const page = await open(name, { vclock: true });
  await page.goto(base);
  await page.waitForTimeout(4000);
  const clip = await boxOf(page, "body");
  const shots = await stepped(page, { clip, frames: 6, step: 5000, settle: 12000, slice: 100 });
  await sheet("motion-island-7-camera-title-turn.png", ISLG, "Title screen backdrop, nothing touched: the slow idle camera turn (one turn in about 5.5 min), 5 s of animation time apart, the first 12 s after the clock froze", shots, { clip, cols: 3 });
  await page.context().close();
});
job("motion-island-8-overview-clouds", async (name) => {
  const page = await sandbox(name);
  const clip = await boxOf(page, ".lab-scene");
  const shots = await stepped(page, { clip, frames: 8, step: 3000, settle: 1000, slice: 100 });
  await sheet("motion-island-8-overview-clouds.png", ISLG, "Free-play overview, nothing touched: the slow idle camera turn with the tags re-placed as it turns, clouds offshore, the sea; 3 s of animation time apart", shots, { clip, cols: 4 });
  await page.context().close();
});

/** Mission 1's play screen in the island view (rate raised 2 pp), on the virtual clock. */
async function playIsland(name, { raise = true } = {}) {
  const page = await open(name, { vclock: true, noCoach: true });
  await startMission(page);
  await closeCards(page);
  if (raise) await nudge(page, "Policy rate", 8);
  await toIsland(page);
  return page;
}
job("motion-island-9-play-weather", async (name) => {
  const page = await playIsland(name);
  const clip = await boxOf(page, ".game-scene");
  const rain = await stepped(page, { clip, frames: 8, step: 150, settle: 500 });
  await sheet("motion-island-9-play-weather-rain.png", ISLG, "Mission 1's island view with the food-price shock in force: storm light and rain, 150 ms of animation time apart", rain, { clip, cols: 4 });
  const long = await stepped(page, { clip, frames: 6, step: 4000, slice: 100 });
  await sheet("motion-island-10-play-idle-long.png", ISLG, "The same island left alone for 20 s of animation time, 4 s apart: clouds and sea move, the play screen's camera should not turn", long, { clip, cols: 3 });
  await page.context().close();
});
job("motion-island-11-play-lever", async (name) => {
  const page = await playIsland(name, { raise: false });
  const clip = await boxOf(page, ".game-scene");
  const slider = page.getByRole("slider", { name: "Policy rate", exact: true }).first();
  const shots = await stepped(page, {
    clip,
    frames: 8,
    step: 300,
    settle: 500,
    act: async () => {
      await slider.focus();
      for (let i = 0; i < 8; i++) await slider.press("ArrowRight");
      await top(page);
    },
  });
  await sheet("motion-island-11-play-lever.png", ISLG, "Mission 1's island view while the rate goes 8.5% to 10.5% (after frame 1): landmarks and tags easing to the new forecast, 300 ms apart", shots, { clip, cols: 4 });
  await page.context().close();
});
/** Hide the open card (script CSS only), so the island behind it can be filmed. */
const hideCards = (page) => page.addStyleTag({ content: ".game-modal-backdrop { visibility: hidden !important; }" });

job("motion-island-12-news-ring", async (name) => {
  // ?scene=island opens the play screen on the island, so the first news card sits over it.
  const page = await open(name, { vclock: true });
  await page.goto(`${base}?scene=island`);
  await page.waitForTimeout(1200);
  await page.locator(".game-cta").first().click();
  await page.waitForTimeout(400);
  await page.locator(".game-cta").first().click();
  await page.waitForTimeout(4000);
  await hideCards(page);
  const clip = await boxOf(page, ".game-scene");
  const shots = await stepped(page, { clip, frames: 8, step: 400, settle: 500, slice: 100 });
  await sheet("motion-island-12-news-ring.png", ISLG, "Mission 1's first news card open over the island view (?scene=island), the card hidden by the script to show the island behind it: the ring spreading from the landmark the news hits, 400 ms apart", shots, { clip, cols: 4 });
  await page.context().close();
});
job("motion-island-13-news-rise", async (name) => {
  // "When the price falls": the commodity bust's news names the port, which is not one of the
  // mission's goals; the film shows what the port does as the card opens.
  const page = await open(name, { vclock: true, unlock: true, noCoach: true });
  await startMission(page, "When the price falls");
  await closeCards(page);
  await toIsland(page);
  await endQuarter(page);
  await page.getByRole("button", { name: /^End / }).click();
  await page.waitForTimeout(1200);
  await hideCards(page);
  const clip = await boxOf(page, ".game-scene");
  // The hidden card's button is out of the accessibility tree: find it by its text.
  const plan = page.locator(".game-modal-backdrop button").filter({ hasText: /^Plan / }).first();
  const shots = await stepped(page, { clip, frames: 10, step: 150, act: () => plan.evaluate((el) => el.click()) });
  await sheet("motion-island-13-news-rise.png", ISLG, `"When the price falls", island view, cards hidden by the script: the recap's "Plan" clicked after frame 1 and the commodity bust's news opens: what the port it hits does (a ring, rising if it was down), 150 ms apart`, shots, { clip, cols: 5 });
  await page.context().close();
});
job("motion-island-14-reduced", async (name) => {
  const page = await sandbox(name, { reduced: true });
  const clip = await boxOf(page, ".lab-scene");
  const shots = await stepped(page, { clip, frames: 4, step: 4000, settle: 12000, slice: 250 });
  await sheet("motion-island-14-reduced.png", ISLG, "Reduced motion, free-play overview, 4 s of animation time apart from 12 s: nothing should move (no beams sweeping, smoke, clouds or camera turn)", shots, { clip, cols: 4 });
  await page.context().close();
});

// The tags: when the tag layer moves a tag to another spot round its building it glides there
// (a 200 ms CSS transition on its offset), and a tag with no room fades out. The idle turn in
// free play moves tags every few seconds: film it in real time with CSS slowed 10x, log every
// spot change from the page (the layer keeps each tag's spot on its element), and lay out the
// frames round the first change, cropped to that tag.
job(
  "motion-island-15-tag-glide",
  async (name) => {
    const page = await open(name, { noHint: true });
    await page.goto(`${base}?mode=sandbox`);
    // The idle turn starts once the canvas has been left alone for 10 s and eases in over 2 s.
    await page.waitForTimeout(12000);
    await page.evaluate(() => {
      const moves = [];
      window.__tagMoves = moves;
      const layer = document.querySelector(".lab-label-layer");
      if (!layer) throw new Error("no tag layer");
      const read = (el) => ({ spot: el.__islSpot ?? -1, x: parseFloat(el.style.getPropertyValue("--x")) || 0, y: parseFloat(el.style.getPropertyValue("--y")) || 0, off: el.hasAttribute("data-off") });
      const state = new Map();
      for (const el of layer.querySelectorAll(".isl-pin")) state.set(el, read(el));
      new MutationObserver((list) => {
        const t = Date.now();
        for (const m of list) {
          const el = m.target;
          if (!(el instanceof HTMLElement) || !el.classList.contains("isl-pin")) continue;
          const prev = state.get(el);
          const now = read(el);
          state.set(el, now);
          if (!prev || (prev.spot === now.spot && prev.off === now.off)) continue;
          const tag = el.children[1];
          const a = el.getBoundingClientRect();
          moves.push({ t, name: el.querySelector(".isl-tag-name")?.textContent?.trim() ?? "?", from: prev, to: now, ax: a.left, ay: a.top, w: tag?.offsetWidth ?? 0, h: tag?.offsetHeight ?? 0 });
        }
      }).observe(layer, { attributes: true, attributeFilter: ["style", "data-off"], subtree: true });
    });
    const canvas = await boxOf(page, ".lab-scene");
    const slow = await slowCss(page, 0.1);
    const ms = 24000;
    const { got, t0 } = await screencast(page, { ms });
    await slow.detach().catch(() => {});
    const moves = await page.evaluate(() => window.__tagMoves);
    const glides = moves.filter((m) => !m.from.off && !m.to.off && m.from.spot >= 0);
    const fades = moves.length - glides.length;
    const tally = `${glides.length} spot change${glides.length === 1 ? "" : "s"} and ${fades} tag${fades === 1 ? "" : "s"} hidden or shown in ${ms / 1000} s of the idle turn, logged from the page`;
    const first = glides.find((m) => m.t >= t0 + 600 && m.t <= t0 + ms - 2800);
    if (!first) {
      const shots = pick(got, Array.from({ length: 8 }, (_, i) => t0 + i * 3000), 3000, t0);
      await sheet("motion-island-15-tag-glide.png", ISLG, `Free-play overview on its idle turn, CSS slowed 10x, 3 s apart: no tag changed spot in a part of the film that could be shown (${tally})`, shots, { clip: canvas, cols: 4 });
    } else {
      // The tag before and after, round the building's anchor, padded and kept on the canvas.
      const xs = [first.ax, first.ax + first.from.x, first.ax + first.from.x + first.w, first.ax + first.to.x, first.ax + first.to.x + first.w];
      const ys = [first.ay, first.ay + first.from.y, first.ay + first.from.y + first.h, first.ay + first.to.y, first.ay + first.to.y + first.h];
      const pad = 80;
      const w = Math.min(canvas.width, Math.max(400, Math.max(...xs) - Math.min(...xs) + 2 * pad));
      const h = Math.min(canvas.height, Math.max(240, Math.max(...ys) - Math.min(...ys) + 2 * pad));
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const clip = {
        x: Math.round(Math.min(Math.max(canvas.x, cx - w / 2), canvas.x + canvas.width - w)),
        y: Math.round(Math.min(Math.max(canvas.y, cy - h / 2), canvas.y + canvas.height - h)),
        width: Math.round(w),
        height: Math.round(h),
      };
      const shots = pick(got, Array.from({ length: 12 }, (_, i) => first.t - 500 + i * 250), 250, first.t);
      const move = `"${first.name}" from (${first.from.x}, ${first.from.y}) to (${first.to.x}, ${first.to.y}) px off its building`;
      await sheet("motion-island-15-tag-glide.png", ISLG, `A tag gliding to a new spot: free-play overview on its idle turn, real time with CSS slowed 10x (the 200 ms glide runs 2 s; the camera turns at its usual pace), cropped to the tag; 0 ms is when the tag layer moved ${move}, 250 ms apart (${tally})`, shots, { clip, cols: 4 });
      // The same moment on the whole canvas, to see where the tag sits.
      const wide = pick(got, [first.t - 500, first.t + 1000, first.t + 2500], 250, first.t);
      await sheet("motion-island-15-tag-glide-wide.png", ISLG, `The same spot change on the whole canvas: before, mid-glide and after (CSS slowed 10x)`, wide, { clip: canvas, cols: 3 });
    }
    await page.context().close();
  },
  true,
);

// A mission's island shows only what the mission is about: on the briefing the landmarks
// mission 1 does not need sink into their hexes and their roads narrow away (0.7 s).
job("motion-island-16-briefing-sink", async (name) => {
  const page = await open(name, { vclock: true });
  await page.goto(base);
  await page.waitForTimeout(5000);
  // The title and briefing cards hidden (script CSS only), so the island behind them shows.
  await page.addStyleTag({ content: ".game-backdrop > :not(.game-backdrop-scene) { visibility: hidden !important; }" });
  const clip = await boxOf(page, ".game-backdrop-scene");
  // The hidden button is out of the accessibility tree: click it from the page.
  const cta = page.locator(".game-cta").first();
  const shots = await stepped(page, { clip, frames: 16, step: 100, settle: 300, act: () => cta.evaluate((el) => el.click()) });
  const screen = await page.evaluate(() => (document.querySelector(".game-briefing") ? "the briefing is up" : "no briefing found"));
  await sheet("motion-island-16-briefing-sink.png", ISLG, `Title screen to mission 1's briefing (Play clicked after frame 1; title and briefing cards hidden by the script): the landmarks mission 1 does not use sink into their hexes and their roads narrow away, 100 ms of animation time apart`, shots, { clip, cols: 4, note: screen });
  await page.context().close();
});

// While the recap is open the island's sky clears to a light haze (the storm eases down over a
// second or two), and the storm comes back once the next quarter is planned, if a shock is still
// in force. Mission 1's island view, the recap card hidden by the script so the sky shows.
job("motion-island-17-recap-sky", async (name) => {
  const page = await playIsland(name);
  await page.waitForTimeout(1500);
  await hideCards(page);
  const clip = await boxOf(page, ".game-scene");
  const end = page.getByRole("button", { name: /^End / }).first();
  const clears = await stepped(page, { clip, frames: 10, step: 300, settle: 500, slice: 50, act: () => end.click() });
  const open = await probe(page);
  await sheet("motion-island-17-recap-sky-clears.png", ISLG, "Mission 1's island view in the food-price storm, rate 10.5%: End clicked after frame 1 and the recap opens (card hidden by the script): the sky clears to a light haze and the rain fades, 300 ms of animation time apart", clears, { clip, cols: 5, note: describe(open) });
  const plan = page.locator(".game-modal-backdrop button").filter({ hasText: /^Plan / }).first();
  const back = await stepped(page, { clip, frames: 10, step: 300, slice: 50, act: () => plan.evaluate((el) => el.click()) });
  const after = await probe(page);
  await sheet("motion-island-18-plan-storm-returns.png", ISLG, "The same, the recap's Plan clicked after frame 1: the recap closes and the storm comes back while the shock is still in force (any news card that follows hidden too), 300 ms of animation time apart", back, { clip, cols: 5, note: describe(after) });
  await page.context().close();
});

// ---- Run ---------------------------------------------------------------------------------

const todo = jobs.filter((j) => !only || only.test(j.name));
const runOne = async (j) => {
  const t0 = Date.now();
  console.log(`${j.name}…`);
  try {
    await j.run(j.name);
    console.log(`${j.name} done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  } catch (e) {
    failed.push(`${j.name}: ${e.message.split("\n")[0]}`);
    console.error(`${j.name} FAILED: ${e.message.split("\n")[0]}`);
  }
  writeIndex();
};
const queue = todo.filter((j) => !j.solo);
await Promise.all(
  Array.from({ length: Math.min(parallel, queue.length) }, async () => {
    while (queue.length) await runOne(queue.shift());
  }),
);
for (const j of todo.filter((x) => x.solo)) await runOne(j);

writeIndex();
await browser.close();
server.close();
console.log(`\n${manifest.size} files listed in ${join(outDir, "index.md")}`);
if (errors.length) console.error(`\nPage errors (${errors.length}):\n` + [...new Set(errors)].join("\n"));
if (failed.length) {
  console.error(`\nJobs that failed:\n${failed.join("\n")}`);
  process.exitCode = 1;
}
