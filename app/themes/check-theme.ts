// Validate one theme file: node app/themes/check-theme.ts <id>
// Checks the shape, scoping of extra CSS, hex formats and WCAG text contrast.
import { DEFAULT_SCENE } from "../scene/palette.ts";

const id = process.argv[2];
if (!id) {
  console.error("usage: node app/themes/check-theme.ts <id>");
  process.exit(2);
}
const mod = await import(`./${id}.ts`);
const theme = mod.default;
const problems: string[] = [];
const warn: string[] = [];

if (!theme || typeof theme !== "object") problems.push("default export missing");
if (theme.id !== id) problems.push(`id must be "${id}" (got "${theme.id}")`);
for (const k of ["name", "description", "scheme"]) if (typeof theme[k] !== "string" || !theme[k]) problems.push(`missing ${k}`);
if (!["light", "dark"].includes(theme.scheme)) problems.push("scheme must be light or dark");
if (!theme.vars || typeof theme.vars !== "object") problems.push("vars missing");
if (!theme.scene || typeof theme.scene !== "object") problems.push("scene missing");

for (const key of Object.keys(theme.vars ?? {})) if (!key.startsWith("--lab-")) problems.push(`unknown var ${key}`);
for (const key of Object.keys(theme.scene ?? {})) if (!(key in DEFAULT_SCENE)) problems.push(`unknown scene key ${key}`);
const hex = /^#[0-9a-fA-F]{6}$/;
for (const [k, v] of Object.entries(theme.scene ?? {})) {
  const d = (DEFAULT_SCENE as Record<string, unknown>)[k];
  if (typeof d === "string" && !(typeof v === "string" && hex.test(v))) problems.push(`scene.${k} must be #rrggbb (got ${JSON.stringify(v)})`);
  if (typeof d === "number" && !(typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 6)) problems.push(`scene.${k} must be a number 0–6`);
  if (typeof d === "boolean" && typeof v !== "boolean") problems.push(`scene.${k} must be boolean`);
  if (Array.isArray(d) && !(Array.isArray(v) && v.length >= 3 && v.every((c) => typeof c === "string" && hex.test(c)))) problems.push(`scene.${k} must be 3+ #rrggbb strings`);
}

if (theme.css) {
  const scope = `.lab[data-theme="${id}"]`;
  const noComments = theme.css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Check each selector list before a "{" that is not inside @keyframes/@media headers.
  const re = /([^{}]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noComments))) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith("@") || /^(from|to|\d+%)(\s*,\s*(from|to|\d+%))*$/.test(sel)) continue;
    for (const part of sel.split(",")) if (!part.trim().startsWith(scope)) problems.push(`css selector not scoped: "${part.trim()}"`);
  }
}

function lum(h: string) {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const v = theme.vars ?? {};
const defaults: Record<string, string> = { "--lab-ink": "#2e2a7b", "--lab-ink-2": "#4a4d73", "--lab-paper": "#fffdf8", "--lab-surface": "#ffffff", "--lab-bg": "#f7f5f2", "--lab-good": "#2f7d32", "--lab-bad": "#b4503f", "--lab-warn": "#8a6a0f", "--lab-scenario": "#4a3aa7", "--lab-reference": "#eb6834", "--lab-on-accent": "#ffffff", "--lab-accent-to": "#2e2a7b" };
const get = (k: string) => (hex.test(v[k] ?? "") ? v[k] : defaults[k]);
const pairs: [string, string, number][] = [
  ["--lab-ink", "--lab-paper", 4.5],
  ["--lab-ink", "--lab-surface", 4.5],
  ["--lab-ink", "--lab-bg", 4.5],
  ["--lab-ink-2", "--lab-paper", 4.5],
  ["--lab-ink-2", "--lab-surface", 4.5],
  ["--lab-good", "--lab-paper", 3],
  ["--lab-bad", "--lab-paper", 3],
  ["--lab-warn", "--lab-paper", 3],
  ["--lab-scenario", "--lab-surface", 3],
  ["--lab-reference", "--lab-surface", 2.5],
  ["--lab-on-accent", "--lab-accent-to", 4.5],
];
for (const [a, b, min] of pairs) {
  const ca = get(a), cb = get(b);
  if (!ca || !cb) { warn.push(`could not check ${a} on ${b} (use #rrggbb to enable)`); continue; }
  const r = contrast(ca, cb);
  if (r < min) problems.push(`contrast ${a} ${ca} on ${b} ${cb} is ${r.toFixed(2)}:1, needs ${min}:1`);
}

for (const w of warn) console.log("warn:", w);
if (problems.length) {
  console.log(`FAIL ${id}`);
  for (const p of problems) console.log(" -", p);
  process.exit(1);
}
console.log(`PASS ${id}: "${theme.name}" — ${theme.description}`);
