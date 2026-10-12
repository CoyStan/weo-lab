import type { LabTheme } from "./types.ts";

/** Aurora glass: frosted translucent panels over a lavender, mint and sky aurora, with an indigo scenario against a coral-pink reference. */
const theme: LabTheme = {
  id: "glass",
  name: "Aurora glass",
  description: "Frosted white panels over a soft lavender, mint and sky aurora, with a pastel daylight island.",
  scheme: "light",
  vars: {
    /* Page and surfaces (hex for the contrast check; translucency comes from css) */
    "--lab-bg": "#eef2fb",
    "--lab-paper": "#fdfcff",
    "--lab-surface": "#ffffff",
    "--lab-scene-bg": "linear-gradient(180deg, #d4dcff 0%, #e6f1fc 55%, #d6f5ee 100%)",
    /* Ink */
    "--lab-ink": "#1e1b4b",
    "--lab-ink-2": "#4b4a7a",
    "--lab-line": "rgb(99 102 241 / 0.14)",
    "--lab-line-strong": "rgb(99 102 241 / 0.3)",
    /* Accent and focus */
    "--lab-accent-from": "#8b7cf8",
    "--lab-accent-to": "#4338ca",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#6d5cf0",
    /* Data series: indigo scenario, coral-pink reference */
    "--lab-scenario": "#4338ca",
    "--lab-reference": "#f0607a",
    "--lab-pinned": "#14b8a6",
    /* Status */
    "--lab-good": "#1d7f57",
    "--lab-warn": "#9a6200",
    "--lab-bad": "#c23b5b",
    "--lab-info": "#5b7cf5",
    "--lab-good-mark": "#34c48f",
    "--lab-warn-mark": "#f5b13d",
    "--lab-alert": "#ef5b6e",
    "--lab-info-mark": "#6d5cf0",
    "--lab-bad-surface": "#fff1f4",
    "--lab-good-surface": "#effcf6",
    /* Type: Inter for both UI and display */
    "--lab-font-ui": "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    "--lab-font-display": "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    /* Shape and depth */
    "--lab-radius-panel": "22px",
    "--lab-radius-card": "16px",
    "--lab-radius-control": "999px",
    "--lab-panel-shadow":
      "0 1px 0 rgb(255 255 255 / 0.9) inset, 0 14px 34px -10px rgb(99 102 241 / 0.28), 0 4px 14px rgb(236 72 153 / 0.08)",
  },
  css: `
.lab[data-theme="glass"] {
  background-color: #eef2fb;
  background-image:
    radial-gradient(60% 50% at 10% 6%, rgb(196 181 253 / 0.6), transparent 70%),
    radial-gradient(55% 45% at 92% 12%, rgb(167 243 208 / 0.55), transparent 70%),
    radial-gradient(60% 55% at 55% 100%, rgb(186 230 253 / 0.65), transparent 70%),
    linear-gradient(160deg, #f1eefe 0%, #ecf4fc 50%, #eefaf5 100%);
  background-attachment: fixed;
}
.lab[data-theme="glass"] .lab-panel,
.lab[data-theme="glass"] .lab-menu-panel,
.lab[data-theme="glass"] .lab-tooltip {
  background: rgb(255 255 255 / 0.6);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  backdrop-filter: blur(18px) saturate(150%);
  border-color: rgb(255 255 255 / 0.75);
}
.lab[data-theme="glass"] .lab-menu-panel,
.lab[data-theme="glass"] .lab-tooltip {
  background: rgb(255 255 255 / 0.88);
}
.lab[data-theme="glass"] .lab-tile,
.lab[data-theme="glass"] .lab-chart {
  background: rgb(255 255 255 / 0.55);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-color: rgb(255 255 255 / 0.8);
}
.lab[data-theme="glass"] .lab-scene {
  border: 1px solid rgb(255 255 255 / 0.8);
  box-shadow: 0 20px 50px -14px rgb(99 102 241 / 0.32), inset 0 1px 0 rgb(255 255 255 / 0.8);
}
.lab[data-theme="glass"] .lab-scene-label {
  background: rgb(255 255 255 / 0.82);
  border-color: rgb(255 255 255 / 0.9);
  border-radius: 0.75rem;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.lab[data-theme="glass"] .lab-segmented {
  background: rgb(255 255 255 / 0.5);
  border-color: rgb(255 255 255 / 0.85);
}
.lab[data-theme="glass"] .lab-btn-primary {
  box-shadow: 0 8px 20px -6px rgb(99 102 241 / 0.55);
}
.lab[data-theme="glass"] .font-display {
  font-weight: 700;
  letter-spacing: -0.02em;
}
`,
  scene: {
    // Sky, weather and sea: lavender-blue sky, light aqua water, pale foam
    sky: "#cfd8ff",
    skyStorm: "#9aa3c7",
    cloud: "#ffffff",
    cloudStorm: "#8d93b5",
    rain: "#d7e4ff",
    lightning: "#f4f0ff",
    water: "#8fd3ee",
    waterFar: "#a9e3f2",
    lagoon: "#c4f1ee",
    foam: "#ffffff",
    // Land: mint grass, cream sand, lilac paths
    sand: "#f6ecdc",
    grass: "#b8efd0",
    hill: "#a6e2c4",
    leaf: "#6fc9a4",
    trunk: "#9d86b5",
    road: "#e6e1f5",
    plaza: "#f3f0fc",
    pad: "#f1edfb",
    padRing: "#c7bde8",
    // Buildings: white with violet and pink accents
    cream: "#ffffff",
    stone: "#f1eefb",
    building2: "#e6e0f7",
    vault: "#dcd4f5",
    dock: "#cfd9f2",
    chimney: "#c4bcdc",
    smoke: "#f7f5ff",
    window: "#9fd7f5",
    roof: "#b47cf0",
    roofOff: "#a6a2c4",
    houseOff: "#dedaf0",
    hull: "#4c3f8f",
    glass: "#ffffff",
    lampGlass: "#fff8e6",
    lamp: "#ffe2a8",
    beam: "#ffd9f0",
    pallet: "#c9b3e6",
    gold: "#f5b84b",
    carGlass: "#eef6ff",
    cars: ["#f472b6", "#8b5cf6", "#38bdf8", "#34d399", "#ffffff", "#6366f1"],
    // Semantic accents
    accent: "#4338ca",
    good: "#2fb37f",
    bad: "#ef5b6e",
    warn: "#f5b13d",
    cool: "#7cb8f5",
    focus: "#6d5cf0",
    // Soft, bright lighting with smooth shading
    ambient: 1.1,
    hemiSky: "#f2f6ff",
    hemiGround: "#d9d2f0",
    hemi: 1.0,
    sunColor: "#ffffff",
    sun: 1.6,
    flat: false,
  },
};

export default theme;
