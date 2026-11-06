import type { LabTheme } from "./types.ts";

/** International Typographic Style: white, black, one red for action and "hurts", one green for "helps". */
const theme: LabTheme = {
  id: "swiss",
  name: "Swiss poster",
  description: "International Typographic Style: pure white and black, heavy grotesque numerals, thick top rules, one red for the decision and losses, one green for gains.",
  scheme: "light",
  vars: {
    // Page and surfaces: pure white, no tints
    "--lab-bg": "#ffffff",
    "--lab-paper": "#ffffff",
    "--lab-surface": "#ffffff",
    "--lab-scene-bg": "#ffffff",
    // Ink: pure black, a dark grey for small labels
    "--lab-ink": "#000000",
    "--lab-ink-2": "#333333",
    "--lab-line": "#000000",
    "--lab-line-strong": "#000000",
    // Primary action: the one strong red
    "--lab-accent-from": "#e30613",
    "--lab-accent-to": "#e30613",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#000000",
    // Data series: black scenario, grey reference
    "--lab-scenario": "#000000",
    "--lab-reference": "#8a8a8a",
    "--lab-pinned": "#000000",
    // Status: green helps, red hurts, black otherwise; no tinted backgrounds
    "--lab-good": "#00733a",
    "--lab-warn": "#000000",
    "--lab-bad": "#e30613",
    "--lab-info": "#000000",
    "--lab-good-mark": "#00733a",
    "--lab-warn-mark": "#000000",
    "--lab-alert": "#e30613",
    "--lab-info-mark": "#000000",
    "--lab-bad-surface": "#ffffff",
    "--lab-good-surface": "#ffffff",
    "--lab-good-bg": "transparent",
    "--lab-warn-bg": "transparent",
    "--lab-bad-bg": "transparent",
    "--lab-info-bg": "transparent",
    // Type: one grotesque family, weight does the hierarchy
    "--lab-font-ui": "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
    "--lab-font-display": "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
    "--lab-font-mono": "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
    // Shape and depth: square, flat
    "--lab-radius-panel": "0px",
    "--lab-radius-card": "0px",
    "--lab-radius-control": "0px",
    "--lab-panel-shadow": "none",
  },
  css: `
.lab[data-theme="swiss"] {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #000000;
}
.lab[data-theme="swiss"] * {
  text-shadow: none;
}
.lab[data-theme="swiss"] .lab-panel {
  border: 0;
  border-top: 4px solid #000000;
  border-radius: 0;
  background: #ffffff;
  box-shadow: none;
  padding: 0.9rem 0.2rem 0.9rem 0;
}
.lab[data-theme="swiss"] .game-col {
  background: #ffffff;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-hud {
  background: #ffffff;
  border-bottom: 4px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-scene {
  border: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
  background: #ffffff;
}
.lab[data-theme="swiss"] h1,
.lab[data-theme="swiss"] h2,
.lab[data-theme="swiss"] h3 {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 0.95;
}
.lab[data-theme="swiss"] .game-col-title {
  font-size: 1.7rem;
  font-weight: 900;
  letter-spacing: -0.035em;
  text-transform: none;
  border-bottom: 0;
}
.lab[data-theme="swiss"] .game-eyebrow,
.lab[data-theme="swiss"] .game-subtitle,
.lab[data-theme="swiss"] .game-turn-note,
.lab[data-theme="swiss"] .game-end-note,
.lab[data-theme="swiss"] .game-stance,
.lab[data-theme="swiss"] .lab-slider-label,
.lab[data-theme="swiss"] .game-goal-now,
.lab[data-theme="swiss"] .game-goal-fc,
.lab[data-theme="swiss"] .game-goal-key,
.lab[data-theme="swiss"] .game-masthead {
  font-size: 0.85rem;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: #000000;
}
.lab[data-theme="swiss"] .game-title {
  font-size: clamp(2.6rem, 6vw, 5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.9;
}
.lab[data-theme="swiss"] .game-mission {
  background: none;
  border: 0;
  border-top: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-mission.is-locked {
  opacity: 0.35;
}
.lab[data-theme="swiss"] .game-mission-title {
  font-weight: 900;
  font-size: 1.3rem;
  letter-spacing: -0.02em;
}
.lab[data-theme="swiss"] .game-title-card,
.lab[data-theme="swiss"] .game-briefing {
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-card {
  background: #ffffff;
  border: 0;
  border-top: 4px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-modal-backdrop {
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.lab[data-theme="swiss"] .game-paper,
.lab[data-theme="swiss"] .game-recap {
  background: #ffffff;
  border: 0;
  border-top: 4px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-masthead {
  border: 0;
  border-bottom: 1px solid #000000;
  padding-bottom: 0.4rem;
}
.lab[data-theme="swiss"] .game-headline {
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 900;
  letter-spacing: -0.045em;
  line-height: 0.95;
}
.lab[data-theme="swiss"] .game-stamp {
  display: none;
}
.lab[data-theme="swiss"] .game-recap-stat {
  background: none;
  border: 0;
  border-top: 4px solid #000000;
  border-radius: 0;
  padding: 0.6rem 0 0;
}
.lab[data-theme="swiss"] .game-shock {
  background: none;
  border: 0;
  border-top: 4px solid #e30613;
  border-radius: 0;
  box-shadow: none;
  padding-top: 0.5rem;
}
.lab[data-theme="swiss"] .game-shock-kicker {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.lab[data-theme="swiss"] .game-shock-title {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}
.lab[data-theme="swiss"] .game-choice {
  background: #ffffff;
  border: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
  color: #000000;
}
.lab[data-theme="swiss"] .game-choice:hover {
  background: #000000;
  color: #ffffff;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-outcome {
  background: none;
  border: 0;
  border-radius: 0;
  padding: 0;
  font-weight: 900;
  color: #000000;
}
.lab[data-theme="swiss"] .game-outcome.is-good {
  color: #00733a;
}
.lab[data-theme="swiss"] .game-outcome.is-bad {
  color: #e30613;
}
.lab[data-theme="swiss"] .game-goal {
  background: none;
  border: 0;
  border-top: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-goal-title {
  font-weight: 900;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}
.lab[data-theme="swiss"] .game-goal-value {
  font-size: 3.4rem;
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.9;
}
.lab[data-theme="swiss"] .lab-slider-value {
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
}
.lab[data-theme="swiss"] .game-status {
  background: none;
  border-radius: 0;
  padding: 0;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 900;
  text-align: left;
  color: #000000;
}
.lab[data-theme="swiss"] .game-status.is-met,
.lab[data-theme="swiss"] .game-status.is-on-track {
  color: #00733a;
}
.lab[data-theme="swiss"] .game-status.is-at-risk {
  color: #000000;
  text-decoration: underline;
  text-decoration-thickness: 3px;
  text-underline-offset: 3px;
}
.lab[data-theme="swiss"] .game-status.is-failed {
  color: #e30613;
}
.lab[data-theme="swiss"] .game-move-chip {
  background: none;
  border: 0;
  border-radius: 0;
  padding: 0;
  font-weight: 900;
  color: #000000;
}
.lab[data-theme="swiss"] .game-move-chip.is-good {
  color: #00733a;
}
.lab[data-theme="swiss"] .game-move-chip.is-bad {
  color: #e30613;
}
.lab[data-theme="swiss"] .game-counter {
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  color: #000000;
  font-weight: 900;
  font-size: 1.2rem;
}
.lab[data-theme="swiss"] .game-progress-track span {
  background: #ffffff;
  border: 1px solid #000000;
  border-radius: 0;
}
.lab[data-theme="swiss"] .game-progress-track span.is-done {
  background: #000000;
}
.lab[data-theme="swiss"] .game-progress-track span.is-now {
  background: #e30613;
  border-color: #e30613;
}
.lab[data-theme="swiss"] .game-agenda {
  background: none;
  border: 0;
  border-top: 4px solid #000000;
  border-radius: 0;
  box-shadow: none;
  padding: 0.6rem 0 0;
}
.lab[data-theme="swiss"] .game-agenda strong {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}
.lab[data-theme="swiss"] .game-agenda li.is-warn::before {
  color: #e30613;
}
.lab[data-theme="swiss"] .game-agenda li.is-info::before {
  color: #000000;
}
.lab[data-theme="swiss"] .game-coach {
  background: none;
  border: 0;
  border-top: 1px solid #000000;
  border-radius: 0;
  box-shadow: none;
  padding-top: 0.5rem;
}
.lab[data-theme="swiss"] .game-lever {
  background: none;
  border: 0;
  border-top: 1px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-lever-group h3 {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.lab[data-theme="swiss"] .lab-range::-webkit-slider-runnable-track {
  height: 4px;
  background: #000000;
  border: 0;
  border-radius: 0;
}
.lab[data-theme="swiss"] .lab-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 28px;
  margin-top: -12px;
  background: #e30613;
  border: 0;
  border-radius: 0;
}
.lab[data-theme="swiss"] .lab-range::-moz-range-track {
  height: 4px;
  background: #000000;
  border: 0;
  border-radius: 0;
}
.lab[data-theme="swiss"] .lab-range::-moz-range-thumb {
  width: 20px;
  height: 28px;
  background: #e30613;
  border: 0;
  border-radius: 0;
}
.lab[data-theme="swiss"] .lab-btn {
  border-radius: 0;
  box-shadow: none;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}
.lab[data-theme="swiss"] .lab-btn-primary,
.lab[data-theme="swiss"] .game-end-btn,
.lab[data-theme="swiss"] .game-cta {
  background: #e30613;
  background-image: none;
  color: #ffffff;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  font-weight: 900;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  transform: none;
  filter: none;
}
.lab[data-theme="swiss"] .lab-btn-primary:not(:disabled):hover,
.lab[data-theme="swiss"] .game-end-btn:not(:disabled):hover,
.lab[data-theme="swiss"] .game-cta:hover {
  background: #b8040f;
  box-shadow: none;
  transform: none;
  filter: none;
}
.lab[data-theme="swiss"] .game-end-btn:disabled {
  opacity: 0.4;
  background: #e30613;
  color: #ffffff;
}
.lab[data-theme="swiss"] .lab-btn-soft,
.lab[data-theme="swiss"] .lab-btn-ghost,
.lab[data-theme="swiss"] .game-skip-btn,
.lab[data-theme="swiss"] .game-fw-open {
  background: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
  font-weight: 800;
}
.lab[data-theme="swiss"] .lab-btn-soft:hover,
.lab[data-theme="swiss"] .lab-btn-ghost:hover,
.lab[data-theme="swiss"] .game-skip-btn:hover,
.lab[data-theme="swiss"] .game-fw-open:hover {
  background: #000000;
  color: #ffffff;
}
.lab[data-theme="swiss"] .lab-segmented {
  border: 2px solid #000000;
  border-radius: 0;
  background: #ffffff;
  box-shadow: none;
}
.lab[data-theme="swiss"] .lab-segmented button {
  border-radius: 0;
  color: #000000;
  font-weight: 700;
}
.lab[data-theme="swiss"] .lab-segmented button.is-active {
  background: #000000;
  color: #ffffff;
}
.lab[data-theme="swiss"] .game-fw-tabs button {
  background: #ffffff;
  border: 0;
  border-top: 4px solid #ffffff;
  border-radius: 0;
  box-shadow: none;
  color: #000000;
}
.lab[data-theme="swiss"] .game-fw-tabs button.is-on {
  border-top-color: #000000;
  background: #ffffff;
  color: #000000;
  font-weight: 900;
}
.lab[data-theme="swiss"] .game-fw-tab-n {
  background: none;
  border: 0;
  border-radius: 0;
  font-size: 1.8rem;
  font-weight: 900;
  line-height: 1;
  color: #000000;
}
.lab[data-theme="swiss"] .game-fw-note {
  background: none;
  border: 0;
  border-top: 4px solid #000000;
  border-radius: 0;
  box-shadow: none;
  padding-top: 0.5rem;
}
.lab[data-theme="swiss"] .game-fw-note.is-warn {
  border-top-color: #e30613;
}
.lab[data-theme="swiss"] .game-fw-note strong {
  font-weight: 900;
}
.lab[data-theme="swiss"] .game-fw-tile,
.lab[data-theme="swiss"] .game-fw-channel {
  background: #ffffff;
  border: 0;
  border-top: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-fw-pill {
  background: #ffffff;
  border: 0;
  border-bottom: 3px solid #000000;
  border-radius: 0;
  color: #000000;
  font-weight: 800;
}
.lab[data-theme="swiss"] .game-fw-effect {
  font-weight: 900;
}
.lab[data-theme="swiss"] .game-fw-effect.is-up,
.lab[data-theme="swiss"] .game-fw-effect.is-down {
  color: #000000;
}
.lab[data-theme="swiss"] .game-dc {
  background: #ffffff;
  border: 0;
  border-top: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .game-dc-metrics button {
  background: none;
  border: 0;
  border-radius: 0;
  color: #000000;
  font-weight: 700;
}
.lab[data-theme="swiss"] .game-fw-table th,
.lab[data-theme="swiss"] .lab-table thead th {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 700;
  font-size: 0.85rem;
  color: #000000;
}
.lab[data-theme="swiss"] .game-fw-table th,
.lab[data-theme="swiss"] .game-fw-table td,
.lab[data-theme="swiss"] .lab-table th,
.lab[data-theme="swiss"] .lab-table td {
  border-color: #000000;
}
.lab[data-theme="swiss"] .lab-tile {
  background: #ffffff;
  border: 0;
  border-top: 4px solid #000000;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"] .lab-chip {
  background: none;
  border: 0;
  border-radius: 0;
  padding: 0;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 800;
  color: #000000;
}
.lab[data-theme="swiss"] .lab-scene-label {
  background: #ffffff;
  border: 2px solid #000000;
  border-radius: 0;
  box-shadow: none;
  color: #000000;
}
.lab[data-theme="swiss"] .game-advice {
  background: none;
  border: 0;
  border-top: 1px solid #000000;
  border-radius: 0;
  box-shadow: none;
  padding: 0.6rem 0;
}
.lab[data-theme="swiss"] .game-portrait {
  border-radius: 0;
  filter: grayscale(1) contrast(1.1);
}
.lab[data-theme="swiss"] .game-log {
  background: none;
  border: 0;
  border-radius: 0;
}
.lab[data-theme="swiss"] .game-why-bar {
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="swiss"].game {
  --dc-1: #000000;
  --dc-4: #8a8a8a;
  --dc-momentum: #bdbdbd;
}
`,
  scene: {
    // Flat poster island: white sky and land, black sea, grey terrain, red accents
    sky: "#ffffff",
    skyStorm: "#8a8a8a",
    cloud: "#ffffff",
    cloudStorm: "#4d4d4d",
    rain: "#bdbdbd",
    lightning: "#ffffff",
    water: "#000000",
    waterFar: "#1a1a1a",
    lagoon: "#3d3d3d",
    foam: "#ffffff",
    sand: "#e6e6e6",
    grass: "#bfbfbf",
    hill: "#a6a6a6",
    leaf: "#6e6e6e",
    trunk: "#1a1a1a",
    road: "#ffffff",
    plaza: "#f2f2f2",
    pad: "#f2f2f2",
    padRing: "#000000",
    cream: "#ffffff",
    stone: "#d4d4d4",
    building2: "#3d3d3d",
    vault: "#e0e0e0",
    dock: "#8c8c8c",
    chimney: "#1a1a1a",
    smoke: "#ffffff",
    window: "#000000",
    roof: "#000000",
    roofOff: "#9a9a9a",
    houseOff: "#cccccc",
    hull: "#000000",
    glass: "#ffffff",
    lampGlass: "#ffffff",
    lamp: "#ffffff",
    beam: "#ffffff",
    pallet: "#8c8c8c",
    gold: "#000000",
    carGlass: "#ffffff",
    cars: ["#000000", "#8a8a8a", "#ffffff", "#e30613"],
    accent: "#e30613",
    good: "#00733a",
    bad: "#e30613",
    warn: "#e30613",
    cool: "#5c5c5c",
    focus: "#000000",
    ambient: 0.9,
    hemiSky: "#ffffff",
    hemiGround: "#bfbfbf",
    hemi: 0.8,
    sunColor: "#ffffff",
    sun: 1.4,
    flat: true,
    plains: "#d0d0d0",
    forestFloor: "#8c8c8c",
    deep: "#000000",
    shallow: "#4d4d4d",
    rock: "#6e6e6e",
    snow: "#ffffff",
    river: "#1a1a1a",
    fieldA: "#e6e6e6",
    fieldB: "#b3b3b3",
    border: "#000000",
    wall: "#f2f2f2",
    districts: ["#000000", "#8a8a8a", "#e30613", "#3d3d3d", "#cccccc", "#1a1a1a", "#bfbfbf", "#ffffff", "#5c5c5c"],
  },
};

export default theme;
