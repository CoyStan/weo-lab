import type { LabTheme } from "./types.ts";

/** Vintage atlas: parchment, sepia ink, serif throughout and a hand-tinted island. */
const theme: LabTheme = {
  id: "atlas",
  name: "Vintage atlas",
  description: "An explorer's atlas: parchment, sepia ink and a hand-tinted island under late-afternoon light.",
  scheme: "light",
  vars: {
    // Page and surfaces
    "--lab-bg": "#efe4cc",
    "--lab-paper": "#f7efdb",
    "--lab-surface": "#fbf6e8",
    "--lab-scene-bg": "linear-gradient(180deg, #e4d3ae 0%, #efe3c6 55%, #e6d5b0 100%)",
    // Ink
    "--lab-ink": "#3b2a1a",
    "--lab-ink-2": "#6b5239",
    "--lab-line": "color-mix(in srgb, #3b2a1a 24%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #3b2a1a 44%, transparent)",
    // Accent and focus
    "--lab-accent-from": "#8a3a2c",
    "--lab-accent-to": "#5e1b29",
    "--lab-on-accent": "#f7efdb",
    "--lab-focus": "#a0522d",
    // Data series: burgundy scenario vs faded navy reference
    "--lab-scenario": "#6b1e2e",
    "--lab-reference": "#3d5a80",
    "--lab-pinned": "#5b7d3a",
    // Status
    "--lab-good": "#3f6b2a",
    "--lab-warn": "#8a6410",
    "--lab-bad": "#9e3a2a",
    "--lab-info": "#3d5a80",
    "--lab-good-mark": "#6f9150",
    "--lab-warn-mark": "#c99a3a",
    "--lab-alert": "#b5452f",
    "--lab-info-mark": "#3d5a80",
    "--lab-bad-surface": "#f3dfd0",
    "--lab-good-surface": "#eaecd7",
    // Type: serif everywhere
    "--lab-font-ui": 'Georgia, "Iowan Old Style", Palatino, "Palatino Linotype", serif',
    "--lab-font-display": "var(--font-fraunces), Georgia, serif",
    // Shape and depth: small radii, double-rule panels
    "--lab-radius-panel": "4px",
    "--lab-radius-card": "3px",
    "--lab-radius-control": "3px",
    "--lab-panel-shadow":
      "inset 0 0 0 3px #f7efdb, inset 0 0 0 4px color-mix(in srgb, #3b2a1a 30%, transparent), 0 2px 8px color-mix(in srgb, #3b2a1a 10%, transparent)",
  },
  css: `
.lab[data-theme="atlas"] {
  background-color: #efe4cc;
  background-image:
    radial-gradient(ellipse at 18% 8%, rgb(255 250 235 / 0.6), transparent 60%),
    radial-gradient(ellipse at 88% 92%, rgb(120 84 40 / 0.12), transparent 55%),
    repeating-linear-gradient(0deg, rgb(120 84 40 / 0.025) 0 1px, transparent 1px 3px);
  letter-spacing: 0.005em;
}
.lab[data-theme="atlas"] .lab-panel {
  background-image: repeating-radial-gradient(circle at 30% 20%, rgb(120 84 40 / 0.035) 0 1px, transparent 1px 4px);
}
.lab[data-theme="atlas"] .font-display {
  font-style: italic;
  letter-spacing: -0.01em;
}
.lab[data-theme="atlas"] .lab-btn,
.lab[data-theme="atlas"] .lab-chip,
.lab[data-theme="atlas"] .lab-stamp,
.lab[data-theme="atlas"] .lab-table thead th {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.lab[data-theme="atlas"] .lab-chip,
.lab[data-theme="atlas"] .lab-segmented,
.lab[data-theme="atlas"] .lab-segmented button {
  border-radius: 2px;
}
.lab[data-theme="atlas"] .lab-chart {
  border-style: dotted;
}
.lab[data-theme="atlas"] .lab-scene-label {
  font-family: Georgia, "Iowan Old Style", serif;
  font-style: italic;
  border-style: double;
  border-width: 3px;
  border-radius: 2px;
}
.lab[data-theme="atlas"] .lab-scene-label strong {
  font-style: normal;
  letter-spacing: 0.02em;
}
`,
  scene: {
    // Sky, weather and sea: muted aqua water, parchment sky
    sky: "#efe2c6",
    skyStorm: "#9a8f7c",
    cloud: "#fbf5e6",
    cloudStorm: "#6e6150",
    rain: "#c9bfa6",
    lightning: "#fff6dc",
    water: "#8cc4bd",
    waterFar: "#9fd0c8",
    lagoon: "#c3e0d2",
    foam: "#f7f1e1",
    // Land: ochre sand, olive land and hills
    sand: "#e2c48f",
    grass: "#9aa06a",
    hill: "#8b8f5c",
    leaf: "#5f7046",
    trunk: "#6b4a2f",
    road: "#d8c49a",
    plaza: "#eadbb5",
    pad: "#e9dcb8",
    padRing: "#b89b6c",
    // Buildings: cream and terracotta
    cream: "#f4ead2",
    stone: "#e6d6b4",
    building2: "#d9a27e",
    vault: "#c9b6a2",
    dock: "#a98b62",
    chimney: "#8e6f55",
    smoke: "#efe6d2",
    window: "#6d8c86",
    roof: "#b5583a",
    roofOff: "#7d7364",
    houseOff: "#c9bba5",
    hull: "#5b3a29",
    glass: "#f6f0e0",
    lampGlass: "#fbeccb",
    lamp: "#f0c97a",
    beam: "#f2d08a",
    pallet: "#a4804f",
    gold: "#c99a3a",
    carGlass: "#d9e3dc",
    cars: ["#b5583a", "#3f6b6a", "#c99a3a", "#6b3a4a", "#f4ead2", "#4a5a3a"],
    // Semantic accents
    accent: "#5e1b29",
    good: "#3f6b2a",
    bad: "#9e3a2a",
    warn: "#a3700f",
    cool: "#4a6a8a",
    focus: "#a0522d",
    // Lighting: warm late-afternoon sun, flat shading
    ambient: 0.7,
    hemiSky: "#f5e9cf",
    hemiGround: "#b89a6a",
    hemi: 0.8,
    sunColor: "#fff1d0",
    sun: 2.2,
    flat: true,
  },
};

export default theme;
