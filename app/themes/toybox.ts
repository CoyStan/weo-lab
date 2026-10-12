import type { LabTheme } from "./types.ts";

/** Cosy city-builder toy box: sky-blue table, chunky white panels, pressable pill buttons, candy-coloured island. */
const theme: LabTheme = {
  id: "toybox",
  name: "Toybox",
  description: "A cheerful game-like sim: sky-blue table, chunky white panels with bold borders and a bright, flat-shaded toy island.",
  scheme: "light",
  vars: {
    /* Page and surfaces */
    "--lab-bg": "#bfe7ff",
    "--lab-paper": "#ffffff",
    "--lab-surface": "#f7fbff",
    "--lab-scene-bg": "linear-gradient(180deg, #7ed8ff 0%, #c4ecff 62%, #fff3c4 100%)",
    /* Ink */
    "--lab-ink": "#0d2e5c",
    "--lab-ink-2": "#3d5a80",
    "--lab-line": "color-mix(in srgb, #0d2e5c 12%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #0d2e5c 26%, transparent)",
    /* Accent and focus */
    "--lab-accent-from": "#4da3ff",
    "--lab-accent-to": "#1f63d6",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#ff8a00",
    /* Data series: blue scenario vs orange reference */
    "--lab-scenario": "#1f6fe0",
    "--lab-reference": "#f26b10",
    "--lab-pinned": "#17b26a",
    /* Status */
    "--lab-good": "#1e8f3f",
    "--lab-warn": "#b86e00",
    "--lab-bad": "#d92d2d",
    "--lab-info": "#1b8fd0",
    "--lab-good-mark": "#36c46a",
    "--lab-warn-mark": "#ffc21a",
    "--lab-alert": "#ff4d4d",
    "--lab-info-mark": "#2aa7e0",
    "--lab-bad-surface": "#ffe9e6",
    "--lab-good-surface": "#e6fbee",
    /* Type */
    "--lab-font-ui": "var(--font-inter), system-ui, \"Helvetica Neue\", Arial, sans-serif",
    "--lab-font-display": "var(--font-inter), system-ui, \"Helvetica Neue\", Arial, sans-serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    /* Shape and depth */
    "--lab-radius-panel": "26px",
    "--lab-radius-card": "20px",
    "--lab-radius-control": "999px",
    "--lab-panel-shadow": "0 5px 0 #9ad2f2, 0 12px 24px rgb(12 60 120 / 0.16)",
  },
  css: `
.lab[data-theme="toybox"] .lab-panel {
  border: 3px solid #a9dcf8;
  border-radius: 26px;
}
.lab[data-theme="toybox"] .lab-tile,
.lab[data-theme="toybox"] .lab-chart {
  border: 2px solid #c8e9fb;
  border-radius: 20px;
}
.lab[data-theme="toybox"] .lab-font-display,
.lab[data-theme="toybox"] .font-display {
  font-weight: 800;
}
.lab[data-theme="toybox"] .lab-btn {
  border-width: 2px;
  letter-spacing: 0.01em;
}
.lab[data-theme="toybox"] .lab-btn-primary {
  border-color: #15479f;
  box-shadow: 0 4px 0 #15479f;
}
.lab[data-theme="toybox"] .lab-btn-primary:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #15479f;
}
.lab[data-theme="toybox"] .lab-btn-ghost {
  border-color: #a9dcf8;
  box-shadow: 0 4px 0 #a9dcf8;
}
.lab[data-theme="toybox"] .lab-btn-ghost:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #a9dcf8;
}
.lab[data-theme="toybox"] .lab-btn-soft {
  box-shadow: 0 3px 0 color-mix(in srgb, #0d2e5c 16%, transparent);
}
.lab[data-theme="toybox"] .lab-chip {
  border: 2px solid currentColor;
}
.lab[data-theme="toybox"] .lab-scene-label {
  border: 2px solid #ffffff;
  border-radius: 0.8rem;
  font-weight: 800;
  box-shadow: 0 3px 0 rgb(12 60 120 / 0.22);
}
.lab[data-theme="toybox"] .lab-scene-label strong {
  font-weight: 900;
}
.lab[data-theme="toybox"] .lab-scene-label.is-focus {
  border-color: #1f6fe0;
}
`,
  scene: {
    sky: "#7ed8ff",
    skyStorm: "#8fa3b8",
    cloud: "#ffffff",
    cloudStorm: "#6f7f96",
    rain: "#d5ecff",
    lightning: "#ffffff",
    water: "#1e9be8",
    waterFar: "#3aaef0",
    lagoon: "#5fd3f2",
    foam: "#ffffff",
    sand: "#ffe27a",
    grass: "#6ddb5a",
    hill: "#4cc257",
    leaf: "#2fa64a",
    trunk: "#9a6a3c",
    road: "#8e9aa8",
    plaza: "#fff0b8",
    pad: "#ffffff",
    padRing: "#ffb830",
    cream: "#fff8e8",
    stone: "#f2e6cf",
    building2: "#ffd6a8",
    vault: "#c9b8ff",
    dock: "#d9a86a",
    chimney: "#ff7a59",
    smoke: "#ffffff",
    window: "#7fe3ff",
    roof: "#ff4d4d",
    roofOff: "#9aa3b5",
    houseOff: "#d5d9e6",
    hull: "#2b3b8f",
    glass: "#e9fbff",
    lampGlass: "#fff8c4",
    lamp: "#ffe066",
    beam: "#ffe066",
    pallet: "#e0b070",
    gold: "#ffc21a",
    carGlass: "#d6f3ff",
    cars: ["#ff3b30", "#ffd60a", "#2979ff", "#ff7a1a", "#ffffff"],
    accent: "#1f63d6",
    good: "#1e8f3f",
    bad: "#e8332a",
    warn: "#ffb000",
    cool: "#4fb3ff",
    focus: "#1f6fe0",
    ambient: 1.1,
    hemiSky: "#ffffff",
    hemiGround: "#ffe9a8",
    hemi: 1.0,
    sunColor: "#fff6d8",
    sun: 2.4,
    flat: true,
  },
};

export default theme;
