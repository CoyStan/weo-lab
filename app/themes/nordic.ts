import type { LabTheme } from "./types.ts";

/** Scandinavian calm: cool off-white surfaces, charcoal ink, muted pastel data and a pale winter island. */
const theme: LabTheme = {
  id: "nordic",
  name: "Nordic minimal",
  description: "Cool off-white and charcoal with muted pastel data and a pale winter island, almost no shadows.",
  scheme: "light",
  vars: {
    // Page and surfaces
    "--lab-bg": "#f2f4f5",
    "--lab-paper": "#fafbfb",
    "--lab-surface": "#ffffff",
    "--lab-scene-bg": "linear-gradient(180deg, #e7edf2 0%, #eef2f5 55%, #f4f5f4 100%)",
    // Ink
    "--lab-ink": "#1f2328",
    "--lab-ink-2": "#5a6068",
    "--lab-line": "color-mix(in srgb, #1f2328 8%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #1f2328 16%, transparent)",
    // Accent (primary buttons) and focus
    "--lab-accent-from": "#4a5562",
    "--lab-accent-to": "#1f2328",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#5d7fa3",
    // Data series: dusty blue scenario, muted terracotta reference
    "--lab-scenario": "#4f73a0",
    "--lab-reference": "#b8735b",
    "--lab-pinned": "#4f9a7a",
    // Status
    "--lab-good": "#3d7558",
    "--lab-warn": "#7d6024",
    "--lab-bad": "#a64f45",
    "--lab-info": "#4f6d8a",
    "--lab-good-mark": "#6fa584",
    "--lab-warn-mark": "#d4ae5e",
    "--lab-alert": "#c46f62",
    "--lab-info-mark": "#5d7fa3",
    "--lab-good-bg": "color-mix(in srgb, #6fa584 12%, transparent)",
    "--lab-warn-bg": "color-mix(in srgb, #d4ae5e 16%, transparent)",
    "--lab-bad-bg": "color-mix(in srgb, #c46f62 13%, transparent)",
    "--lab-info-bg": "color-mix(in srgb, #5d7fa3 12%, transparent)",
    "--lab-bad-surface": "#f8efed",
    "--lab-good-surface": "#eef5f0",
    // Type: Inter everywhere, display is Inter with heavier weight in css
    "--lab-font-ui": "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    "--lab-font-display": "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    // Shape and depth: generous rounding, almost no shadow
    "--lab-radius-panel": "20px",
    "--lab-radius-card": "14px",
    "--lab-radius-control": "999px",
    "--lab-panel-shadow": "0 1px 2px color-mix(in srgb, #1f2328 4%, transparent)",
  },
  css: `
.lab[data-theme="nordic"] {
  letter-spacing: 0.005em;
}
.lab[data-theme="nordic"] .font-display {
  font-weight: 650;
  letter-spacing: -0.02em;
}
.lab[data-theme="nordic"] .lab-panel {
  background-image: linear-gradient(180deg, #ffffff 0%, #fafbfb 100%);
}
.lab[data-theme="nordic"] .lab-chart,
.lab[data-theme="nordic"] .lab-tile {
  background: #ffffff;
}
.lab[data-theme="nordic"] .lab-btn-primary {
  box-shadow: none;
  letter-spacing: 0.01em;
}
.lab[data-theme="nordic"] .lab-btn-ghost {
  background: #ffffff;
}
.lab[data-theme="nordic"] .lab-segmented {
  background: color-mix(in srgb, #1f2328 5%, transparent);
  border-color: transparent;
}
.lab[data-theme="nordic"] .lab-chip {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.6rem;
}
.lab[data-theme="nordic"] .lab-table thead th {
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.64rem;
}
.lab[data-theme="nordic"] .lab-scene-label {
  letter-spacing: 0.03em;
  border-radius: 0.5rem;
  box-shadow: none;
  background: color-mix(in srgb, #ffffff 90%, transparent);
}
.lab[data-theme="nordic"] .lab-scene-label strong {
  font-weight: 650;
}
.lab[data-theme="nordic"] .lab-stamp {
  letter-spacing: 0.2em;
  border-radius: 0.6rem;
}
.lab[data-theme="nordic"] .lab-tooltip,
.lab[data-theme="nordic"] .lab-menu-panel {
  box-shadow: 0 4px 14px color-mix(in srgb, #1f2328 7%, transparent);
  border-radius: 14px;
}
`,
  scene: {
    // Sky, weather and sea: pale grey-blue sky, slate-grey water
    sky: "#e6edf3",
    skyStorm: "#9aa4b0",
    cloud: "#ffffff",
    cloudStorm: "#6b737d",
    rain: "#d3dde6",
    lightning: "#eef3f8",
    water: "#7d8c99",
    waterFar: "#8e9ba6",
    lagoon: "#b3c0ca",
    foam: "#ffffff",
    // Land: pale sage with light snow-like sand
    sand: "#ebe9e2",
    grass: "#cbd8c5",
    hill: "#b6c8b1",
    leaf: "#7f9c84",
    trunk: "#6e655c",
    road: "#d5d8db",
    plaza: "#eceded",
    pad: "#f0f2f3",
    padRing: "#bcc2c8",
    // Buildings: white and pale grey with charcoal roofs
    cream: "#f8f8f6",
    stone: "#e7e8e9",
    building2: "#d8dbde",
    vault: "#dfe3e9",
    dock: "#c3c8cd",
    chimney: "#5d646c",
    smoke: "#f1f2f3",
    window: "#a9bccb",
    roof: "#3b4149",
    roofOff: "#8c939b",
    houseOff: "#cfd3d8",
    hull: "#3a4550",
    glass: "#ffffff",
    lampGlass: "#fffdf4",
    lamp: "#f6f0d8",
    beam: "#f3ebd2",
    pallet: "#b9b4a9",
    gold: "#b89c62",
    carGlass: "#dfe7ee",
    cars: ["#4f73a0", "#b8735b", "#e6e4df", "#3d7558", "#3a4550"],
    // Semantic accents
    accent: "#3a4550",
    good: "#3d7558",
    bad: "#a64f45",
    warn: "#b8923a",
    cool: "#8fa9c4",
    focus: "#5d7fa3",
    // Soft, even lighting with smooth shading
    ambient: 1.1,
    hemiSky: "#f5f8fb",
    hemiGround: "#c9cdd1",
    hemi: 1.0,
    sunColor: "#ffffff",
    sun: 1.1,
    flat: false,
  },
};

export default theme;
