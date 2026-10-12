import type { LabTheme } from "./types.ts";

/** Flagship multilateral report: crisp white paper, institutional blue ink, one gold accent. */
const theme: LabTheme = {
  id: "institutional",
  name: "Institutional report",
  description: "A flagship economic report: white paper, institutional blue ink, a single gold accent and a calm morning island.",
  scheme: "light",
  vars: {
    /* Page and surfaces */
    "--lab-bg": "#f3f5f8",
    "--lab-paper": "#fbfcfd",
    "--lab-surface": "#ffffff",
    "--lab-scene-bg": "linear-gradient(180deg, #cfe5f4 0%, #e9f3f9 58%, #f6f2ea 100%)",
    /* Ink */
    "--lab-ink": "#0b3a6f",
    "--lab-ink-2": "#3d5573",
    "--lab-line": "color-mix(in srgb, #0b3a6f 12%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #0b3a6f 26%, transparent)",
    /* Accent (primary buttons) and focus */
    "--lab-accent-from": "#164b85",
    "--lab-accent-to": "#0b3a6f",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#b8861f",
    /* Data series: deep blue scenario against warm gold/orange reference */
    "--lab-scenario": "#0b3a6f",
    "--lab-reference": "#b5661a",
    "--lab-pinned": "#0f7b6c",
    /* Status */
    "--lab-good": "#2e6b3a",
    "--lab-warn": "#8a6410",
    "--lab-bad": "#a33a2b",
    "--lab-info": "#2b5f9e",
    "--lab-good-mark": "#3f8f5a",
    "--lab-warn-mark": "#d9a536",
    "--lab-alert": "#c0442f",
    "--lab-info-mark": "#2b5f9e",
    "--lab-bad-surface": "#fbeeea",
    "--lab-good-surface": "#eef7f0",
    /* Type */
    "--lab-font-ui": "var(--font-inter), \"Helvetica Neue\", Arial, sans-serif",
    "--lab-font-display": "var(--font-fraunces), Georgia, \"Iowan Old Style\", Palatino, serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    /* Shape and depth */
    "--lab-radius-panel": "6px",
    "--lab-radius-card": "5px",
    "--lab-radius-control": "4px",
    "--lab-panel-shadow": "0 1px 0 #ffffff inset, 0 1px 2px color-mix(in srgb, #0b3a6f 6%, transparent)",
  },
  css: `
.lab[data-theme="institutional"] {
  letter-spacing: 0.005em;
}
.lab[data-theme="institutional"] .font-display {
  font-weight: 500;
  letter-spacing: -0.01em;
}
.lab[data-theme="institutional"] .lab-panel {
  background-image: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
}
.lab[data-theme="institutional"] .lab-field + .lab-field {
  border-top-color: color-mix(in srgb, #0b3a6f 10%, transparent);
}
.lab[data-theme="institutional"] .lab-btn {
  letter-spacing: 0.02em;
}
.lab[data-theme="institutional"] .lab-btn-primary {
  box-shadow: 0 1px 2px color-mix(in srgb, #0b3a6f 22%, transparent);
}
.lab[data-theme="institutional"] .lab-chip {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.62rem;
  font-weight: 600;
}
.lab[data-theme="institutional"] .lab-table thead th {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.64rem;
  border-bottom: 1px solid #0b3a6f;
}
.lab[data-theme="institutional"] .lab-tile.is-focus {
  box-shadow: inset 3px 0 0 #b8861f, 0 0 0 1px color-mix(in srgb, #0b3a6f 18%, transparent);
}
.lab[data-theme="institutional"] .lab-scene-label {
  font-family: var(--lab-font-display);
  letter-spacing: 0.01em;
  border-radius: 3px;
  border-color: color-mix(in srgb, #0b3a6f 22%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, #0b3a6f 14%, transparent);
}
.lab[data-theme="institutional"] .lab-scene-label strong {
  font-family: var(--lab-font-ui);
  font-weight: 600;
}
.lab[data-theme="institutional"] .lab-scene-label.is-focus {
  border-color: #b8861f;
}
.lab[data-theme="institutional"] .lab-menu-panel {
  border-radius: 6px;
  box-shadow: 0 4px 14px color-mix(in srgb, #0b3a6f 12%, transparent);
}
`,
  scene: {
    // Sky, weather and sea: a clean, bright morning
    sky: "#cfe5f4",
    skyStorm: "#8fa2b4",
    cloud: "#ffffff",
    cloudStorm: "#6b7c90",
    rain: "#d5e6f2",
    lightning: "#eef6ff",
    water: "#5f9fcc",
    waterFar: "#86b9da",
    lagoon: "#a6d4e8",
    foam: "#ffffff",
    // Land: soft green, stone paths
    sand: "#efe6cf",
    grass: "#b6d19c",
    hill: "#a0bf8a",
    leaf: "#5b8f66",
    trunk: "#7c6446",
    road: "#dcd6c4",
    plaza: "#f1ece0",
    pad: "#f3efe5",
    padRing: "#c6bfab",
    // Buildings: white and stone with navy roofs
    cream: "#f8f5ee",
    stone: "#e8e4da",
    building2: "#dfe2e6",
    vault: "#d5dbe8",
    dock: "#c8c3b3",
    chimney: "#aab1bb",
    smoke: "#f4f6f7",
    window: "#8db8d0",
    roof: "#0b3a6f",
    roofOff: "#7d8794",
    houseOff: "#d3d7dd",
    hull: "#1f3a5c",
    glass: "#ffffff",
    lampGlass: "#fff8e0",
    lamp: "#f2cf7a",
    beam: "#f5d98a",
    pallet: "#b89b6e",
    gold: "#d4a22c",
    carGlass: "#dfe9f2",
    cars: ["#0b3a6f", "#d4a22c", "#8fa9c4", "#ffffff", "#5c6f86"],
    // Semantic accents
    accent: "#0b3a6f",
    good: "#2f8a5b",
    bad: "#b8483a",
    warn: "#d4a22c",
    cool: "#6f9fcf",
    focus: "#b8861f",
    // Lighting: bright, slightly cool, faceted
    ambient: 0.7,
    hemiSky: "#eef6fc",
    hemiGround: "#d8cba9",
    hemi: 0.8,
    sunColor: "#fff8ec",
    sun: 2.0,
    flat: true,
  },
};

export default theme;
