import type { LabTheme } from "./types.ts";

/** Modern board game on the table: cardstock tiles, printed tokens, a tactile End-turn token and a toy-bright island. */
const theme: LabTheme = {
  id: "tabletop",
  name: "Tabletop",
  description: "A modern board game on the table: cardstock tiles with thick brown outlines, printed status tokens, a press-able brick End-turn token and a bright toy island.",
  scheme: "light",
  vars: {
    // Table and cardstock
    "--lab-bg": "#dccba6",
    "--lab-paper": "#f7efd9",
    "--lab-surface": "#fcf8ec",
    "--lab-scene-bg": "linear-gradient(180deg, #a9d7d1 0%, #d9ecdc 62%, #efe2bf 100%)",
    // Ink: printed brown, never black
    "--lab-ink": "#3b2416",
    "--lab-ink-2": "#6a4a33",
    "--lab-line": "color-mix(in srgb, #3b2416 30%, transparent)",
    "--lab-line-strong": "#3b2416",
    // Accent: brick End-turn token and primary buttons; focus is board teal
    "--lab-accent-from": "#b8482c",
    "--lab-accent-to": "#8f3220",
    "--lab-on-accent": "#fff6e3",
    "--lab-focus": "#1f6f6a",
    // Data series: teal forecast, mustard reference
    "--lab-scenario": "#1f6f6a",
    "--lab-reference": "#b87a0a",
    "--lab-pinned": "#c98a10",
    // Status (text colours sit on cream; solid fills are set in css)
    "--lab-good": "#2d6a2c",
    "--lab-warn": "#7a4f00",
    "--lab-bad": "#a83a24",
    "--lab-info": "#1f6f6a",
    "--lab-good-mark": "#5f9a3f",
    "--lab-warn-mark": "#e8b03a",
    "--lab-alert": "#b5432c",
    "--lab-info-mark": "#2b8a82",
    "--lab-good-bg": "color-mix(in srgb, #5f9a3f 26%, #f7efd9)",
    "--lab-warn-bg": "color-mix(in srgb, #e8b03a 40%, #f7efd9)",
    "--lab-bad-bg": "color-mix(in srgb, #b5432c 22%, #f7efd9)",
    "--lab-info-bg": "color-mix(in srgb, #2b8a82 22%, #f7efd9)",
    "--lab-bad-surface": "#f3dccb",
    "--lab-good-surface": "#e3ebc9",
    // Type: geometric display for headings and big numbers, humanist sans for the rest
    "--lab-font-ui": "\"Avenir Next\", \"Gill Sans\", \"Gill Sans MT\", \"Trebuchet MS\", sans-serif",
    "--lab-font-display": "Futura, \"Century Gothic\", \"Avenir Next\", \"Gill Sans\", sans-serif",
    "--lab-font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    // Shape and depth: rounded cardstock, hard offset shadow
    "--lab-radius-panel": "14px",
    "--lab-radius-card": "10px",
    "--lab-radius-control": "10px",
    "--lab-panel-shadow": "4px 4px 0 #3b2416",
  },
  css: `
.lab[data-theme="tabletop"] {
  letter-spacing: 0;
}
.lab[data-theme="tabletop"] h1,
.lab[data-theme="tabletop"] h2,
.lab[data-theme="tabletop"] h3 {
  font-family: var(--lab-font-display);
  font-weight: 800;
  letter-spacing: -0.005em;
  color: var(--lab-ink);
}

/* Cardstock tiles: thick outline, hard offset shadow, no blur */
.lab[data-theme="tabletop"] .game-col,
.lab[data-theme="tabletop"] .game-hud,
.lab[data-theme="tabletop"] .game-title-card,
.lab[data-theme="tabletop"] .game-card,
.lab[data-theme="tabletop"] .game-recap,
.lab[data-theme="tabletop"] .game-fw,
.lab[data-theme="tabletop"] .game-scene,
.lab[data-theme="tabletop"] .game-dc,
.lab[data-theme="tabletop"] .game-fw-table {
  border: 2.5px solid var(--lab-ink);
  border-radius: var(--lab-radius-panel);
  box-shadow: var(--lab-panel-shadow);
}
.lab[data-theme="tabletop"] .game-col-title,
.lab[data-theme="tabletop"] .game-log h3,
.lab[data-theme="tabletop"] .game-fw-h,
.lab[data-theme="tabletop"] .game-dc-group h5 {
  font-family: var(--lab-font-display);
  font-weight: 800;
  font-size: 1.3rem;
  letter-spacing: -0.005em;
  text-transform: none;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-eyebrow,
.lab[data-theme="tabletop"] .game-masthead,
.lab[data-theme="tabletop"] .game-shock-kicker {
  font-family: var(--lab-font-display);
  font-weight: 800;
  text-transform: none;
  letter-spacing: 0;
  color: #1f6f6a;
}
.lab[data-theme="tabletop"] .game-title {
  font-family: var(--lab-font-display);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-subtitle,
.lab[data-theme="tabletop"] .game-fw-tile-foot,
.lab[data-theme="tabletop"] .game-end-note {
  color: var(--lab-ink-2);
}

/* Top bar: turn track as a row of printed squares; counters as tokens */
.lab[data-theme="tabletop"] .game-hud {
  background: var(--lab-paper);
}
.lab[data-theme="tabletop"] .game-progress-track span {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: 3px;
}
.lab[data-theme="tabletop"] .game-progress-track span.is-done {
  background: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-progress-track span.is-now {
  background: #e8b03a;
}
.lab[data-theme="tabletop"] .game-counter {
  background: var(--lab-surface);
  color: var(--lab-ink);
  border: 2.5px solid var(--lab-ink);
  border-radius: 10px;
  box-shadow: 2px 2px 0 var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-counter strong {
  color: inherit;
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-counter.is-votes {
  background: #e8b03a;
}
.lab[data-theme="tabletop"] .game-counter.is-trust {
  background: #2b8a82;
  color: #fff6e3;
}
.lab[data-theme="tabletop"] .game-counter.is-negative {
  background: #b5432c;
  color: #fff6e3;
}

/* Printed tokens for every status: solid fill, dark outline */
.lab[data-theme="tabletop"] .game-status {
  border: 2px solid var(--lab-ink);
  border-radius: 6px;
  box-shadow: 2px 2px 0 var(--lab-ink);
  padding: 0.12rem 0.5rem;
  font-family: var(--lab-font-display);
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
  min-width: 0;
  background: var(--lab-surface);
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-status.is-met,
.lab[data-theme="tabletop"] .game-status.is-on-track {
  background: #3d7a3c;
  color: #fff6e3;
}
.lab[data-theme="tabletop"] .game-status.is-at-risk {
  background: #e8b03a;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-status.is-failed {
  background: #b5432c;
  color: #fff6e3;
}
.lab[data-theme="tabletop"] .game-move-chip {
  border: 2px solid var(--lab-ink);
  border-radius: 6px;
  box-shadow: 2px 2px 0 var(--lab-ink);
  background: var(--lab-surface);
  color: var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-move-chip.is-good {
  background: #3d7a3c;
  color: #fff6e3;
}
.lab[data-theme="tabletop"] .game-move-chip.is-bad {
  background: #b5432c;
  color: #fff6e3;
}
.lab[data-theme="tabletop"] .game-move-chip small {
  color: inherit;
}
.lab[data-theme="tabletop"] .game-stance {
  border: 2px solid var(--lab-ink);
  border-radius: 6px;
  box-shadow: 2px 2px 0 var(--lab-ink);
  background: var(--lab-surface);
  color: var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-stance.is-worried {
  background: #b5432c;
  color: #fff6e3;
}
.lab[data-theme="tabletop"] .game-stance.is-pleased {
  background: #3d7a3c;
  color: #fff6e3;
}
.lab[data-theme="tabletop"] .lab-chip,
.lab[data-theme="tabletop"] .game-fw-pill {
  border: 2px solid var(--lab-ink);
  border-radius: 6px;
  background: var(--lab-surface);
  color: var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
  text-transform: none;
  letter-spacing: 0;
}

/* Levers: big friendly numbers, a chunky slider with a printed thumb */
.lab[data-theme="tabletop"] .game-lever-group h3 {
  font-family: var(--lab-font-display);
  font-weight: 800;
  font-size: 1.05rem;
  text-transform: none;
  letter-spacing: 0;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-lever .lab-slider-label {
  font-weight: 700;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-lever .lab-slider-value {
  font-family: var(--lab-font-display);
  font-weight: 800;
  font-size: 2.1rem;
  color: var(--lab-ink);
  letter-spacing: -0.01em;
}
.lab[data-theme="tabletop"] .lab-range::-webkit-slider-runnable-track {
  height: 12px;
  border: 2.5px solid var(--lab-ink);
  border-radius: 999px;
  background: linear-gradient(to right, var(--lab-scenario) 0 var(--pct, 0%), #f4ead0 var(--pct, 0%) 100%);
}
.lab[data-theme="tabletop"] .lab-range::-moz-range-track {
  height: 12px;
  border: 2.5px solid var(--lab-ink);
  border-radius: 999px;
  background: #f4ead0;
}
.lab[data-theme="tabletop"] .lab-range::-moz-range-progress {
  height: 12px;
  border-radius: 999px;
  background: var(--lab-scenario);
}
.lab[data-theme="tabletop"] .lab-range::-webkit-slider-thumb {
  width: 26px;
  height: 26px;
  margin-top: -5px;
  border-radius: 50%;
  border: 3px solid var(--lab-ink);
  background: #e8b03a;
  box-shadow: 2px 2px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 3px solid var(--lab-ink);
  background: #e8b03a;
  box-shadow: 2px 2px 0 var(--lab-ink);
}

/* Callouts: no tinted boxes, no coloured side borders */
.lab[data-theme="tabletop"] .game-agenda {
  background: #f2c75c;
  border: 2.5px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-agenda.is-quiet {
  background: var(--lab-surface);
  box-shadow: none;
}
.lab[data-theme="tabletop"] .game-agenda strong {
  font-family: var(--lab-font-display);
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-coach {
  background: transparent;
  border: 2px dashed var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: none;
}
.lab[data-theme="tabletop"] .game-turn-note {
  color: var(--lab-ink-2);
  font-style: italic;
}

/* Goals: cards with a hard shadow; the shadow colour carries the status */
.lab[data-theme="tabletop"] .game-goal {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-goal.is-at-risk {
  border-color: var(--lab-ink);
  box-shadow: 3px 3px 0 #e8b03a;
}
.lab[data-theme="tabletop"] .game-goal.is-failed {
  border-color: var(--lab-ink);
  box-shadow: 3px 3px 0 #b5432c;
}
.lab[data-theme="tabletop"] .game-goal-title {
  font-family: var(--lab-font-display);
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-goal-value {
  font-family: var(--lab-font-display);
  font-weight: 800;
  font-size: 1.75rem;
  color: var(--lab-ink);
}

/* Advisors as character cards: a coloured top band, a framed portrait */
.lab[data-theme="tabletop"] .game-advice {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-top: 8px solid var(--advisor);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
  padding: 0.6rem 0.7rem;
}
.lab[data-theme="tabletop"] .game-advisors.is-compact .game-advice {
  box-shadow: none;
  background: transparent;
}
.lab[data-theme="tabletop"] .game-advice-text {
  font-size: 0.82rem;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-advice.is-worried .game-advice-text::before {
  color: #a83a24;
}
.lab[data-theme="tabletop"] .game-portrait {
  border: 2px solid var(--lab-ink);
  border-radius: 10px;
}

/* The End-turn token: thick, pressable, with a solid edge that sinks on press */
.lab[data-theme="tabletop"] .game-end-btn {
  background: var(--lab-accent-from);
  color: var(--lab-on-accent);
  border: 3px solid var(--lab-ink);
  border-radius: 18px;
  padding: 1rem 1.4rem;
  font-family: var(--lab-font-display);
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 0 rgb(59 36 22 / 0.45);
  box-shadow: 0 7px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-end-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 9px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-end-btn:not(:disabled):active {
  transform: translateY(5px);
  box-shadow: 0 2px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-end-btn:disabled {
  box-shadow: 0 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-end-btn kbd {
  border: 2px solid var(--lab-on-accent);
  border-radius: 6px;
  background: rgb(59 36 22 / 0.25);
  opacity: 1;
}
.lab[data-theme="tabletop"] .game-skip-btn {
  background: var(--lab-surface);
  color: var(--lab-ink);
  border: 2.5px solid var(--lab-ink);
  border-radius: 12px;
  box-shadow: 0 4px 0 var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}

/* Buttons: printed tokens throughout */
.lab[data-theme="tabletop"] .lab-btn {
  border: 2.5px solid var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
  letter-spacing: 0.01em;
  box-shadow: 0 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-btn:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 0 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-btn-primary {
  background: var(--lab-accent-from);
  color: var(--lab-on-accent);
  border-color: var(--lab-ink);
  box-shadow: 0 4px 0 var(--lab-ink);
  text-shadow: 0 1px 0 rgb(59 36 22 / 0.4);
}
.lab[data-theme="tabletop"] .lab-btn-primary:not(:disabled):hover {
  box-shadow: 0 5px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-btn-soft {
  background: #efe2bf;
  color: var(--lab-ink);
  border-color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-btn-ghost {
  background: var(--lab-surface);
  color: var(--lab-ink);
  border-color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-btn-ghost:not(:disabled):hover {
  background: #f2c75c;
  border-color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .lab-btn-ghost[aria-pressed="true"] {
  background: var(--lab-ink);
  color: var(--lab-surface);
}
.lab[data-theme="tabletop"] .game-fw-open {
  background: #e8b03a;
  color: var(--lab-ink);
  border: 2.5px solid var(--lab-ink);
  border-radius: 10px;
  box-shadow: 0 3px 0 var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-cta {
  background: var(--lab-accent-from);
  color: var(--lab-on-accent);
  border: 3px solid var(--lab-ink);
  border-radius: 14px;
  box-shadow: 0 5px 0 var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .lab-segmented {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: 10px;
}
.lab[data-theme="tabletop"] .lab-segmented button {
  font-family: var(--lab-font-display);
  font-weight: 800;
  border-radius: 7px;
}
.lab[data-theme="tabletop"] .lab-segmented button.is-active {
  background: var(--lab-ink);
  color: var(--lab-surface);
}

/* Missions and title */
.lab[data-theme="tabletop"] .game-mission {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-mission.is-locked {
  box-shadow: none;
  border-style: dashed;
  opacity: 0.6;
}
.lab[data-theme="tabletop"] .game-mission-title {
  font-family: var(--lab-font-display);
  font-weight: 800;
  color: var(--lab-ink);
}

/* Modals and the newspaper recap: cardstock, not newsprint; no blur */
.lab[data-theme="tabletop"] .game-modal-backdrop {
  background: rgb(59 36 22 / 0.5);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.lab[data-theme="tabletop"] .game-paper {
  background: var(--lab-surface);
}
.lab[data-theme="tabletop"] .game-headline {
  font-family: var(--lab-font-display);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-stamp {
  display: none;
}
.lab[data-theme="tabletop"] .game-recap-stat {
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  background: var(--lab-surface);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-shock {
  background: var(--lab-surface);
  border: 2.5px solid var(--lab-ink);
  border-top: 10px solid #b5432c;
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-choice {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-choice:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-outcome {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-top: 8px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-outcome.is-good {
  border-top-color: #3d7a3c;
}
.lab[data-theme="tabletop"] .game-outcome.is-bad {
  border-top-color: #b5432c;
}
.lab[data-theme="tabletop"] .game-outcome.is-hold {
  border-top-color: #8a7a66;
}

/* Framework overlay: tabs as tiles, the active tab as a mustard token */
.lab[data-theme="tabletop"] .game-fw-tabs button {
  background: var(--lab-surface);
  border: 2.5px solid var(--lab-ink);
  border-radius: 10px;
  box-shadow: 0 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-fw-tabs button:hover {
  border-color: var(--lab-ink);
  background: #f2c75c;
}
.lab[data-theme="tabletop"] .game-fw-tabs button.is-on {
  background: #e8b03a;
  color: var(--lab-ink);
  border-color: var(--lab-ink);
  box-shadow: 0 1px 0 var(--lab-ink);
  transform: translateY(2px);
}
.lab[data-theme="tabletop"] .game-fw-tabs strong {
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-fw-tab-n {
  background: var(--lab-ink);
  color: var(--lab-surface);
  border-radius: 8px;
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-fw-tabs button.is-on .game-fw-tab-n {
  background: var(--lab-surface);
  color: var(--lab-ink);
  border: 2px solid var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-fw-note {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-fw-note.is-warn {
  background: #f2c75c;
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-why-bar {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
}
.lab[data-theme="tabletop"] .game-fw-tile {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
  box-shadow: 3px 3px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-fw-tile:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-fw-tile-label,
.lab[data-theme="tabletop"] .game-fw-tile-sector {
  font-family: var(--lab-font-display);
  font-weight: 800;
  text-transform: none;
  letter-spacing: 0;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-fw-tile-value {
  font-family: var(--lab-font-display);
  font-weight: 800;
  font-size: 2.1rem;
  color: var(--lab-ink);
}
.lab[data-theme="tabletop"] .game-fw-tile-value small {
  font-weight: 700;
}
.lab[data-theme="tabletop"] .game-fw-channel,
.lab[data-theme="tabletop"] .game-fw-effect {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: var(--lab-radius-card);
}
.lab[data-theme="tabletop"] .game-fw-table th {
  background: #ecdcb2;
  color: var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-dc-metrics button {
  background: var(--lab-surface);
  border: 2px solid var(--lab-ink);
  border-radius: 10px;
  box-shadow: 0 3px 0 var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
}
.lab[data-theme="tabletop"] .game-dc-metrics button.is-on {
  background: #e8b03a;
  color: var(--lab-ink);
}

/* Scene labels on the island: printed label cards */
.lab[data-theme="tabletop"] .lab-scene-label {
  background: var(--lab-surface);
  color: var(--lab-ink);
  border: 2.5px solid var(--lab-ink);
  border-radius: 8px;
  box-shadow: 2px 2px 0 var(--lab-ink);
  font-family: var(--lab-font-display);
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}
.lab[data-theme="tabletop"] .lab-scene-label strong,
.lab[data-theme="tabletop"] .lab-banner-text strong {
  font-family: var(--lab-font-display);
  font-weight: 800;
}

/* Chart colour tokens for the decomposition */
.lab[data-theme="tabletop"].game {
  --dc-1: #1f6f6a;
  --dc-4: #c98a10;
  --dc-momentum: #8a7a66;
}
`,
  scene: {
    // Bright but not neon: pale teal sky, cornflower sea, sunny greens, brick roofs
    sky: "#a9d7d1",
    skyStorm: "#7d8a8c",
    cloud: "#fff8e8",
    cloudStorm: "#6e6a62",
    rain: "#c6d6d6",
    lightning: "#fff6d6",
    water: "#4f93b5",
    waterFar: "#6aa6c0",
    lagoon: "#8fcbd0",
    foam: "#f8f2e2",
    sand: "#ead39a",
    grass: "#9cc26a",
    hill: "#84ad5a",
    leaf: "#4e8a3e",
    trunk: "#7a5234",
    road: "#e6d6b0",
    plaza: "#efe2c0",
    pad: "#eadcb8",
    padRing: "#b89a64",
    cream: "#f7eed8",
    stone: "#e4d6b6",
    building2: "#b5482c",
    vault: "#e0d3bc",
    dock: "#c2a676",
    chimney: "#8a6a52",
    smoke: "#ece6d6",
    window: "#5d7d8c",
    roof: "#a64a30",
    roofOff: "#6f7f86",
    houseOff: "#d6c9a8",
    hull: "#4a3324",
    glass: "#f2efe4",
    lampGlass: "#fff1c2",
    lamp: "#f0c75a",
    beam: "#f2cf7a",
    pallet: "#b08452",
    gold: "#e0a526",
    carGlass: "#dfe9e6",
    cars: ["#b5482c", "#1f6f6a", "#e8b03a", "#f7efd9"],
    accent: "#b5482c",
    good: "#3d7a3c",
    bad: "#b5432c",
    warn: "#e8b03a",
    cool: "#4f93b5",
    focus: "#1f6f6a",
    ambient: 0.75,
    hemiSky: "#fff4df",
    hemiGround: "#b89a64",
    hemi: 0.7,
    sunColor: "#fff6e0",
    sun: 1.5,
    flat: true,
  },
};

export default theme;
