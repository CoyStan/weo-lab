import type { LabTheme } from "./types.ts";

/** Confidential briefing dossier: manila folders, cool paper, typed figures, carbon blue, red pencil. */
const theme: LabTheme = {
  id: "dossier",
  name: "Confidential dossier",
  description: "A confidential briefing file: manila folder tabs, cool off-white paper, typed figures, carbon-blue data, red-pencil problems and an ochre survey island.",
  scheme: "light",
  vars: {
    // Desk, folders and paper
    "--lab-bg": "#c8b488",
    "--lab-paper": "#e7dbb9",
    "--lab-surface": "#f2f3ee",
    "--lab-scene-bg": "#d6dbd6",
    // Ink: near-black navy for type and rules
    "--lab-ink": "#1c2230",
    "--lab-ink-2": "#4a5160",
    "--lab-line": "color-mix(in srgb, #1c2230 20%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #1c2230 42%, transparent)",
    // Primary button: solid dark-navy block
    "--lab-accent-from": "#1d2b4a",
    "--lab-accent-to": "#1d2b4a",
    "--lab-on-accent": "#f2f3ee",
    "--lab-focus": "#2b5c9a",
    // Data: carbon blue for the scenario, pencil grey for the reference
    "--lab-scenario": "#1f4f8f",
    "--lab-reference": "#6e6a62",
    "--lab-pinned": "#8a5e12",
    // Status: green ink (helps), red pencil (hurts), amber for risk
    "--lab-good": "#2e6b3b",
    "--lab-warn": "#8a5a10",
    "--lab-bad": "#a8281f",
    "--lab-info": "#2b5a8c",
    "--lab-good-mark": "#3f8a4f",
    "--lab-warn-mark": "#c28a1c",
    "--lab-alert": "#b8322a",
    "--lab-info-mark": "#2b5a8c",
    "--lab-bad-surface": "#f1dfd6",
    "--lab-good-surface": "#e0ebdc",
    "--lab-good-bg": "color-mix(in srgb, #3f8a4f 12%, transparent)",
    "--lab-warn-bg": "color-mix(in srgb, #c28a1c 16%, transparent)",
    "--lab-bad-bg": "color-mix(in srgb, #b8322a 12%, transparent)",
    "--lab-info-bg": "color-mix(in srgb, #2b5a8c 10%, transparent)",
    // Type: Georgia for prose and headings, Courier for labels and figures
    "--lab-font-ui": "Georgia, \"Iowan Old Style\", \"Times New Roman\", serif",
    "--lab-font-display": "Georgia, \"Iowan Old Style\", \"Times New Roman\", serif",
    "--lab-font-mono": "\"Courier New\", Courier, ui-monospace, monospace",
    // Shape and depth: square, flat, no shadows
    "--lab-radius-panel": "2px",
    "--lab-radius-card": "2px",
    "--lab-radius-control": "2px",
    "--lab-panel-shadow": "none",
  },
  css: `
/* Desk: manila with a faint dot grain */
.lab[data-theme="dossier"] {
  background-color: var(--lab-bg);
  background-image: radial-gradient(color-mix(in srgb, #1c2230 9%, transparent) 0.6px, transparent 0.9px);
  background-size: 5px 5px;
}

/* Folder panels: buff card stock with a faint grain */
.lab[data-theme="dossier"] .lab-panel {
  border: 1px solid var(--lab-line-strong);
  border-top: 3px solid var(--lab-ink);
  background-color: var(--lab-paper);
  background-image: radial-gradient(color-mix(in srgb, #1c2230 5%, transparent) 0.6px, transparent 0.9px);
  background-size: 4px 4px;
  box-shadow: none;
}

/* Headings: serif prose; section heads read as folder tabs */
.lab[data-theme="dossier"] h1,
.lab[data-theme="dossier"] h2,
.lab[data-theme="dossier"] h3,
.lab[data-theme="dossier"] .game-title,
.lab[data-theme="dossier"] .game-headline,
.lab[data-theme="dossier"] .game-goal-title,
.lab[data-theme="dossier"] .game-masthead {
  font-family: var(--lab-font-display);
  letter-spacing: 0;
}
.lab[data-theme="dossier"] .game-col-title {
  display: inline-block;
  position: relative;
  top: 1px;
  margin: 0 0 0.6rem;
  padding: 0.2rem 0.75rem 0.25rem;
  border: 1px solid var(--lab-line-strong);
  border-bottom: 0;
  border-radius: 2px 2px 0 0;
  background: var(--lab-surface);
  font-size: 1.02rem;
  font-weight: 700;
}
.lab[data-theme="dossier"] .game-eyebrow {
  font-family: var(--lab-font-mono);
  font-size: 0.78rem;
  text-transform: none;
  letter-spacing: 0.01em;
  color: var(--lab-ink-2);
}
.lab[data-theme="dossier"] .game-title-card {
  border: 1px solid var(--lab-line-strong);
  border-top: 3px solid var(--lab-ink);
  border-radius: 2px;
  background: var(--lab-surface);
  box-shadow: none;
}

/* Typed figures and labels */
.lab[data-theme="dossier"] .lab-slider-label,
.lab[data-theme="dossier"] .game-lever-group h3,
.lab[data-theme="dossier"] .game-goal-now,
.lab[data-theme="dossier"] .game-goal-fc,
.lab[data-theme="dossier"] .game-end-note,
.lab[data-theme="dossier"] .game-turn-note {
  font-family: var(--lab-font-mono);
  font-variant-numeric: lining-nums tabular-nums;
}
.lab[data-theme="dossier"] .lab-slider-label,
.lab[data-theme="dossier"] .game-lever-group h3 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--lab-ink);
}
.lab[data-theme="dossier"] .lab-slider-value,
.lab[data-theme="dossier"] .game-goal-value {
  font-family: var(--lab-font-mono);
  font-weight: 700;
  font-variant-numeric: lining-nums tabular-nums;
  color: var(--lab-scenario);
}
.lab[data-theme="dossier"] .game-goal-value {
  letter-spacing: -0.02em;
}

/* Status: typed marks in square brackets, not pills */
.lab[data-theme="dossier"] .game-status {
  min-width: 0;
  padding: 0;
  border-radius: 0;
  background: none;
  font-family: var(--lab-font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  word-spacing: normal;
}
.lab[data-theme="dossier"] .game-status::before { content: "["; }
.lab[data-theme="dossier"] .game-status::after { content: "]"; }
.lab[data-theme="dossier"] .game-status.is-met,
.lab[data-theme="dossier"] .game-status.is-on-track {
  background: none;
  color: var(--lab-good);
}
.lab[data-theme="dossier"] .game-status.is-at-risk {
  background: none;
  color: var(--lab-warn);
}
.lab[data-theme="dossier"] .game-status.is-failed {
  background: none;
  color: var(--lab-bad);
}
.lab[data-theme="dossier"] .lab-chip {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  font-family: var(--lab-font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--lab-ink-2);
}
.lab[data-theme="dossier"] .lab-chip::before { content: "["; }
.lab[data-theme="dossier"] .lab-chip::after { content: "]"; }
.lab[data-theme="dossier"] .lab-chip-good { background: none; color: var(--lab-good); }
.lab[data-theme="dossier"] .lab-chip-warn { background: none; color: var(--lab-warn); }
.lab[data-theme="dossier"] .lab-chip-bad { background: none; color: var(--lab-bad); }
.lab[data-theme="dossier"] .lab-chip-info { background: none; color: var(--lab-info); }
.lab[data-theme="dossier"] .lab-chip-neutral { background: none; color: var(--lab-ink-2); }

/* Helps (green ink) and hurts (red pencil): plain text, no tint */
.lab[data-theme="dossier"] .game-move-chip {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  font-family: var(--lab-font-mono);
  font-weight: 700;
}
.lab[data-theme="dossier"] .game-move-chip.is-good { background: none; color: var(--lab-good); }
.lab[data-theme="dossier"] .game-move-chip.is-bad { background: none; color: var(--lab-bad); }

/* Callouts: ruled memo boxes, red pencil for problems. No tints, no coloured side borders */
.lab[data-theme="dossier"] .game-agenda {
  max-width: none;
  background: none;
  border: 1px solid var(--lab-line-strong);
  border-top: 3px solid var(--lab-alert);
  border-radius: 2px;
  padding: 0.5rem 0.65rem;
}
.lab[data-theme="dossier"] .game-agenda strong {
  font-family: var(--lab-font-display);
}
.lab[data-theme="dossier"] .game-agenda li.is-warn::before { background: var(--lab-alert); }
.lab[data-theme="dossier"] .game-agenda li.is-info::before { background: var(--lab-info); }
.lab[data-theme="dossier"] .game-coach {
  background: none;
  border: 0;
  border-top: 1px dashed var(--lab-line-strong);
  border-radius: 0;
  padding: 0.5rem 0 0;
}
.lab[data-theme="dossier"] .game-fw-note {
  background: none;
  border: 1px solid var(--lab-line-strong);
  border-radius: 2px;
  box-shadow: none;
}
.lab[data-theme="dossier"] .game-fw-note.is-warn {
  border-color: var(--lab-alert);
  border-top-width: 3px;
}
.lab[data-theme="dossier"] .game-outcome {
  background: none;
  border: 1px solid var(--lab-line-strong);
  border-top-width: 3px;
  border-radius: 2px;
}
.lab[data-theme="dossier"] .game-outcome.is-good { border-top-color: var(--lab-good); }
.lab[data-theme="dossier"] .game-outcome.is-bad { border-top-color: var(--lab-alert); }

/* Buttons: solid navy primary, ruled secondary, square corners */
.lab[data-theme="dossier"] .lab-btn {
  font-family: var(--lab-font-mono);
  font-weight: 700;
  border-radius: 2px;
}
.lab[data-theme="dossier"] .lab-btn-primary,
.lab[data-theme="dossier"] .game-end-btn {
  background: var(--lab-accent-to);
  color: var(--lab-on-accent);
  border-radius: 2px;
  box-shadow: none;
  filter: none;
}
.lab[data-theme="dossier"] .lab-btn-primary:not(:disabled):hover,
.lab[data-theme="dossier"] .game-end-btn:not(:disabled):hover {
  background: #2a3d63;
  box-shadow: none;
  filter: none;
  transform: none;
}
.lab[data-theme="dossier"] .game-end-btn:not(:disabled):active {
  background: #141d32;
  transform: none;
}
.lab[data-theme="dossier"] .game-end-btn {
  font-family: var(--lab-font-mono);
  font-weight: 700;
  border: 1px solid var(--lab-ink);
  border-radius: 2px;
}
.lab[data-theme="dossier"] .game-end-btn kbd,
.lab[data-theme="dossier"] .lab-kbd {
  border-radius: 0;
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .lab-btn-soft,
.lab[data-theme="dossier"] .lab-btn-ghost,
.lab[data-theme="dossier"] .game-skip-btn,
.lab[data-theme="dossier"] .game-fw-open {
  background: var(--lab-surface);
  color: var(--lab-ink);
  border: 1px solid var(--lab-line-strong);
  border-radius: 2px;
  box-shadow: none;
}
.lab[data-theme="dossier"] .lab-btn-soft:not(:disabled):hover,
.lab[data-theme="dossier"] .lab-btn-ghost:not(:disabled):hover,
.lab[data-theme="dossier"] .game-skip-btn:not(:disabled):hover,
.lab[data-theme="dossier"] .game-fw-open:not(:disabled):hover {
  border-color: var(--lab-ink);
  background: var(--lab-paper);
}
.lab[data-theme="dossier"] .lab-segmented {
  border-radius: 2px;
  border: 1px solid var(--lab-line-strong);
}
.lab[data-theme="dossier"] .lab-segmented button {
  border-radius: 0;
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .lab-segmented button.is-active {
  background: var(--lab-accent-to);
  color: var(--lab-on-accent);
}

/* Lever slider: a ruled line with a square navy block for the thumb */
.lab[data-theme="dossier"] .lab-range::-webkit-slider-runnable-track {
  height: 2px;
  border-radius: 0;
  background: linear-gradient(to right, var(--lab-scenario) 0 var(--pct, 0%), color-mix(in srgb, var(--lab-ink) 40%, transparent) var(--pct, 0%) 100%);
}
.lab[data-theme="dossier"] .lab-range::-webkit-slider-thumb {
  width: 14px;
  height: 20px;
  margin-top: -9px;
  border: 0;
  border-radius: 0;
  background: var(--lab-accent-to);
  box-shadow: none;
}
.lab[data-theme="dossier"] .lab-range::-moz-range-track {
  height: 2px;
  border-radius: 0;
  background: color-mix(in srgb, var(--lab-ink) 40%, transparent);
}
.lab[data-theme="dossier"] .lab-range::-moz-range-progress {
  height: 2px;
  border-radius: 0;
  background: var(--lab-scenario);
}
.lab[data-theme="dossier"] .lab-range::-moz-range-thumb {
  width: 14px;
  height: 20px;
  border: 0;
  border-radius: 0;
  background: var(--lab-accent-to);
  box-shadow: none;
}

/* Goals: ruled cards */
.lab[data-theme="dossier"] .game-goal {
  border: 1px solid var(--lab-line-strong);
  border-radius: 2px;
  background: var(--lab-surface);
  box-shadow: none;
}
.lab[data-theme="dossier"] .game-goal.is-at-risk {
  border-color: var(--lab-warn-mark);
}
.lab[data-theme="dossier"] .game-goal.is-failed {
  border-color: var(--lab-alert);
}
.lab[data-theme="dossier"] .game-fw-pill,
.lab[data-theme="dossier"] .lab-tile,
.lab[data-theme="dossier"] .game-fw-tile,
.lab[data-theme="dossier"] .game-fw-channel,
.lab[data-theme="dossier"] .game-advice,
.lab[data-theme="dossier"] .game-choice,
.lab[data-theme="dossier"] .game-counter,
.lab[data-theme="dossier"] .lab-scene-label,
.lab[data-theme="dossier"] .lab-tooltip,
.lab[data-theme="dossier"] .game-card,
.lab[data-theme="dossier"] .game-dc {
  border-radius: 2px;
  box-shadow: none;
}
.lab[data-theme="dossier"] .lab-tile,
.lab[data-theme="dossier"] .game-fw-tile,
.lab[data-theme="dossier"] .game-fw-channel,
.lab[data-theme="dossier"] .game-advice,
.lab[data-theme="dossier"] .game-card {
  border: 1px solid var(--lab-line-strong);
  background: var(--lab-surface);
}
.lab[data-theme="dossier"] .lab-tile.is-breach {
  border-color: var(--lab-alert);
}
.lab[data-theme="dossier"] .game-fw-pill {
  background: none;
  border: 1px solid var(--lab-line-strong);
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .game-counter {
  background: none;
  border: 1px solid var(--lab-line-strong);
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .lab-scene-label {
  border: 1px solid var(--lab-ink);
  background: var(--lab-surface);
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .lab-scene-label strong {
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .lab-scene-label.is-bad,
.lab[data-theme="dossier"] .lab-scene-label.is-focus {
  border-color: var(--lab-alert);
}

/* Ruled tables, typed like a government form */
.lab[data-theme="dossier"] .lab-table,
.lab[data-theme="dossier"] .game-fw-table {
  border-collapse: collapse;
  font-variant-numeric: lining-nums tabular-nums;
}
.lab[data-theme="dossier"] .lab-table th,
.lab[data-theme="dossier"] .lab-table td,
.lab[data-theme="dossier"] .game-fw-table th,
.lab[data-theme="dossier"] .game-fw-table td {
  border-bottom: 1px solid var(--lab-line);
}
.lab[data-theme="dossier"] .lab-table thead th,
.lab[data-theme="dossier"] .game-fw-table thead th {
  border-bottom: 2px solid var(--lab-ink);
  font-family: var(--lab-font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  color: var(--lab-ink-2);
}

/* Recap: a filed newspaper cutting with a double rule, no stamp */
.lab[data-theme="dossier"] .game-paper {
  border-bottom: 3px double var(--lab-line-strong);
}
.lab[data-theme="dossier"] .game-masthead {
  font-family: var(--lab-font-mono);
  font-style: normal;
  font-size: 0.78rem;
  color: var(--lab-ink-2);
}
.lab[data-theme="dossier"] .game-stamp,
.lab[data-theme="dossier"] .lab-stamp {
  display: none;
}
.lab[data-theme="dossier"] .game-recap-stat {
  background: none;
  border: 0;
  border-top: 1px solid var(--lab-line-strong);
  border-radius: 0;
  padding: 0.5rem 0 0;
}
.lab[data-theme="dossier"] .game-recap-stat strong,
.lab[data-theme="dossier"] .game-recap-stat > span:first-child {
  font-family: var(--lab-font-mono);
  font-variant-numeric: lining-nums tabular-nums;
}
.lab[data-theme="dossier"] .game-modal-backdrop {
  background: color-mix(in srgb, var(--lab-ink) 45%, transparent);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

/* Framework overlay: index tabs on a ruled base, active tab in navy */
.lab[data-theme="dossier"] .game-fw-tabs {
  border-bottom: 1px solid var(--lab-ink);
}
.lab[data-theme="dossier"] .game-fw-tabs button {
  border: 1px solid var(--lab-line-strong);
  border-bottom: 0;
  border-radius: 2px 2px 0 0;
  background: var(--lab-paper);
  margin-bottom: -1px;
  box-shadow: none;
}
.lab[data-theme="dossier"] .game-fw-tabs button.is-on {
  border-color: var(--lab-accent-to);
  background: var(--lab-accent-to);
  color: var(--lab-on-accent);
}
.lab[data-theme="dossier"] .game-fw-tab-n {
  border: 1px solid currentColor;
  border-radius: 0;
  background: none;
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .game-dc {
  border-image: none;
  border: 1px solid var(--lab-line-strong);
  border-top: 3px solid var(--lab-ink);
  background: var(--lab-surface);
}

/* Event log and progress: ruled, flat */
.lab[data-theme="dossier"] .lab-event {
  border-radius: 0;
  border-top: 1px solid var(--lab-line);
}
.lab[data-theme="dossier"] .game-progress-track span,
.lab[data-theme="dossier"] .lab-progress,
.lab[data-theme="dossier"] .lab-progress > span {
  border-radius: 0;
}
.lab[data-theme="dossier"] .lab-dot {
  border-radius: 0;
}
.lab[data-theme="dossier"] .lab-toggle {
  border-radius: 2px;
}
.lab[data-theme="dossier"] .lab-input,
.lab[data-theme="dossier"] .lab-select {
  border-radius: 2px;
  font-family: var(--lab-font-mono);
}
.lab[data-theme="dossier"] .lab-tooltip {
  background: var(--lab-surface);
  border: 1px solid var(--lab-ink);
}
`,
  scene: {
    // Survey sheet: cool paper sky, grey-blue sea, ochre land, slate roofs
    sky: "#e4e7e3",
    skyStorm: "#9aa0a4",
    cloud: "#f7f7f2",
    cloudStorm: "#6d7277",
    rain: "#c3cbd0",
    lightning: "#f2f4f1",
    water: "#8aa2b1",
    waterFar: "#7a92a2",
    lagoon: "#a8bfc7",
    foam: "#f4f5f0",
    sand: "#e3d3a3",
    grass: "#d5bf80",
    hill: "#c4a766",
    leaf: "#9d8650",
    trunk: "#6e5b40",
    road: "#b9a071",
    plaza: "#e6dbb8",
    pad: "#e8dcc0",
    padRing: "#a89670",
    cream: "#efe8d4",
    stone: "#dcd2ba",
    building2: "#9aa4ae",
    vault: "#d3d2cb",
    dock: "#b5a384",
    chimney: "#7c7770",
    smoke: "#eceee9",
    window: "#6f8699",
    roof: "#4f5a68",
    roofOff: "#8a8f96",
    houseOff: "#c7c3b6",
    hull: "#3c3f47",
    glass: "#f1f3f0",
    lampGlass: "#fff4d0",
    lamp: "#e8c978",
    beam: "#e9cf85",
    pallet: "#9c7e56",
    gold: "#c39a3c",
    carGlass: "#dfe5e6",
    cars: ["#1f2f4f", "#a8281f", "#e6dcc0", "#5b7f9a"],
    accent: "#1d2b4a",
    good: "#2e6b3b",
    bad: "#a8281f",
    warn: "#c28a1c",
    cool: "#5b7f9a",
    focus: "#2b5c9a",
    plains: "#d9c58f",
    forestFloor: "#b3a06a",
    deep: "#6d8799",
    shallow: "#a9bfc8",
    rock: "#8f877a",
    snow: "#f5f6f2",
    river: "#7a97a8",
    fieldA: "#dcc27e",
    fieldB: "#bfae70",
    border: "#1c2230",
    wall: "#d8cdb5",
    districts: ["#8c6f4a", "#5f7d8f", "#a58b4f", "#6b7d62", "#8a5a4a", "#7a7a8c", "#b3a06a", "#4f6a7a", "#9a8062"],
    ambient: 0.7,
    hemiSky: "#eef0ea",
    hemiGround: "#b09c74",
    hemi: 0.7,
    sunColor: "#fbf7ec",
    sun: 1.5,
    flat: true,
  },
};

export default theme;
