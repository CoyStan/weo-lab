// Motion check: still screenshots hide broken animations (a beam spinning
// off its pivot looks fine in one frame). This captures a region of the play
// screen over time and lays the frames out as one contact sheet, so you can
// read the motion from a single image.
//
//   npm run build && node scripts/motion-shots.mjs <out-dir> [x,y,w,h] [frames] [intervalMs] [theme-id]
//
// Defaults: the whole scene slot (.game-scene) at 1440x900, 8 frames 250 ms apart.
// Writes <out-dir>/motion-sheet.png (frames left to right, top to bottom,
// time stamped) and the single frames motion-01.png, motion-02.png, ...

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const outDir = resolve(process.argv[2] ?? "motion-shots");
const region = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
const frames = Number(process.argv[4] ?? 8);
const interval = Number(process.argv[5] ?? 250);
const themeId = process.argv[6] ?? "";
const root = resolve("out");
if (!existsSync(root)) {
  console.error("No out/ folder: run `npm run build` first.");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".txt": "text/plain", ".woff2": "font/woff2" };
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
// SCENE=<id> in the environment shoots a scene concept (?scene=<id>, see app/scenes/registry.tsx).
const query = new URLSearchParams({ ui: "classic", ...(themeId ? { theme: themeId } : {}), ...(process.env.SCENE ? { scene: process.env.SCENE } : {}) }).toString();
const url = `http://localhost:${server.address().port}/${query ? `?${query}` : ""}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(url);
await page.waitForTimeout(1000);
await page.locator(".game-cta").first().click();
await page.locator(".game-cta").first().click();
await page.waitForTimeout(800);
for (let i = 0; i < 3; i++) {
  const btn = page.locator(".game-modal-backdrop .game-choice.is-plain, .game-modal-backdrop .lab-btn-primary").first();
  if (!(await btn.count())) break;
  await btn.click();
  await page.waitForTimeout(350);
}
await page.waitForTimeout(2500); // let the camera settle

let clip;
if (region) clip = { x: region[0], y: region[1], width: region[2], height: region[3] };
else {
  const box = await page.locator(".game-scene").first().boundingBox();
  clip = { x: box.x, y: box.y, width: box.width, height: box.height };
}

const shots = [];
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  const buf = await page.screenshot({ clip });
  const name = `motion-${String(i + 1).padStart(2, "0")}.png`;
  writeFileSync(join(outDir, name), buf);
  shots.push({ data: buf.toString("base64"), at: Date.now() - t0 });
  await page.waitForTimeout(interval);
}

// Contact sheet: up to four frames a row, each labelled with its time.
const cols = Math.min(4, frames);
const scale = Math.min(1, 1400 / (cols * clip.width));
const w = Math.round(clip.width * scale);
const h = Math.round(clip.height * scale);
await page.close(); // free the WebGL page before drawing the sheet
const sheet = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: cols * (w + 8) + 8, height: Math.ceil(frames / cols) * (h + 30) + 8 } });
await sheet.setContent(
  `<body style="margin:0;padding:4px;background:#222;font:12px sans-serif;color:#eee;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px 8px">` +
    shots.map((s, i) => `<figure style="margin:0"><img src="data:image/png;base64,${s.data}" width="${w}" height="${h}" style="display:block"><figcaption>#${i + 1} · ${(s.at / 1000).toFixed(2)} s</figcaption></figure>`).join("") +
    "</body>",
);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: join(outDir, "motion-sheet.png") });
console.log(`${join(outDir, "motion-sheet.png")} (${frames} frames, clip ${clip.x},${clip.y} ${clip.width}x${clip.height})`);

await browser.close();
server.close();
