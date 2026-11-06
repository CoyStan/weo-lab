import type { LabTheme } from "./types.ts";

/**
 * 1970s central-bank control room: bone and light-grey faceplates, charcoal
 * type, one signal orange for the decision, olive and red indicator lamps.
 */
const theme: LabTheme = {
  id: "console",
  name: "Control room",
  description: "A 1970s central-bank control room: bone faceplates, charcoal grotesk, one signal-orange key and indicator lamps, a muted industrial island.",
  scheme: "light",
  vars: {
    // Enclosure, faceplate and inset well
    "--lab-bg": "#d7d3ca",
    "--lab-paper": "#efebe2",
    "--lab-surface": "#e6e2d8",
    "--lab-scene-bg": "#cdc9bf",
    // Charcoal ink
    "--lab-ink": "#2a2926",
    "--lab-ink-2": "#57534c",
    "--lab-line": "color-mix(in srgb, #2a2926 16%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #2a2926 36%, transparent)",
    // Signal orange for the primary key and active states
    "--lab-accent-from": "#c44a0c",
    "--lab-accent-to": "#c44a0c",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#2a2926",
    // Series: charcoal scenario, grey reference, olive pinned
    "--lab-scenario": "#2a2926",
    "--lab-reference": "#8a8478",
    "--lab-pinned": "#5d6b1f",
    // Status text and lamps
    "--lab-good": "#4f5e18",
    "--lab-warn": "#7a5a12",
    "--lab-bad": "#b0291c",
    "--lab-info": "#3d5566",
    "--lab-good-mark": "#6b7d24",
    "--lab-warn-mark": "#d89a2b",
    "--lab-alert": "#d6321e",
    "--lab-info-mark": "#3d5566",
    // No tinted status surfaces: lamps carry the meaning
    "--lab-good-bg": "transparent",
    "--lab-warn-bg": "transparent",
    "--lab-bad-bg": "transparent",
    "--lab-info-bg": "transparent",
    "--lab-bad-surface": "#efebe2",
    "--lab-good-surface": "#efebe2",
    // Type: one grotesk for everything, numbers set tabular
    "--lab-font-ui": "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
    "--lab-font-display": "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
    "--lab-font-mono": "ui-monospace, Menlo, Consolas, monospace",
    // Machined edges: small radii, no shadow beyond a hairline inset
    "--lab-radius-panel": "3px",
    "--lab-radius-card": "3px",
    "--lab-radius-control": "2px",
    "--lab-panel-shadow": "inset 0 1px 0 rgb(255 255 255 / 0.6)",
  },
  css: `
/* Faceplate and enclosure */
.lab[data-theme="console"] {
  font-variant-numeric: tabular-nums;
}
.lab[data-theme="console"] .lab-panel,
.lab[data-theme="console"] .game-col,
.lab[data-theme="console"] .game-card,
.lab[data-theme="console"] .game-title-card {
  border: 1px solid var(--lab-line-strong);
  border-top: 3px solid var(--lab-ink);
  border-radius: 3px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.6);
  backdrop-filter: none;
}
.lab[data-theme="console"] .game-hud {
  background: var(--lab-paper);
  border-bottom: 2px solid var(--lab-ink);
  box-shadow: none;
}
.lab[data-theme="console"] .game-col-title {
  text-transform: none;
  letter-spacing: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--lab-ink);
  border-bottom: 1px solid var(--lab-line-strong);
  padding-bottom: 0.4rem;
}
.lab[data-theme="console"] h1,
.lab[data-theme="console"] h2,
.lab[data-theme="console"] h3 {
  font-family: var(--lab-font-display);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-transform: none;
}
.lab[data-theme="console"] .game-eyebrow,
.lab[data-theme="console"] .game-lever-group h3,
.lab[data-theme="console"] .lab-slider-label,
.lab[data-theme="console"] .game-goal-now,
.lab[data-theme="console"] .game-goal-fc,
.lab[data-theme="console"] .lab-chip,
.lab[data-theme="console"] .lab-table thead th,
.lab[data-theme="console"] .game-fw-table th,
.lab[data-theme="console"] .game-goal-key {
  text-transform: none;
  letter-spacing: 0.01em;
  font-weight: 700;
  color: var(--lab-ink-2);
}
.lab[data-theme="console"] .lab-chip {
  border-radius: 2px;
  border: 1px solid var(--lab-line-strong);
  background: transparent;
}

/* Callouts: a hairline module; the decision box gets the orange rule */
.lab[data-theme="console"] .game-agenda,
.lab[data-theme="console"] .game-coach,
.lab[data-theme="console"] .game-turn-note,
.lab[data-theme="console"] .game-fw-note,
.lab[data-theme="console"] .game-shock,
.lab[data-theme="console"] .game-why-bar,
.lab[data-theme="console"] .game-dc {
  background: var(--lab-surface);
  border: 1px solid var(--lab-line-strong);
  border-top: 2px solid var(--lab-ink);
  border-left: 1px solid var(--lab-line-strong);
  border-radius: 2px;
  box-shadow: none;
}
.lab[data-theme="console"] .game-agenda {
  border-top: 3px solid var(--lab-accent-from);
}
.lab[data-theme="console"] .game-fw-note.is-warn {
  border-top-color: var(--lab-warn-mark);
}

/* Inner cells sit flat on the faceplate, separated by hairlines */
.lab[data-theme="console"] .game-goal,
.lab[data-theme="console"] .game-recap-stat,
.lab[data-theme="console"] .game-fw-tile,
.lab[data-theme="console"] .game-fw-channel,
.lab[data-theme="console"] .game-fw-effect,
.lab[data-theme="console"] .game-advice,
.lab[data-theme="console"] .game-choice,
.lab[data-theme="console"] .game-mission {
  background: transparent;
  border: 0;
  border-top: 1px solid var(--lab-line-strong);
  border-radius: 0;
  box-shadow: none;
}
.lab[data-theme="console"] .game-advice,
.lab[data-theme="console"] .game-fw-tile,
.lab[data-theme="console"] .game-fw-channel {
  border: 1px solid var(--lab-line-strong);
  border-radius: 2px;
}
.lab[data-theme="console"] .game-mission.is-locked {
  opacity: 0.5;
}
.lab[data-theme="console"] .game-portrait {
  border-radius: 2px;
  border: 1px solid var(--lab-line-strong);
  filter: saturate(0.7);
}

/* Big readouts: numbers like an instrument dial */
.lab[data-theme="console"] .game-goal-value,
.lab[data-theme="console"] .game-recap-stat strong,
.lab[data-theme="console"] .game-recap-stat .game-recap-value,
.lab[data-theme="console"] .lab-slider-value {
  font-family: var(--lab-font-display);
  font-weight: 500;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--lab-ink);
}
.lab[data-theme="console"] .lab-slider-value {
  background: var(--lab-surface);
  border: 1px solid var(--lab-line-strong);
  border-radius: 2px;
  padding: 0 0.4em;
  box-shadow: inset 0 1px 3px rgb(0 0 0 / 0.14);
}
.lab[data-theme="console"] .game-goal-title {
  font-weight: 700;
  color: var(--lab-ink);
  text-transform: none;
  letter-spacing: 0;
}

/* Status: a lamp and a word, no pill */
.lab[data-theme="console"] .game-status,
.lab[data-theme="console"] .game-fw-pill,
.lab[data-theme="console"] .game-stance {
  position: relative;
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-width: 0;
  padding: 0 0 0 1.05em;
  font-size: 0.8rem;
  font-weight: 700;
  text-align: left;
  color: var(--lab-ink-2);
}
.lab[data-theme="console"] .game-status::before,
.lab[data-theme="console"] .game-fw-pill::before,
.lab[data-theme="console"] .game-stance::before,
.lab[data-theme="console"] .game-move-chip::before,
.lab[data-theme="console"] .game-outcome::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 0.6em;
  height: 0.6em;
  margin-top: -0.3em;
  border-radius: 50%;
  background: currentColor;
}
.lab[data-theme="console"] .game-status.is-met,
.lab[data-theme="console"] .game-status.is-on-track {
  color: var(--lab-good);
}
.lab[data-theme="console"] .game-status.is-at-risk {
  color: var(--lab-warn);
}
.lab[data-theme="console"] .game-status.is-failed {
  color: var(--lab-bad);
}
.lab[data-theme="console"] .game-stance.is-calm {
  color: var(--lab-ink-2);
}
.lab[data-theme="console"] .game-stance.is-pleased {
  color: var(--lab-good);
}
.lab[data-theme="console"] .game-stance.is-worried {
  color: var(--lab-bad);
}
.lab[data-theme="console"] .game-fw-pill.is-active {
  color: var(--lab-good);
}
.lab[data-theme="console"] .game-fw-pill.is-blocked {
  color: var(--lab-bad);
}
.lab[data-theme="console"] .game-fw-pill.is-weak {
  color: var(--lab-warn);
}
.lab[data-theme="console"] .game-move-chip {
  position: relative;
  background: none;
  border: 0;
  border-radius: 0;
  padding: 0 0 0 1.05em;
  font-weight: 700;
  color: var(--lab-ink-2);
}
.lab[data-theme="console"] .game-move-chip.is-good {
  color: var(--lab-good);
}
.lab[data-theme="console"] .game-move-chip.is-bad {
  color: var(--lab-bad);
}
.lab[data-theme="console"] .game-outcome {
  position: relative;
  background: none;
  border: 0;
  border-radius: 0;
  padding: 0 0 0 1em;
  font-weight: 700;
  color: var(--lab-ink-2);
}
.lab[data-theme="console"] .game-outcome.is-good {
  color: var(--lab-good);
}
.lab[data-theme="console"] .game-outcome.is-bad {
  color: var(--lab-bad);
}
.lab[data-theme="console"] .game-outcome.is-hold::before {
  display: none;
}
.lab[data-theme="console"] .game-outcome.is-hold {
  padding-left: 0;
}
.lab[data-theme="console"] .game-counter {
  background: var(--lab-surface);
  border: 1px solid var(--lab-line-strong);
  border-radius: 2px;
  box-shadow: none;
  font-weight: 700;
  color: var(--lab-ink);
}
.lab[data-theme="console"] .game-stamp {
  display: none;
}

/* Keys: the decision is a flat orange key; the rest are outlined */
.lab[data-theme="console"] .lab-btn,
.lab[data-theme="console"] .game-skip-btn,
.lab[data-theme="console"] .game-fw-open {
  border-radius: 2px;
  border: 1px solid var(--lab-ink);
  background: var(--lab-paper);
  color: var(--lab-ink);
  box-shadow: none;
  font-weight: 700;
  transform: none;
}
.lab[data-theme="console"] .lab-btn:not(:disabled):hover,
.lab[data-theme="console"] .game-skip-btn:not(:disabled):hover,
.lab[data-theme="console"] .game-fw-open:not(:disabled):hover {
  background: var(--lab-surface);
  box-shadow: none;
  transform: none;
}
.lab[data-theme="console"] .lab-btn-primary,
.lab[data-theme="console"] .game-cta {
  background: var(--lab-accent-from);
  border: 1px solid #8f3409;
  border-bottom-width: 4px;
  color: #ffffff;
  box-shadow: none;
}
.lab[data-theme="console"] .lab-btn-soft,
.lab[data-theme="console"] .lab-btn-ghost {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
.lab[data-theme="console"] .game-end-btn {
  min-height: 4.6rem;
  border-radius: 4px;
  background: var(--lab-accent-from);
  color: #ffffff;
  border: 1px solid #8f3409;
  border-bottom: 0;
  box-shadow: 0 6px 0 #8f3409, inset 0 1px 0 rgb(255 255 255 / 0.25);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  transform: translateY(0);
  transition: transform 0.08s linear, box-shadow 0.08s linear;
}
.lab[data-theme="console"] .game-end-btn:not(:disabled):hover {
  transform: translateY(0);
  box-shadow: 0 6px 0 #8f3409, inset 0 1px 0 rgb(255 255 255 / 0.25);
}
.lab[data-theme="console"] .game-end-btn:not(:disabled):active {
  transform: translateY(5px);
  box-shadow: 0 1px 0 #8f3409, inset 0 1px 0 rgb(255 255 255 / 0.25);
}
.lab[data-theme="console"] .game-end-btn:disabled {
  filter: none;
  opacity: 0.45;
}
.lab[data-theme="console"] .game-end-btn kbd {
  border: 1px solid rgb(255 255 255 / 0.7);
  border-radius: 2px;
  font-family: var(--lab-font-ui);
}
.lab[data-theme="console"] .lab-segmented {
  border: 1px solid var(--lab-ink);
  border-radius: 2px;
  background: var(--lab-surface);
  padding: 0;
  box-shadow: none;
}
.lab[data-theme="console"] .lab-segmented button {
  border-radius: 0;
  border-right: 1px solid var(--lab-line-strong);
  font-weight: 700;
  color: var(--lab-ink-2);
  background: transparent;
  box-shadow: none;
}
.lab[data-theme="console"] .lab-segmented button:last-child {
  border-right: 0;
}
.lab[data-theme="console"] .lab-segmented button.is-active {
  background: var(--lab-accent-from);
  color: #ffffff;
}

/* Lever: a machined slider with a round knob */
.lab[data-theme="console"] .game-lever .lab-range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 0;
  background: linear-gradient(to right, var(--lab-accent-from) 0 var(--pct, 0%), color-mix(in srgb, var(--lab-ink) 18%, transparent) var(--pct, 0%) 100%);
}
.lab[data-theme="console"] .game-lever .lab-range::-moz-range-track,
.lab[data-theme="console"] .game-lever .lab-range::-moz-range-progress {
  height: 6px;
  border-radius: 0;
}
.lab[data-theme="console"] .game-lever .lab-range::-moz-range-progress {
  background: var(--lab-accent-from);
}
.lab[data-theme="console"] .game-lever .lab-range::-webkit-slider-thumb {
  width: 22px;
  height: 22px;
  margin-top: -8px;
  border-radius: 50%;
  background: var(--lab-paper);
  border: 2px solid var(--lab-ink);
  box-shadow: inset 0 0 0 3px var(--lab-paper), inset 0 0 0 5px var(--lab-ink);
}
.lab[data-theme="console"] .game-lever .lab-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--lab-paper);
  border: 2px solid var(--lab-ink);
}

/* Map plates: flat instrument labels */
.lab[data-theme="console"] .lab-scene-label {
  background: var(--lab-paper);
  border: 1px solid var(--lab-ink);
  border-top-width: 3px;
  border-radius: 2px;
  box-shadow: none;
  font-family: var(--lab-font-ui);
  text-transform: none;
  letter-spacing: 0;
}
.lab[data-theme="console"] .lab-scene-label strong {
  font-weight: 700;
}

/* Modals: no blur, a darkened bench behind the faceplate */
.lab[data-theme="console"] .game-modal-backdrop {
  background: color-mix(in srgb, #2a2926 50%, transparent);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.lab[data-theme="console"] .game-paper,
.lab[data-theme="console"] .game-masthead {
  background: var(--lab-paper);
  border-bottom: 2px solid var(--lab-ink);
}
.lab[data-theme="console"] .game-headline {
  font-family: var(--lab-font-display);
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--lab-ink);
}

/* Framework tabs: numbered keys along a rail */
.lab[data-theme="console"] .game-fw-tabs button {
  border-radius: 2px;
  border: 1px solid var(--lab-line-strong);
  border-top: 3px solid transparent;
  background: var(--lab-surface);
  color: var(--lab-ink);
  box-shadow: none;
}
.lab[data-theme="console"] .game-fw-tabs button.is-on {
  background: var(--lab-paper);
  border-color: var(--lab-ink);
  border-top: 3px solid var(--lab-accent-from);
  color: var(--lab-ink);
}
.lab[data-theme="console"] .game-fw-tab-n {
  border-radius: 2px;
  border: 1px solid var(--lab-ink);
  background: transparent;
  color: var(--lab-ink);
}
.lab[data-theme="console"] .game-fw-tabs button.is-on .game-fw-tab-n {
  background: var(--lab-accent-from);
  border-color: var(--lab-accent-from);
  color: #ffffff;
}
.lab[data-theme="console"] .game-dc-metrics button {
  border-radius: 2px;
  border: 1px solid var(--lab-line-strong);
  background: var(--lab-surface);
  color: var(--lab-ink);
  box-shadow: none;
}
.lab[data-theme="console"] .game-dc-metrics button[aria-selected="true"],
.lab[data-theme="console"] .game-dc-metrics button.is-on {
  background: var(--lab-accent-from);
  border-color: var(--lab-accent-from);
  color: #ffffff;
}

/* Decomposition chart: muted instrument hues, same roles
   (dc-1 instruments, dc-4 shocks, dc-momentum grey) */
.lab[data-theme="console"].game {
  --dc-1: #3d5566;
  --dc-2: #c44a0c;
  --dc-3: #5d6b1f;
  --dc-4: #b8862e;
  --dc-5: #8a6f5a;
  --dc-6: #4f6b4a;
  --dc-7: #7d6b86;
  --dc-8: #b0291c;
  --dc-momentum: color-mix(in srgb, var(--lab-ink) 34%, var(--lab-paper));
}

/* Progress: flat bars, not pills */
.lab[data-theme="console"] .game-progress-track span {
  border-radius: 0;
  box-shadow: none;
}

/* Gentle type rhythm for the recap and framework readouts */
.lab[data-theme="console"] .game-recap-stat,
.lab[data-theme="console"] .game-fw-tile {
  font-variant-numeric: tabular-nums;
}
.lab[data-theme="console"] .game-fw-table td {
  font-variant-numeric: tabular-nums;
}
`,
  scene: {
    // Overcast sky, slate sea, olive and khaki land: muted industrial
    sky: "#c9cdcc",
    skyStorm: "#7d8386",
    cloud: "#f1eee6",
    cloudStorm: "#6a6d6e",
    rain: "#b6bcc0",
    lightning: "#f5f3ec",
    water: "#6d8089",
    waterFar: "#5f7179",
    lagoon: "#8fa3a6",
    foam: "#ece9e1",
    sand: "#cfc4a9",
    grass: "#9a9c7c",
    hill: "#868a6c",
    leaf: "#5f6b4b",
    trunk: "#5b4b3d",
    road: "#b0a998",
    plaza: "#d9d3c4",
    pad: "#dcd6c8",
    padRing: "#a8a08c",
    plains: "#a9a77c",
    forestFloor: "#6f7a52",
    deep: "#4b5f6b",
    shallow: "#7f9499",
    rock: "#8a857c",
    snow: "#efeee9",
    river: "#6d8089",
    fieldA: "#c9b98a",
    fieldB: "#9aa07a",
    border: "#b8862e",
    wall: "#cbc4b3",
    // Buildings: bone concrete, charcoal slate roofs, dark glazing
    cream: "#e8e2d4",
    stone: "#cfc8b9",
    building2: "#b9ae9b",
    vault: "#c9c4b8",
    dock: "#a79d88",
    chimney: "#7a736b",
    smoke: "#e7e5df",
    window: "#5b6c76",
    roof: "#4d5359",
    roofOff: "#7d8186",
    houseOff: "#bdb8ab",
    hull: "#3a3836",
    glass: "#eeece6",
    lampGlass: "#f6efd6",
    lamp: "#e9c98a",
    beam: "#e9d09a",
    pallet: "#8f7a5f",
    gold: "#b8862e",
    carGlass: "#d0d4d3",
    cars: ["#c44a0c", "#2a2926", "#5d6b1f", "#e8e2d4"],
    districts: ["#5b6c76", "#c44a0c", "#5d6b1f", "#8a6f5a", "#3d5566", "#b8862e", "#7d6b86", "#8f8a7c", "#a8432b"],
    // Semantic accents match the lamps
    accent: "#c44a0c",
    good: "#5d6b1f",
    bad: "#b0291c",
    warn: "#d89a2b",
    cool: "#5f7a8a",
    focus: "#2a2926",
    // Flat, even light
    ambient: 0.6,
    hemiSky: "#efece4",
    hemiGround: "#a39c88",
    hemi: 0.6,
    sunColor: "#fff8e8",
    sun: 1.6,
    flat: true,
  },
};

export default theme;
