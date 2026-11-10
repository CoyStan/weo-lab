// Screenshots of the "next" play screen (?ui=next), beat by beat.
//
//   npm run build && node scripts/next-shots.mjs <out-dir> [mission-number]
//
// Plays the first quarters of a mission at 1440x900 and 390x844 and saves a
// PNG of each beat: the news and its "call it" question, the decision with
// the levers moved, the lag question, the quarter playing out, the next turn.

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const outDir = resolve(process.argv[2] ?? "next-shots");
const missionNo = Number(process.argv[3] ?? 1);
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
const url = `http://localhost:${server.address().port}/?ui=next`;

const browser = await chromium.launch();
const errors = [];

for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
  ...(process.env.TV ? [["tv", { width: 2560, height: 1440 }]] : []),
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${label} console: ${m.text()}`);
  });
  let n = 0;
  const shoot = async (name, full = false) => {
    await page.waitForTimeout(450);
    n++;
    const file = `${label}-m${missionNo}-${String(n).padStart(2, "0")}-${name}.png`;
    await page.screenshot({ path: join(outDir, file), fullPage: full });
    console.log(`  ${file}`);
  };
  const has = async (sel) => (await page.locator(sel).count()) > 0;

  await page.goto(url);
  await page.waitForTimeout(1200);
  if (missionNo === 1) {
    await page.locator(".game-cta").first().click();
  } else {
    // Unlock every mission, then pick one from the list.
    await page.evaluate(() => window.localStorage.setItem("weo-lab.campaign.v1", JSON.stringify({ stars: { "first-quarter": 1, "cost-shock": 1, "debt-mountain": 1, "commodity-bust": 1, "defend-peg": 1, "sudden-stop": 1 } })));
    await page.goto(url);
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /mission/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator(".game-mission-grid .game-mission").nth(missionNo - 1).click();
  }
  await page.waitForTimeout(600);
  await page.locator(".game-cta").first().click();
  await page.waitForSelector(".nx", { timeout: 15000 });
  await page.waitForTimeout(600);

  // Play three quarters, shooting every beat on the way.
  for (let q = 1; q <= 3; q++) {
    if (await has(".nx-news")) {
      if (await has(".nx-news .nx-call-option")) {
        await shoot(`q${q}-news-call`);
        await page.locator(".nx-news .nx-call-option").first().click();
        await shoot(`q${q}-news-called`);
        await page.locator(".nx-news [data-primary]").click();
      }
      await shoot(`q${q}-news-brief`, label === "phone");
      await page.locator(".nx-news [data-primary]").click();
    }
    await page.waitForSelector(".nx-decide");
    await shoot(`q${q}-decide`, label === "phone");
    if (q === 2) {
      await page.keyboard.press("w");
      await page.waitForTimeout(1800);
      await shoot(`q${q}-why-map`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    if (q === 1) {
      const slider = page.locator(".nx-levers input[type=range]").first();
      if (await slider.count()) {
        await slider.focus();
        for (let i = 0; i < 8; i++) await slider.press("ArrowRight");
        await page.locator("body").click({ position: { x: 2, y: 2 } }).catch(() => {});
        await shoot(`q${q}-decide-moved`, label === "phone");
      }
    } else if (q === 2 && (await has(".nx-plan"))) {
      await page.locator(".nx-plan").first().click();
      await shoot(`q${q}-decide-plan`, label === "phone");
    }
    await page.locator(".nx-end-btn").click();
    if (await has(".nx-overlay .nx-call")) {
      await shoot(`q${q}-lag-call`);
      await page.locator(".nx-overlay .nx-call-option").nth(2).click();
      await shoot(`q${q}-lag-called`);
      await page.locator(".nx-overlay [data-primary]").click();
    }
    if (await has(".nx-debrief")) break;
    await page.waitForSelector(".nx-result");
    await page.waitForTimeout(400);
    await shoot(`q${q}-result-playing`);
    await page.waitForTimeout(1600);
    await shoot(`q${q}-result`, label === "phone");
    if (q === 1) {
      await page.keyboard.press("w");
      await page.waitForTimeout(1500);
      await shoot(`q${q}-why`);
      await page.keyboard.press("Escape");
    }
    await page.locator(".nx-result [data-primary]").click();
  }

  // Run to the end for the debrief.
  for (let i = 0; i < 40 && !(await has(".nx-debrief")); i++) {
    if (await has(".nx-news")) {
      if (await has(".nx-news .nx-skip")) await page.locator(".nx-news .nx-skip").click();
      await page.locator(".nx-news [data-primary]").click();
    } else if (await has(".nx-overlay .nx-skip")) await page.locator(".nx-overlay .nx-skip").click();
    else if (await has(".nx-result")) await page.locator(".nx-result [data-primary]").click();
    else if (await has(".nx-end-btn:not(:disabled)")) await page.locator(".nx-end-btn").click();
    await page.waitForTimeout(250);
  }
  if (await has(".nx-debrief")) await shoot("debrief", label === "phone");
  await page.close();
}

await browser.close();
server.close();
if (errors.length) {
  console.error("Page errors:\n" + [...new Set(errors)].join("\n"));
  process.exitCode = 1;
}
