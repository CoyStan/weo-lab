import type { LabTheme } from "./types.ts";

/** Dark trading terminal: near-black screens, amber and green data, monospace throughout, a night-time island lit by amber windows. */
const theme: LabTheme = {
  id: "terminal",
  name: "Market terminal",
  description: "A dark trading terminal: near-black screens, amber and green data in monospace, and a night island lit by amber windows.",
  scheme: "dark",
  vars: {
    // Page and surfaces
    "--lab-bg": "#050706",
    "--lab-paper": "#0a0e0c",
    "--lab-surface": "#0e1412",
    "--lab-scene-bg": "linear-gradient(180deg, #02050a 0%, #061320 100%)",
    // Ink: amber text, muted green-grey secondary
    "--lab-ink": "#ffc24d",
    "--lab-ink-2": "#8fa397",
    "--lab-line": "color-mix(in srgb, var(--lab-ink) 16%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, var(--lab-ink) 34%, transparent)",
    // Accent and focus
    "--lab-accent-from": "#ffb000",
    "--lab-accent-to": "#c26a00",
    "--lab-on-accent": "#050706",
    "--lab-focus": "#ffe066",
    // Data series: scenario green, reference orange
    "--lab-scenario": "#3ddc84",
    "--lab-reference": "#ff9f1c",
    "--lab-pinned": "#5ee6ff",
    // Status
    "--lab-good": "#3ddc84",
    "--lab-warn": "#ffb000",
    "--lab-bad": "#ff6b6b",
    "--lab-info": "#6ec6ff",
    "--lab-good-mark": "#3ddc84",
    "--lab-warn-mark": "#ffb000",
    "--lab-alert": "#ff5c5c",
    "--lab-info-mark": "#6ec6ff",
    "--lab-bad-surface": "#2a1010",
    "--lab-good-surface": "#0c2016",
    // Type: monospace everywhere, display included
    "--lab-font-ui": "ui-monospace, SFMono-Regular, Menlo, monospace",
    "--lab-font-display": "ui-monospace, SFMono-Regular, Menlo, monospace",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    // Shape and depth: square corners, flat panels
    "--lab-radius-panel": "3px",
    "--lab-radius-card": "2px",
    "--lab-radius-control": "2px",
    "--lab-panel-shadow": "none",
  },
  css: `
/* Scanlines on the page only: on scrolling panels they triggered a compositing glitch. */
.lab[data-theme="terminal"] {
  background-image: repeating-linear-gradient(0deg, transparent 0 3px, color-mix(in srgb, var(--lab-ink) 3%, transparent) 3px 4px);
}
.lab[data-theme="terminal"] .lab-btn,
.lab[data-theme="terminal"] .lab-chip,
.lab[data-theme="terminal"] .lab-segmented button,
.lab[data-theme="terminal"] .lab-table thead th {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.lab[data-theme="terminal"] .lab-btn-primary {
  box-shadow: none;
  border-color: var(--lab-accent-from);
}
.lab[data-theme="terminal"] .lab-btn-ghost,
.lab[data-theme="terminal"] .lab-select,
.lab[data-theme="terminal"] .lab-input {
  background-color: var(--lab-surface);
}
.lab[data-theme="terminal"] .lab-tile,
.lab[data-theme="terminal"] .lab-chart {
  border-color: color-mix(in srgb, var(--lab-ink) 12%, transparent);
}
.lab[data-theme="terminal"] .lab-tooltip,
.lab[data-theme="terminal"] .lab-menu-panel {
  box-shadow: none;
}
.lab[data-theme="terminal"] .lab-progress > span {
  box-shadow: 0 0 6px color-mix(in srgb, var(--lab-scenario) 60%, transparent);
}
.lab[data-theme="terminal"] .lab-scene-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 2px;
  border-color: color-mix(in srgb, var(--lab-ink) 40%, transparent);
  background: color-mix(in srgb, var(--lab-paper) 90%, transparent);
  box-shadow: none;
}
.lab[data-theme="terminal"] .lab-scene-label.is-focus {
  box-shadow: 0 0 0 1px var(--lab-scenario);
}
`,
  scene: {
    // Night sky, weather and sea
    sky: "#060b14",
    skyStorm: "#0d141d",
    cloud: "#1b2630",
    cloudStorm: "#10171f",
    rain: "#5d7d96",
    lightning: "#a9ccff",
    water: "#0a1b2b",
    waterFar: "#081524",
    lagoon: "#0c2a33",
    foam: "#2f4f5a",
    // Dim grey-green land
    sand: "#262a22",
    grass: "#1d2a20",
    hill: "#17231b",
    leaf: "#1e3b2b",
    trunk: "#2b2620",
    road: "#2a2e2e",
    plaza: "#2e332f",
    pad: "#252b27",
    padRing: "#3b4a41",
    // Dark slate buildings
    cream: "#3b4140",
    stone: "#2c3337",
    building2: "#252d35",
    vault: "#2c3142",
    dock: "#2b2823",
    chimney: "#222a31",
    smoke: "#4d555c",
    window: "#ffb347",
    roof: "#1f2d38",
    roofOff: "#1b2026",
    houseOff: "#20262c",
    hull: "#0a1520",
    glass: "#22323c",
    // Warm lamps and beams
    lampGlass: "#ffd58a",
    lamp: "#ffb84d",
    beam: "#ffc766",
    pallet: "#4a3b26",
    gold: "#ffb000",
    carGlass: "#2a3b46",
    cars: ["#ffb000", "#3ddc84", "#4b6170", "#e8e2c8"],
    // Semantic accents
    accent: "#ffb000",
    good: "#3ddc84",
    bad: "#ff5c5c",
    warn: "#ff9f1c",
    cool: "#4fb3ff",
    focus: "#ffe066",
    // Low night lighting
    ambient: 0.4,
    hemiSky: "#1c2e42",
    hemiGround: "#0d1511",
    hemi: 0.5,
    sunColor: "#ffd9a0",
    sun: 1.1,
    flat: true,
  },
};

export default theme;
