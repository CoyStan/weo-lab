import type { LabTheme } from "./types.ts";

/** Golden hour: peach page, warm white panels, plum ink, coral-to-magenta accents and a sunset island. */
const theme: LabTheme = {
  id: "sunset",
  name: "Golden hour",
  description: "A warm tropical sunset: peach paper, plum ink, coral-to-magenta accents and a golden-hour island.",
  scheme: "light",
  vars: {
    // Page and surfaces
    "--lab-bg": "#fbe6d5",
    "--lab-paper": "#fff9f3",
    "--lab-surface": "#fffdfa",
    "--lab-scene-bg": "linear-gradient(180deg, #ffc9ae 0%, #ffdcc6 52%, #fbe6d5 100%)",
    // Ink
    "--lab-ink": "#3d1a45",
    "--lab-ink-2": "#6b3d5e",
    "--lab-line": "color-mix(in srgb, #3d1a45 11%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #3d1a45 22%, transparent)",
    // Accent gradient and focus
    "--lab-accent-from": "#ff6f5e",
    "--lab-accent-to": "#c2307a",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#c2307a",
    // Data series: plum scenario against teal reference
    "--lab-scenario": "#7a2d7e",
    "--lab-reference": "#12958a",
    "--lab-pinned": "#e8962e",
    // Status
    "--lab-good": "#1f7a5a",
    "--lab-warn": "#8f5a00",
    "--lab-bad": "#b8323f",
    "--lab-info": "#7a2d7e",
    "--lab-good-mark": "#2fae7a",
    "--lab-warn-mark": "#f5b441",
    "--lab-alert": "#ff5a4e",
    "--lab-info-mark": "#c2307a",
    "--lab-bad-surface": "#ffe5de",
    "--lab-good-surface": "#e7f7ef",
    // Type
    "--lab-font-ui": "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    "--lab-font-display": "var(--font-fraunces), Georgia, serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    // Shape and depth: generous rounded panels with soft warm shadows
    "--lab-radius-panel": "1.125rem",
    "--lab-radius-card": "0.875rem",
    "--lab-radius-control": "999px",
    "--lab-panel-shadow": "0 1px 0 rgb(255 255 255 / 0.9) inset, 0 12px 28px rgb(122 45 60 / 0.1)",
  },
  css: `
.lab[data-theme="sunset"] {
  color-scheme: light;
  background: var(--lab-bg);
}
.lab[data-theme="sunset"] .lab-panel {
  background: linear-gradient(180deg, #fffdfa 0%, var(--lab-paper) 100%);
  border-color: color-mix(in srgb, #7a2d7e 10%, transparent);
}
.lab[data-theme="sunset"] .lab-panel::before {
  content: "";
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: linear-gradient(90deg, #ff6f5e, #c2307a);
  opacity: 0.85;
  pointer-events: none;
}
.lab[data-theme="sunset"] .lab-btn-primary {
  box-shadow: 0 6px 16px rgb(194 48 122 / 0.28);
  letter-spacing: 0.01em;
}
.lab[data-theme="sunset"] .lab-btn-ghost {
  background: #fffdfa;
}
.lab[data-theme="sunset"] .lab-segmented {
  background: color-mix(in srgb, #7a2d7e 8%, transparent);
}
.lab[data-theme="sunset"] .lab-chip {
  letter-spacing: 0.04em;
}
.lab[data-theme="sunset"] .lab-stamp {
  letter-spacing: 0.18em;
}
.lab[data-theme="sunset"] .lab-scene-label {
  border-radius: 0.6rem;
  border-color: color-mix(in srgb, #7a2d7e 18%, transparent);
  background: linear-gradient(180deg, #fffdfa, #fff3ea);
}
.lab[data-theme="sunset"] .lab-scene-label strong {
  font-family: var(--lab-font-display);
  font-weight: 600;
}
.lab[data-theme="sunset"] .lab-tooltip {
  border-radius: 0.75rem;
}
.lab[data-theme="sunset"] .lab-menu-panel {
  border-radius: 0.875rem;
}
`,
  scene: {
    // Sky, weather and sea
    sky: "#ffc7ad",
    skyStorm: "#7d5b8a",
    cloud: "#fff2e6",
    cloudStorm: "#5e4a72",
    rain: "#f0c4da",
    lightning: "#fff0f6",
    water: "#14a3a8",
    waterFar: "#1d8c9c",
    lagoon: "#6fd0c6",
    foam: "#fff8f0",
    // Land
    sand: "#f3d59a",
    grass: "#a9b65a",
    hill: "#8fa34b",
    leaf: "#5f8a3a",
    trunk: "#7a4f2e",
    road: "#e8c99a",
    plaza: "#f6dcae",
    pad: "#f7e2bd",
    padRing: "#d9a877",
    // Buildings: terracotta roofs on warm cream walls
    cream: "#fff4e4",
    stone: "#eadacb",
    building2: "#e6c3a0",
    vault: "#d9b8c8",
    dock: "#c99d6e",
    chimney: "#a8806a",
    smoke: "#f7ece6",
    window: "#7fd1c8",
    roof: "#c8553d",
    roofOff: "#7e6a86",
    houseOff: "#d7c6cf",
    hull: "#4a2650",
    glass: "#fff7ef",
    lampGlass: "#fff1c4",
    lamp: "#ffd27a",
    beam: "#ffc86b",
    pallet: "#b07d4a",
    gold: "#f2b233",
    carGlass: "#fde9dc",
    cars: ["#e8475e", "#14a3a8", "#f2b233", "#7a2d7e", "#fff6ee", "#3b2456"],
    // Semantic accents
    accent: "#7a2d7e",
    good: "#2fa37a",
    bad: "#e0484f",
    warn: "#f2a424",
    cool: "#6aa8d8",
    focus: "#c2307a",
    // Golden-hour lighting
    ambient: 0.9,
    hemiSky: "#ffe2cc",
    hemiGround: "#c98f6a",
    hemi: 0.9,
    sunColor: "#ffb070",
    sun: 2.2,
    flat: true,
  },
};

export default theme;
