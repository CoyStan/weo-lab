import type { LabTheme } from "./types.ts";

/** Neo-brutalist: white panels on grey, solid black ink, hard shadows and one loud yellow accent. */
const theme: LabTheme = {
  id: "brutalist",
  name: "Brutalist",
  description: "Neo-brutalist instrument: white panels, thick black rules, hard shadows and a loud yellow accent on a flat graphic island.",
  scheme: "light",
  vars: {
    // Page and surfaces
    "--lab-bg": "#e6e6e6",
    "--lab-paper": "#ffffff",
    "--lab-surface": "#ffffff",
    "--lab-scene-bg": "#e4e4e4",
    // Ink
    "--lab-ink": "#000000",
    "--lab-ink-2": "#222222",
    "--lab-line": "#000000",
    "--lab-line-strong": "#000000",
    // Accent (primary buttons) and focus
    "--lab-accent-from": "#ffd400",
    "--lab-accent-to": "#ffd400",
    "--lab-on-accent": "#000000",
    "--lab-focus": "#1f3bff",
    // Data series: cobalt scenario line, black dashed reference line
    "--lab-scenario": "#1f3bff",
    "--lab-reference": "#000000",
    "--lab-pinned": "#e0007a",
    // Status
    "--lab-good": "#00703a",
    "--lab-warn": "#8a5a00",
    "--lab-bad": "#c4001a",
    "--lab-info": "#1f3bff",
    "--lab-good-mark": "#00a651",
    "--lab-warn-mark": "#ffd400",
    "--lab-alert": "#ff2b2b",
    "--lab-info-mark": "#1f3bff",
    "--lab-good-bg": "#b8f2cf",
    "--lab-warn-bg": "#fff1a8",
    "--lab-bad-bg": "#ffc9c4",
    "--lab-info-bg": "#d3dbff",
    "--lab-bad-surface": "#ffe3e0",
    "--lab-good-surface": "#e0f8ea",
    // Type: Helvetica/Arial for UI, monospace for labels
    "--lab-font-ui": '"Helvetica Neue", Helvetica, Arial, sans-serif',
    "--lab-font-display": '"Helvetica Neue", Helvetica, Arial, sans-serif',
    "--lab-font-mono": 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    // Shape and depth: square corners, hard offset shadow
    "--lab-radius-panel": "0",
    "--lab-radius-card": "0",
    "--lab-radius-control": "0",
    "--lab-panel-shadow": "4px 4px 0 #000000",
  },
  css: `
.lab[data-theme="brutalist"] {
  text-transform: none;
}
.lab[data-theme="brutalist"] .lab-panel {
  border: 2px solid #000000;
}
.lab[data-theme="brutalist"] .lab-field + .lab-field {
  border-top: 2px solid #000000;
}
.lab[data-theme="brutalist"] .lab-tile,
.lab[data-theme="brutalist"] .lab-chart {
  border: 2px solid #000000;
  box-shadow: 3px 3px 0 #000000;
}
.lab[data-theme="brutalist"] .lab-btn {
  border: 2px solid #000000;
  box-shadow: 3px 3px 0 #000000;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.75rem;
}
.lab[data-theme="brutalist"] .lab-btn:not(:disabled):active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #000000;
}
.lab[data-theme="brutalist"] .lab-btn-primary {
  background: #ffd400;
  color: #000000;
}
.lab[data-theme="brutalist"] .lab-btn-primary:not(:disabled):hover {
  background: #ffe033;
}
.lab[data-theme="brutalist"] .lab-segmented {
  border: 2px solid #000000;
  border-radius: 0;
  background: #ffffff;
}
.lab[data-theme="brutalist"] .lab-segmented button {
  border-radius: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.lab[data-theme="brutalist"] .lab-segmented button.is-active {
  background: #000000;
  color: #ffd400;
}
.lab[data-theme="brutalist"] .lab-chip {
  border: 2px solid #000000;
  border-radius: 0;
  text-transform: uppercase;
  font-family: var(--lab-font-mono);
  letter-spacing: 0.04em;
}
.lab[data-theme="brutalist"] .lab-table thead th {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 2px solid #000000;
}
.lab[data-theme="brutalist"] .lab-scene-label {
  border: 2px solid #000000;
  border-radius: 0;
  background: #ffffff;
  box-shadow: 3px 3px 0 #000000;
  text-transform: uppercase;
  font-family: var(--lab-font-mono);
}
.lab[data-theme="brutalist"] .lab-scene-label.is-focus {
  background: #ffd400;
  border-color: #000000;
  box-shadow: 3px 3px 0 #000000;
}
.lab[data-theme="brutalist"] .lab-tooltip,
.lab[data-theme="brutalist"] .lab-menu-panel {
  border: 2px solid #000000;
  border-radius: 0;
  box-shadow: 4px 4px 0 #000000;
}
`,
  scene: {
    // Flat graphic island: grey sky, bright blue sea, white land, black roads, yellow accents
    sky: "#e6e6e6",
    skyStorm: "#9a9a9a",
    cloud: "#ffffff",
    cloudStorm: "#4d4d4d",
    rain: "#bfbfbf",
    lightning: "#ffffff",
    water: "#1f6fff",
    waterFar: "#3d86ff",
    lagoon: "#5aa6ff",
    foam: "#ffffff",
    sand: "#fafafa",
    grass: "#ffffff",
    hill: "#f0f0f0",
    leaf: "#111111",
    trunk: "#000000",
    road: "#1a1a1a",
    plaza: "#f5f5f5",
    pad: "#ffffff",
    padRing: "#000000",
    cream: "#ffffff",
    stone: "#f2f2f2",
    building2: "#ffffff",
    vault: "#ffd400",
    dock: "#d9d9d9",
    chimney: "#1a1a1a",
    smoke: "#cfcfcf",
    window: "#1a1a1a",
    roof: "#ffd400",
    roofOff: "#9e9e9e",
    houseOff: "#d0d0d0",
    hull: "#000000",
    glass: "#ffffff",
    lampGlass: "#ffffff",
    lamp: "#ffd400",
    beam: "#ffd400",
    pallet: "#c8c8c8",
    gold: "#ffd400",
    carGlass: "#1f3bff",
    cars: ["#ffd400", "#1f3bff", "#ff2b2b", "#000000", "#ffffff"],
    accent: "#1f3bff",
    good: "#00a651",
    bad: "#ff2b2b",
    warn: "#ffd400",
    cool: "#5b7bff",
    focus: "#1f3bff",
    ambient: 1.2,
    hemiSky: "#ffffff",
    hemiGround: "#bdbdbd",
    hemi: 1.0,
    sunColor: "#ffffff",
    sun: 2.2,
    flat: true,
  },
};

export default theme;
