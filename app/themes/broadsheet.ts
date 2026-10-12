import type { LabTheme } from "./types.ts";

/** Financial broadsheet: salmon newsprint, black rules, claret accents and an editorial island. */
const theme: LabTheme = {
  id: "broadsheet",
  name: "Financial broadsheet",
  description: "A financial newspaper's data desk: salmon newsprint, black top rules, claret accents and a cream-and-khaki editorial island.",
  scheme: "light",
  vars: {
    // Page and surfaces
    "--lab-bg": "#f6e5d6",
    "--lab-paper": "#f9ecdf",
    "--lab-surface": "#fbf1e7",
    "--lab-scene-bg": "linear-gradient(180deg, #f1ead9 0%, #e4e8e8 100%)",
    // Ink
    "--lab-ink": "#1c1a1a",
    "--lab-ink-2": "#4a3f3d",
    "--lab-line": "color-mix(in srgb, #1c1a1a 18%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #1c1a1a 38%, transparent)",
    // Accent (primary buttons) and focus
    "--lab-accent-from": "#7a1e3a",
    "--lab-accent-to": "#5a1229",
    "--lab-on-accent": "#fff6ef",
    "--lab-focus": "#2f4a6b",
    // Data series: claret scenario, slate-blue reference
    "--lab-scenario": "#7a1e3a",
    "--lab-reference": "#4f6d8f",
    "--lab-pinned": "#c2871e",
    // Status
    "--lab-good": "#2f6b3a",
    "--lab-warn": "#8a5a00",
    "--lab-bad": "#b3372c",
    "--lab-info": "#3d5a7a",
    "--lab-good-mark": "#3f8f4f",
    "--lab-warn-mark": "#d89a2b",
    "--lab-alert": "#b3372c",
    "--lab-info-mark": "#4f6d8f",
    "--lab-bad-surface": "#f6d9cf",
    "--lab-good-surface": "#e3eedb",
    // Type: serif display, Inter UI, system monospace
    "--lab-font-ui": "var(--font-inter), \"Helvetica Neue\", Arial, sans-serif",
    "--lab-font-display": "Georgia, \"Iowan Old Style\", Palatino, serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    // Shape and depth: square-ish, no shadows
    "--lab-radius-panel": "3px",
    "--lab-radius-card": "2px",
    "--lab-radius-control": "2px",
    "--lab-panel-shadow": "none",
  },
  css: `
.lab[data-theme="broadsheet"] .lab-panel {
  border-top: 2px solid #1c1a1a;
}
.lab[data-theme="broadsheet"] h1,
.lab[data-theme="broadsheet"] h2,
.lab[data-theme="broadsheet"] h3 {
  font-family: var(--lab-font-display);
  font-weight: 700;
  letter-spacing: -0.01em;
}
.lab[data-theme="broadsheet"] .lab-chip,
.lab[data-theme="broadsheet"] .lab-table thead th {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.lab[data-theme="broadsheet"] .lab-tile {
  border-top: 2px solid #1c1a1a;
}
.lab[data-theme="broadsheet"] .lab-btn-primary {
  box-shadow: none;
}
.lab[data-theme="broadsheet"] .lab-btn-primary:not(:disabled):hover {
  box-shadow: none;
}
.lab[data-theme="broadsheet"] .lab-scene-label {
  border: 1px solid #1c1a1a;
  border-top-width: 2px;
  border-radius: 2px;
  box-shadow: none;
  font-family: var(--lab-font-display);
  letter-spacing: 0.01em;
}
.lab[data-theme="broadsheet"] .lab-stamp {
  border-width: 2px;
  border-radius: 2px;
}
`,
  scene: {
    // Soft cream sky, grey-blue sea, khaki land
    sky: "#efe6d2",
    skyStorm: "#8f9499",
    cloud: "#fbf7ee",
    cloudStorm: "#6b6a66",
    rain: "#c9ccd0",
    lightning: "#f4f1e8",
    water: "#7f96a6",
    waterFar: "#8ea3b1",
    lagoon: "#a9bcc4",
    foam: "#f7f3ea",
    sand: "#d9c9a0",
    grass: "#b5a676",
    hill: "#a39766",
    leaf: "#7d7650",
    trunk: "#6d5a43",
    road: "#d8cdb3",
    plaza: "#e6dcc4",
    pad: "#e7dcc3",
    padRing: "#b9ab88",
    // Buildings: cream and claret, slate roofs
    cream: "#f3ead6",
    stone: "#e0d5bd",
    building2: "#8e2b40",
    vault: "#d7cbc0",
    dock: "#bfae8e",
    chimney: "#8c7d6e",
    smoke: "#e8e4dc",
    window: "#7d8c99",
    roof: "#4f5b68",
    roofOff: "#7b8290",
    houseOff: "#c9c2b4",
    hull: "#3b2a2e",
    glass: "#f4f1ea",
    lampGlass: "#fff3d1",
    lamp: "#f2d68a",
    beam: "#f0d28a",
    pallet: "#9c7a55",
    gold: "#c99a3a",
    carGlass: "#e4e6e4",
    cars: ["#7a1e3a", "#4f5b68", "#e9dcc0", "#2f4a6b"],
    // Semantic accents
    accent: "#7a1e3a",
    good: "#2f6b3a",
    bad: "#b3372c",
    warn: "#d89a2b",
    cool: "#6f8fab",
    focus: "#2f4a6b",
    // Neutral, gentle light
    ambient: 0.7,
    hemiSky: "#f3ece0",
    hemiGround: "#b8a57e",
    hemi: 0.7,
    sunColor: "#fff8ec",
    sun: 1.5,
    flat: true,
  },
};

export default theme;
