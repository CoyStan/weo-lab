import type { LabTheme } from "./types.ts";

/** Dark sci-fi operations room: blue-black panels, cyan edges and a dusk holographic island. */
const theme: LabTheme = {
  id: "mission",
  name: "Mission control",
  description: "A dark operations room: translucent blue panels with cyan edges, cyan scenario lines and a night holographic island.",
  scheme: "dark",
  vars: {
    // Page and surfaces
    "--lab-bg": "#0a0f1e",
    "--lab-paper": "#0d1830",
    "--lab-surface": "#122040",
    "--lab-scene-bg": "linear-gradient(180deg, #1c1550 0%, #14215a 38%, #0b2a40 72%, #061420 100%)",
    // Ink
    "--lab-ink": "#d8f4ff",
    "--lab-ink-2": "#8fb6d6",
    "--lab-line": "color-mix(in srgb, #22d3ee 22%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #22d3ee 48%, transparent)",
    // Accent and focus
    "--lab-accent-from": "#5eeaff",
    "--lab-accent-to": "#0ea5c6",
    "--lab-on-accent": "#04111f",
    "--lab-focus": "#7dd3fc",
    // Data series: cyan scenario against magenta reference
    "--lab-scenario": "#22e8ff",
    "--lab-reference": "#ff4fd8",
    "--lab-pinned": "#b6ff5c",
    // Status
    "--lab-good": "#3ef2a8",
    "--lab-warn": "#ffd166",
    "--lab-bad": "#ff5c7a",
    "--lab-info": "#7dd3fc",
    "--lab-good-mark": "#3ef2a8",
    "--lab-warn-mark": "#ffd166",
    "--lab-alert": "#ff5c7a",
    "--lab-info-mark": "#7dd3fc",
    "--lab-good-bg": "color-mix(in srgb, #3ef2a8 16%, transparent)",
    "--lab-warn-bg": "color-mix(in srgb, #ffd166 16%, transparent)",
    "--lab-bad-bg": "color-mix(in srgb, #ff5c7a 18%, transparent)",
    "--lab-info-bg": "color-mix(in srgb, #7dd3fc 14%, transparent)",
    "--lab-bad-surface": "#2a1026",
    "--lab-good-surface": "#0b2a25",
    // Type
    "--lab-font-ui": "var(--font-inter), 'Helvetica Neue', Arial, sans-serif",
    "--lab-font-display": "var(--font-inter), 'Helvetica Neue', Arial, sans-serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    // Shape and depth
    "--lab-radius-panel": "10px",
    "--lab-radius-card": "8px",
    "--lab-radius-control": "8px",
    "--lab-panel-shadow":
      "inset 0 1px 0 rgb(34 211 238 / 0.14), 0 0 0 1px rgb(34 211 238 / 0.06), 0 0 18px rgb(34 211 238 / 0.14)",
  },
  css: `
.lab[data-theme="mission"] {
  background: var(--lab-bg);
  color: var(--lab-ink);
  letter-spacing: 0.01em;
}
.lab[data-theme="mission"] .lab-panel {
  background: linear-gradient(160deg, color-mix(in srgb, #22d3ee 6%, var(--lab-paper)) 0%, var(--lab-paper) 100%);
  backdrop-filter: blur(6px);
}
.lab[data-theme="mission"] .lab-chip,
.lab[data-theme="mission"] .lab-btn,
.lab[data-theme="mission"] .lab-segmented button,
.lab[data-theme="mission"] .lab-stamp,
.lab[data-theme="mission"] .lab-scene-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.lab[data-theme="mission"] .lab-btn-primary {
  box-shadow: 0 0 14px rgb(34 211 238 / 0.35);
}
.lab[data-theme="mission"] .lab-btn-ghost,
.lab[data-theme="mission"] .lab-btn-soft {
  border-color: var(--lab-line-strong);
}
.lab[data-theme="mission"] .lab-tile,
.lab[data-theme="mission"] .lab-chart {
  border-color: var(--lab-line);
}
.lab[data-theme="mission"] .lab-tile:hover {
  box-shadow: 0 0 16px rgb(34 211 238 / 0.22);
}
.lab[data-theme="mission"] .lab-table th {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
}
.lab[data-theme="mission"] .lab-scene-label {
  text-shadow: 0 0 6px rgb(34 232 255 / 0.55);
}
`,
  scene: {
    // Sky, weather and sea: indigo dusk over a dark teal sea
    sky: "#1c1d5e",
    skyStorm: "#252a48",
    cloud: "#4a5aa0",
    cloudStorm: "#1d2238",
    rain: "#7fb8e0",
    lightning: "#9fe8ff",
    water: "#0b2d40",
    waterFar: "#0c3142",
    lagoon: "#165262",
    foam: "#6fc3cf",
    // Land: dark blue-grey with teal foliage
    sand: "#3a4860",
    grass: "#2d4158",
    hill: "#34495f",
    leaf: "#2f6b72",
    trunk: "#2b3449",
    road: "#4a5870",
    plaza: "#4b5d76",
    pad: "#3d4f68",
    padRing: "#1f8aa3",
    // Buildings: steel blue with cyan accents
    cream: "#6d88ad",
    stone: "#52698c",
    building2: "#587396",
    vault: "#5f72a6",
    dock: "#3e5070",
    chimney: "#46577a",
    smoke: "#8fa3c0",
    window: "#22e5ff",
    roof: "#2bc7d9",
    roofOff: "#4a5472",
    houseOff: "#3b4661",
    hull: "#1a2342",
    glass: "#9ff3ff",
    lampGlass: "#e6fdff",
    lamp: "#d8fbff",
    beam: "#8ff7ff",
    pallet: "#4a5f7a",
    gold: "#67e8f9",
    carGlass: "#a5f3fc",
    cars: ["#22d3ee", "#ff4fd8", "#7dd3fc", "#5b6cff", "#e0faff", "#3ef2a8"],
    // Semantic accents
    accent: "#22d3ee",
    good: "#3ef2a8",
    bad: "#ff5c7a",
    warn: "#ffd166",
    cool: "#7dd3fc",
    focus: "#67e8f9",
    // Lighting: moderate ambient so shapes stay readable at night
    ambient: 0.7,
    hemiSky: "#5a6bd6",
    hemiGround: "#1a2440",
    hemi: 0.8,
    sunColor: "#bfefff",
    sun: 1.9,
    flat: true,
  },
};

export default theme;
