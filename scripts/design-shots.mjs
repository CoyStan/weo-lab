// Screenshots of the key screens, for design review.
//
//   npm run build && node scripts/design-shots.mjs <out-dir>
//
// Serves the static build from out/ on a free port, drives the game with
// Playwright through the screens a player sees most, and writes PNGs (desktop
// 1440x900 and phone 390x844) to <out-dir>. Used by the design council skill
// in .claude/skills/design-council.

import { createServer } from "node:http";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const outDir = resolve(process.argv[2] ?? "design-shots");
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
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const errors = [];

async function dismiss(page) {
  for (let i = 0; i < 3; i++) {
    const btn = page.locator(".game-modal-backdrop .game-choice.is-plain, .game-modal-backdrop .lab-btn-primary").first();
    if (!(await btn.count())) break;
    await btn.click();
    await page.waitForTimeout(350);
  }
}

async function shoot(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, `${name}.png`) });
  console.log(`  ${name}.png`);
}

for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(1500);
  await shoot(page, `${label}-1-title`);

  await page.getByRole("button", { name: /mission/i }).first().click();
  await shoot(page, `${label}-2-missions`);

  await page.goto(url);
  await page.waitForTimeout(1000);
  await page.locator(".game-cta").first().click();
  await shoot(page, `${label}-3-briefing`);

  await page.locator(".game-cta").first().click();
  await page.waitForTimeout(800);
  await shoot(page, `${label}-4-shock-card`);
  await dismiss(page);

  // Raise the rate two points, then look at the play screen.
  const slider = page.locator("input[type=range]").first();
  await slider.focus();
  for (let i = 0; i < 8; i++) await slider.press("ArrowRight");
  await page.locator("body").click({ position: { x: 2, y: 2 } }).catch(() => {});
  await shoot(page, `${label}-5-play`);

  await page.getByRole("button", { name: /^End / }).click();
  await page.waitForTimeout(700);
  await shoot(page, `${label}-6-recap`);
  await page.getByRole("button", { name: "See every sector" }).click();
  await page.waitForTimeout(600);
  await shoot(page, `${label}-7-framework-top`);
  await page.getByRole("tab", { name: /Shocks vs policy/ }).click();
  await shoot(page, `${label}-8-decomposition`);
  await page.getByRole("tab", { name: /Channels/ }).click();
  await shoot(page, `${label}-9-channels`);
  await page.getByRole("tab", { name: /Sector accounts/ }).click();
  await shoot(page, `${label}-10-sectors`);
  await page.close();
}

await browser.close();
server.close();
if (errors.length) {
  console.error("Page errors:\n" + errors.join("\n"));
  process.exitCode = 1;
}
