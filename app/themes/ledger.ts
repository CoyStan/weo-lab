import type { LabTheme } from "./types.ts";

/**
 * The Ledger: a financial newspaper's front page, and the game's default design.
 * Newsprint, true black ink, hairline and double rules, flat black buttons, no boxes,
 * no shadows, no rounded corners. One family (IBM Plex Sans) and one type scale
 * (--t-xs … --t-xl, weights 400/600/700, from weo-lab.css): hierarchy comes from size
 * and weight alone, never small caps, tracking, condensed faces or italics.
 */
const PLEX = 'var(--font-plex), "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';

const theme: LabTheme = {
  id: "ledger",
  name: "The Ledger",
  description: "A financial newspaper's front page: off-white newsprint, true black ink, double rules and column dividers, one ink-blue accent, clear green, amber and red for goals, and the island in full colour.",
  scheme: "light",
  vars: {
    // Page and surfaces: newsprint, a shade lighter for panels
    "--lab-bg": "#efeadc",
    "--lab-paper": "#f5f1e5",
    "--lab-surface": "#f9f6ec",
    "--lab-scene-bg": "#ebe5d3",
    // Ink: true black, a warm grey for secondary text
    "--lab-ink": "#111010",
    "--lab-ink-2": "#3d3934",
    "--lab-line": "color-mix(in srgb, #111010 22%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #111010 62%, transparent)",
    // Primary buttons are black slabs; ink blue is the single accent (focus, your forecast line).
    // Blue, not red: red only ever means "hurts a goal".
    "--lab-accent-from": "#111010",
    "--lab-accent-to": "#111010",
    "--lab-on-accent": "#f5f1e5",
    "--lab-focus": "#1d5aa6",
    // Data series: ink-blue scenario, slate reference, ochre pinned
    "--lab-scenario": "#1d5aa6",
    "--lab-reference": "#5d6b73",
    "--lab-pinned": "#9a7418",
    // Status: text-only ink colours, no tinted fills
    "--lab-good": "#1b7a45",
    "--lab-warn": "#8f6400",
    "--lab-bad": "#9b1c1c",
    "--lab-info": "#2e4a5f",
    "--lab-good-mark": "#1b7a45",
    "--lab-warn-mark": "#b77d00",
    "--lab-alert": "#9b1c1c",
    "--lab-info-mark": "#2e4a5f",
    "--lab-bad-surface": "#f5f1e5",
    "--lab-good-surface": "#f5f1e5",
    "--lab-good-bg": "transparent",
    "--lab-warn-bg": "transparent",
    "--lab-bad-bg": "transparent",
    "--lab-info-bg": "transparent",
    // Type: one family everywhere, numbers included
    "--lab-font-ui": PLEX,
    "--lab-font-display": PLEX,
    "--lab-font-mono": PLEX,
    // Shape and depth: square, flat
    "--lab-radius-panel": "0",
    "--lab-radius-card": "0",
    "--lab-radius-control": "0",
    "--lab-panel-shadow": "none",
  },
  css: `
/* Square everything: no rounded corners, no soft shadows anywhere in the lab. */
.lab[data-theme="ledger"] *,
.lab[data-theme="ledger"] *::before,
.lab[data-theme="ledger"] *::after {
  border-radius: 0 !important;
  box-shadow: none;
  text-shadow: none;
}
.lab[data-theme="ledger"] {
  font-feature-settings: normal;
  line-height: 1.45;
}

/* One type system. Hierarchy from size and weight only: no small caps, no tracked capitals,
   no condensed faces, no italics as decoration. Every number is tabular. */
.lab[data-theme="ledger"],
.lab[data-theme="ledger"] *,
.lab[data-theme="ledger"] *::before,
.lab[data-theme="ledger"] *::after {
  font-variant-caps: normal !important;
  font-variant-numeric: lining-nums tabular-nums !important;
  font-stretch: normal !important;
  font-style: normal !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}
.lab[data-theme="ledger"] em {
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] kbd,
.lab[data-theme="ledger"] .lab-kbd,
.lab[data-theme="ledger"] .game-fw-kbd {
  font-family: var(--lab-font-ui);
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
  line-height: 1.2;
}

/* Headings: bold, the size says the level. */
.lab[data-theme="ledger"] h1,
.lab[data-theme="ledger"] h2,
.lab[data-theme="ledger"] h3,
.lab[data-theme="ledger"] .game-title,
.lab[data-theme="ledger"] .game-col-title,
.lab[data-theme="ledger"] .game-headline,
.lab[data-theme="ledger"] .game-shock-title,
.lab[data-theme="ledger"] .game-goal-title,
.lab[data-theme="ledger"] .game-mission-title {
  font-family: var(--lab-font-display);
  font-weight: var(--w-bold);
  line-height: 1.1;
}
.lab[data-theme="ledger"] .game-title {
  font-size: var(--t-2xl);
  line-height: 1;
}
.lab[data-theme="ledger"] .game-title.is-small {
  font-size: var(--t-xl);
}
.lab[data-theme="ledger"] .game-eyebrow {
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-subtitle {
  font-size: var(--t-md);
  color: var(--lab-ink-2);
}

/* Masthead: a double rule under the bar, the logo in ink only. */
.lab[data-theme="ledger"] .game-hud {
  border-bottom: 3px double var(--lab-ink);
  background: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-logo img {
  filter: grayscale(1) contrast(1.3);
}
/* Turn track: one ink-outlined square per quarter, filled when played, the current one in blue. */
.lab[data-theme="ledger"] .game-progress {
  flex: 1 1 16rem;
  max-width: 34rem;
}
.lab[data-theme="ledger"] .game-progress-head {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: var(--t-md);
  line-height: 1.2;
}
.lab[data-theme="ledger"] .game-progress-head span {
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-progress-track {
  gap: 4px;
  margin-top: 0.35rem;
}
.lab[data-theme="ledger"] .game-progress-track span {
  flex: 0 0 12px;
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--lab-ink);
  background: transparent;
}
.lab[data-theme="ledger"] .game-progress-track span::before {
  inset: 0;
}
.lab[data-theme="ledger"] .game-progress-track span.is-done {
  --game-track-done: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-progress-track span.is-now {
  border-color: var(--lab-focus);
  background: var(--lab-focus);
}
.lab[data-theme="ledger"] .game-progress-track span.has-shock::after,
.lab[data-theme="ledger"] .game-progress-track span.has-election::after {
  top: -7px;
  width: 6px;
  height: 6px;
  box-shadow: none;
}
.lab[data-theme="ledger"] .game-progress-track span em {
  top: 0.95rem;
  font-size: var(--t-xs);
  font-weight: var(--w-regular);
  line-height: 1;
  color: var(--lab-ink-2);
}
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-progress {
    padding-bottom: 1.15rem;
  }
}
.lab[data-theme="ledger"] .game-counter {
  border: 0;
  border-left: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0 0 0 0.8rem;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-counter strong {
  font-family: var(--lab-font-display);
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
/* Votes and Trust are resources, not verdicts: ink, with the word and the figure.
   Green and red appear only on the +1 / -1 change that floats up when they move. */
.lab[data-theme="ledger"] .game-counter.is-votes,
.lab[data-theme="ledger"] .game-counter.is-trust,
.lab[data-theme="ledger"] .game-cost.is-votes,
.lab[data-theme="ledger"] .game-cost.is-trust {
  background: transparent;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-counter > svg {
  display: none;
}
.lab[data-theme="ledger"] .game-counter.is-negative {
  outline: 0;
  border-left-width: 3px;
}
.lab[data-theme="ledger"] .game-counter-float {
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-cost {
  background: transparent;
  padding: 0;
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
}

/* Column dividers: hairlines between the three columns, double rule above each. */
.lab[data-theme="ledger"] .game-grid {
  gap: 0;
  padding: 0;
}
.lab[data-theme="ledger"] .game-col,
.lab[data-theme="ledger"] .game-stage {
  border: 0;
  border-top: 3px double var(--lab-ink);
  background: transparent;
  padding: 0.75rem 1rem 1rem;
}
@media (min-width: 1180px) {
  .lab[data-theme="ledger"] .game-col-levers {
    border-right: 1px solid var(--lab-line-strong);
  }
  .lab[data-theme="ledger"] .game-col-goals {
    border-left: 1px solid var(--lab-line-strong);
  }
}
.lab[data-theme="ledger"] .game-col-title {
  margin-bottom: 0.45rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--lab-ink);
  font-size: var(--t-lg);
}

/* Levers */
.lab[data-theme="ledger"] .game-coach {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  border-bottom: 1px solid var(--lab-line);
  background: transparent;
  padding: 0.45rem 0;
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-agenda {
  max-width: none;
  border: 0;
  border-top: 1px solid var(--lab-ink);
  border-bottom: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.5rem 0;
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-agenda {
  border-top: 2px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-agenda strong {
  font-size: var(--t-md);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-agenda li {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-agenda li.is-warn::before,
.lab[data-theme="ledger"] .game-agenda li.is-info::before {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-turn-note {
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-lever-group h3 {
  font-size: var(--t-md);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-lever-group + .game-lever-group {
  border-top: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-lever:hover,
.lab[data-theme="ledger"] .game-lever:focus-within {
  background: transparent;
  box-shadow: none;
}
.lab[data-theme="ledger"] .game-lever:focus-within .lab-slider-label {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}
/* A lever moved this quarter says so in words after its label. */
.lab[data-theme="ledger"] .game-lever.is-moved .lab-slider-label::after {
  content: " · changed";
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .lab-slider-label {
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .lab-slider-value {
  font-family: var(--lab-font-display);
  font-size: var(--t-md);
  font-weight: var(--w-bold);
}
/* The decision itself: the biggest figure in the column, on a solid ink rule. */
.lab[data-theme="ledger"] .game-lever .lab-slider-value {
  font-size: 2.75rem;
  font-weight: var(--w-bold);
  line-height: 1;
}
.lab[data-theme="ledger"] .lab-range {
  height: 32px;
}
.lab[data-theme="ledger"] .lab-range::-webkit-slider-runnable-track {
  height: 6px;
  background: linear-gradient(to right, var(--lab-ink) 0 var(--pct, 0%), color-mix(in srgb, var(--lab-ink) 18%, transparent) var(--pct, 0%) 100%);
}
.lab[data-theme="ledger"] .lab-range::-moz-range-track {
  height: 6px;
  background: color-mix(in srgb, var(--lab-ink) 18%, transparent);
}
.lab[data-theme="ledger"] .lab-range::-moz-range-progress {
  height: 6px;
  background: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-range::-webkit-slider-thumb {
  width: 28px;
  height: 28px;
  margin-top: -11px;
  border: 2px solid var(--lab-paper);
  border-radius: 0;
  background: var(--lab-ink);
  box-shadow: 0 0 0 1px var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-range::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border: 2px solid var(--lab-paper);
  border-radius: 0;
  background: var(--lab-ink);
  box-shadow: 0 0 0 1px var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-range:focus-visible {
  outline: 2px solid var(--lab-focus);
  outline-offset: 3px;
}
.lab[data-theme="ledger"] .lab-slider-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.lab[data-theme="ledger"] .lab-step {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  margin-top: 0.25rem;
  border: 1px solid var(--lab-ink);
  background: var(--lab-ink);
  color: var(--lab-paper);
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
  line-height: 1;
}
.lab[data-theme="ledger"] .lab-step:not(:disabled):hover {
  background: var(--lab-paper);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-step:disabled {
  opacity: 0.35;
}
.lab[data-theme="ledger"] .game-reform {
  background: transparent;
  border-color: var(--lab-line-strong);
}
.lab[data-theme="ledger"] .game-reform.is-owned {
  background: transparent;
  border-color: var(--lab-ink);
  border-width: 1px 1px 1px 1px;
}
.lab[data-theme="ledger"] .game-track.is-on {
  background: transparent;
  border-color: var(--lab-ink);
}

/* Goals: ruled entries, big tabular figures, status as bold words in ink colours */
.lab[data-theme="ledger"] .game-goal-key {
  font-size: var(--t-xs);
}
.lab[data-theme="ledger"] .game-goal {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.55rem 0 0.7rem;
}
.lab[data-theme="ledger"] .game-goal.is-at-risk,
.lab[data-theme="ledger"] .game-goal.is-failed {
  border-top-width: 3px;
}
.lab[data-theme="ledger"] .game-goal.is-at-risk {
  border-top-color: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .game-goal.is-failed {
  border-top-color: var(--lab-alert);
}
.lab[data-theme="ledger"] .game-goal-title {
  font-size: var(--t-lg);
  color: var(--lab-ink);
}
/* The forecast is the hero: the figure the goal is judged on, read from across the room. */
.lab[data-theme="ledger"] .game-goal-fc small,
.lab[data-theme="ledger"] .game-goal-now small {
  font-size: var(--t-xs);
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-goal-value.is-hero {
  font-family: var(--lab-font-display);
  font-size: 3.25rem;
  font-weight: var(--w-bold);
  line-height: 0.95;
  color: var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-goal-unit {
  font-size: var(--t-md);
  font-weight: var(--w-semi);
  color: var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-goal-target {
  font-size: var(--t-md);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-now {
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-goal-now .tabular-nums {
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-lines .game-status {
  font-size: var(--t-lg);
  line-height: 1.15;
}
.lab[data-theme="ledger"] .game-goal-label {
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-goal-stars {
  font-size: var(--t-xs);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-stars .game-glyph {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-stars .is-at-risk .game-goal-star-state {
  font-weight: var(--w-bold);
  color: var(--lab-warn);
}
.lab[data-theme="ledger"] .game-goal-stars .is-failed .game-goal-star-state {
  font-weight: var(--w-bold);
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-goal-stars .is-met .game-goal-star-state,
.lab[data-theme="ledger"] .game-goal-stars .is-on-track .game-goal-star-state {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-goal-note {
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}
/* Chart key: one line under the goals. */
.lab[data-theme="ledger"] .game-goal-key {
  border-top: 1px solid var(--lab-line-strong);
  padding-top: 0.4rem;
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-goal-key i {
  border-top: 2px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-key i.is-forecast {
  border-top: 2.5px solid var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-goal-key i.is-goal {
  border-top: 1.5px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-status {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent !important;
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
  text-align: left;
  word-spacing: normal;
}
.lab[data-theme="ledger"] .game-status.is-met,
.lab[data-theme="ledger"] .game-status.is-on-track {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-status.is-at-risk {
  color: var(--lab-warn);
}
.lab[data-theme="ledger"] .game-status.is-failed {
  color: var(--lab-bad);
}
/* Status words carry a square marker, so they never rely on colour alone. */
.lab[data-theme="ledger"] .game-status::before {
  content: "";
  display: inline-block;
  width: 0.55em;
  height: 0.55em;
  margin-right: 0.35em;
  vertical-align: 0.05em;
  background: currentColor;
}
.lab[data-theme="ledger"] .game-status.is-at-risk::before {
  background: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .game-move-chip,
.lab[data-theme="ledger"] .game-probe-chip {
  position: static;
  border: 0;
  background: transparent !important;
  padding: 0;
  font-size: var(--t-md);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-move-chip small,
.lab[data-theme="ledger"] .game-probe-chip small {
  margin-right: 0.15rem;
  font-size: var(--t-xs);
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
  opacity: 1;
}
.lab[data-theme="ledger"] .game-move-chip,
.lab[data-theme="ledger"] .game-probe-chip {
  color: var(--lab-ink);
}
/* Colour carries the goal's verdict (helps or hurts it), never the direction: the triangle does that. */
.lab[data-theme="ledger"] .game-move-chip.is-good,
.lab[data-theme="ledger"] .game-probe-chip.is-good {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-move-chip.is-bad,
.lab[data-theme="ledger"] .game-probe-chip.is-bad {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-why {
  font-size: var(--t-xs);
}
/* "Why did it move?" bars show pushes up and down, not verdicts: ink, solid and outlined. */
.lab[data-theme="ledger"] .game-why-panel .game-why-bar.is-pos {
  background: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-why-panel .game-why-bar.is-neg {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--lab-ink);
}
.lab[data-theme="ledger"] .game-why-panel {
  border: 0;
  border-top: 1px solid var(--lab-line-strong);
  background: transparent;
  padding-inline: 0;
}
/* One link style for every in-panel link: ink, a 1px underline, blue on hover. */
.lab[data-theme="ledger"] .game-goal a,
.lab[data-theme="ledger"] .game-col a,
.lab[data-theme="ledger"] .game-coach a,
.lab[data-theme="ledger"] .game-lever a,
.lab[data-theme="ledger"] .game-why,
.lab[data-theme="ledger"] .game-reset,
.lab[data-theme="ledger"] .game-freeplay {
  color: var(--lab-ink);
  font-weight: var(--w-regular);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.lab[data-theme="ledger"] .game-goal a:hover,
.lab[data-theme="ledger"] .game-col a:hover,
.lab[data-theme="ledger"] .game-coach a:hover,
.lab[data-theme="ledger"] .game-lever a:hover,
.lab[data-theme="ledger"] .game-why:hover,
.lab[data-theme="ledger"] .game-reset:hover,
.lab[data-theme="ledger"] .game-freeplay:hover {
  color: var(--lab-focus);
}
.lab[data-theme="ledger"] .game-nextup {
  background: transparent;
  padding: 0;
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
}

/* Advisers: a ruled column of short notes with engraved portraits */
.lab[data-theme="ledger"] .game-advice {
  border: 0;
  border-top: 1px solid var(--lab-line-strong);
  background: transparent;
  padding: 0.45rem 0;
}
.lab[data-theme="ledger"] .game-advice-text {
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-portrait {
  filter: grayscale(0.9) contrast(1.05);
}
.lab[data-theme="ledger"] .game-stance,
.lab[data-theme="ledger"] .lab-chip,
.lab[data-theme="ledger"] .game-fw-valence b {
  background: transparent !important;
  border: 0;
  padding: 0;
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .lab-chip-good,
.lab[data-theme="ledger"] .game-stance.is-pleased,
.lab[data-theme="ledger"] .game-fw-valence .is-good {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .lab-chip-warn {
  color: var(--lab-warn);
}
.lab[data-theme="ledger"] .lab-chip-bad,
.lab[data-theme="ledger"] .game-stance.is-worried,
.lab[data-theme="ledger"] .game-fw-valence .is-bad {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .lab-chip-info,
.lab[data-theme="ledger"] .lab-chip-neutral,
.lab[data-theme="ledger"] .game-fw-valence .is-neutral {
  color: var(--lab-ink-2);
}

/* Callouts: a rule above and plain text, never a tinted box with a coloured side bar. */
.lab[data-theme="ledger"] .game-lesson,
.lab[data-theme="ledger"] .game-disclaimer,
.lab[data-theme="ledger"] .game-banner,
.lab[data-theme="ledger"] .game-run-recap,
.lab[data-theme="ledger"] .game-fw-drivers {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.45rem 0 0;
}
.lab[data-theme="ledger"] .game-banner {
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-banner.is-good {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-banner.is-bad {
  border-top: 2px solid var(--lab-alert);
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-title-points {
  font-family: var(--lab-font-ui);
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
  border-bottom-color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-title-points li {
  border-left: 0;
  border-top: 1px solid var(--lab-line-strong);
  padding-left: 0;
}
.lab[data-theme="ledger"] .game-toast,
.lab[data-theme="ledger"] .game-run,
.lab[data-theme="ledger"] .game-menu-list,
.lab[data-theme="ledger"] .game-probe {
  border: 1px solid var(--lab-ink);
  background: var(--lab-paper);
  backdrop-filter: none;
}
.lab[data-theme="ledger"] .game-toast.is-bad,
.lab[data-theme="ledger"] .game-toast.is-good {
  border-top: 3px solid var(--lab-ink);
}

/* End turn: a flat ink slab; hover inverts it to paper with an ink border. */
.lab[data-theme="ledger"] .game-end-note {
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-end-btn {
  border: 2px solid var(--lab-ink);
  background: var(--lab-ink);
  color: var(--lab-paper);
  padding: 1rem 1.2rem;
  font-family: var(--lab-font-display);
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
  filter: none;
  transform: none;
  box-shadow: none;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.lab[data-theme="ledger"] .game-end-btn:not(:disabled):hover {
  background: var(--lab-paper);
  color: var(--lab-ink);
  transform: none;
  box-shadow: none;
}
.lab[data-theme="ledger"] .game-end-btn:not(:disabled):active {
  transform: none;
  box-shadow: none;
}
.lab[data-theme="ledger"] .game-end-btn:disabled {
  transform: none;
  box-shadow: none;
  opacity: 0.45;
}
.lab[data-theme="ledger"].is-reduced .game-end-btn {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .lab[data-theme="ledger"] .game-end-btn {
    transition: none;
  }
}
.lab[data-theme="ledger"] .game-end-btn kbd {
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  opacity: 0.8;
}
.lab[data-theme="ledger"] .game-skip-btn {
  border: 1px solid var(--lab-ink);
  background: transparent;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-skip-btn:not(:disabled):hover {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-skip-btn svg {
  color: currentColor;
}
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-end {
    border: 0;
    border-top: 3px double var(--lab-ink);
    background: var(--lab-paper);
  }
}

/* Buttons: flat black slabs with paper text; secondary ones are hairline outlines. */
.lab[data-theme="ledger"] .lab-btn {
  font-family: var(--lab-font-ui);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .lab-btn-primary {
  background: var(--lab-ink);
  color: var(--lab-paper);
  border: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-btn-primary:not(:disabled):hover {
  background: var(--lab-scenario);
  border-color: var(--lab-scenario);
  transform: none;
}
.lab[data-theme="ledger"] .lab-btn-soft,
.lab[data-theme="ledger"] .lab-btn-ghost,
.lab[data-theme="ledger"] .lab-btn-danger {
  background: transparent;
  border: 1px solid var(--lab-ink);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-btn-danger {
  border-color: var(--lab-ink);
  border-width: 2px;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-btn-soft:not(:disabled):hover,
.lab[data-theme="ledger"] .lab-btn-ghost:not(:disabled):hover {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-fw-open {
  border: 1px solid var(--lab-ink);
  background: transparent;
  color: var(--lab-ink);
  font-size: var(--t-md);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-open:hover {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
.lab[data-theme="ledger"] .lab-segmented {
  border: 1px solid var(--lab-ink);
  background: transparent;
}
.lab[data-theme="ledger"] .lab-segmented button {
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .lab-segmented button.is-active,
.lab[data-theme="ledger"] .is-active {
  box-shadow: none;
}
.lab[data-theme="ledger"] .lab-segmented button.is-active {
  background: var(--lab-ink);
  color: var(--lab-paper);
}

/* Modals: newsprint over a pale wash, no blur, double rule across the top */
/* A light wash only: the island stays alive behind the paper card, which carries the content. */
.lab[data-theme="ledger"] .game-modal-backdrop {
  background: color-mix(in srgb, var(--lab-bg) 30%, transparent);
  backdrop-filter: none;
}
.lab[data-theme="ledger"] .game-card {
  border: 1px solid var(--lab-ink);
  border-top: 4px double var(--lab-ink);
  background: var(--lab-paper);
  padding: 1.1rem 1.3rem 1.2rem;
  animation: none;
}
.lab[data-theme="ledger"] .game-paper {
  margin: -0.2rem 0 0.8rem;
  border-bottom: 0;
  padding: 0;
}
/* The recap is a front page: a real nameplate, a dateline, the headline, a dek. */
.lab[data-theme="ledger"] .game-masthead {
  display: block;
  border-bottom: 4px double var(--lab-ink);
  padding-bottom: 0.35rem;
  font-family: var(--lab-font-display);
  font-size: clamp(2rem, 8vw, var(--t-2xl));
  font-weight: var(--w-bold);
  line-height: 1;
  text-align: center;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-dateline {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--lab-ink);
  padding: 0.3rem 0;
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-headline {
  margin-top: 0.7rem;
  font-size: var(--t-xl);
  line-height: 1.08;
}
.lab[data-theme="ledger"] .game-dek {
  margin-top: 0.45rem;
  font-size: var(--t-md);
  line-height: 1.35;
  color: var(--lab-ink-2);
}
/* The verdict: a ruled line of type under the headline, not a stamp. */
.lab[data-theme="ledger"] .game-stamp-row {
  margin: 0 0 0.9rem;
  border-top: 1px solid var(--lab-ink);
  border-bottom: 3px double var(--lab-ink);
  padding: 0.4rem 0;
}
.lab[data-theme="ledger"] .game-stamp {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  transform: none;
  animation: none;
  opacity: 1;
  border: 0;
  padding: 0;
  font-family: var(--lab-font-ui);
  font-size: var(--t-md);
  font-weight: var(--w-bold);
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-stamp::before {
  content: "";
  width: 0.6em;
  height: 0.6em;
  background: currentColor;
}
.lab[data-theme="ledger"] .game-stamp-note {
  font-size: var(--t-sm);
  font-weight: var(--w-regular);
  color: var(--lab-ink);
}
/* The figures run as lede columns with a hairline between them. */
.lab[data-theme="ledger"] .game-recap-stats {
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
}
.lab[data-theme="ledger"] .game-recap-stats.is-1 { --cols: 1; }
.lab[data-theme="ledger"] .game-recap-stats.is-3 { --cols: 3; }
.lab[data-theme="ledger"] .game-recap-stats.is-4 { --cols: 4; }
.lab[data-theme="ledger"] .game-recap-stat {
  gap: 0.2rem;
  border: 0;
  background: transparent;
  padding: 0.2rem 1rem 0.3rem;
}
.lab[data-theme="ledger"] .game-recap-stat:first-child {
  padding-left: 0;
}
.lab[data-theme="ledger"] .game-recap-stat + .game-recap-stat {
  border-left: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-recap-value {
  font-size: 4rem;
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-recap-unit {
  margin-left: 0.1rem;
  font-size: var(--t-lg);
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-recap-change {
  font-size: var(--t-md);
}
.lab[data-theme="ledger"] .game-recap-change > .block {
  font-size: var(--t-xs);
}
.lab[data-theme="ledger"] .game-recap-more {
  margin-top: 0.8rem;
  border-top: 1px solid var(--lab-ink);
  padding-top: 0.4rem;
}
.lab[data-theme="ledger"] .game-recap-more > summary {
  cursor: pointer;
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.lab[data-theme="ledger"] .game-stamp.is-warn {
  color: var(--lab-warn);
}
.lab[data-theme="ledger"] .game-stamp.is-warn::before {
  background: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .game-shock {
  border: 0;
  border-top: 4px double var(--lab-ink);
  background: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-shock-kicker {
  background: transparent;
  padding: 0;
  border-top: 2px solid var(--lab-ink);
  padding-top: 0.35rem;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-shock-title {
  font-size: var(--t-lg);
}
.lab[data-theme="ledger"] .game-choice {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.55rem 0 0.6rem;
}
.lab[data-theme="ledger"] .game-choice:hover {
  border-top-color: var(--lab-focus);
  transform: none;
  background: color-mix(in srgb, var(--lab-ink) 4%, transparent);
  box-shadow: none;
}
.lab[data-theme="ledger"] .game-choice.is-plain {
  border-style: none;
  border-top: 1px solid var(--lab-line-strong);
}
.lab[data-theme="ledger"] .game-outcome {
  background: transparent !important;
  padding: 0;
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
  color: var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-outcome.is-good {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-outcome.is-bad {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-outcome.is-hold {
  color: var(--lab-ink-2);
}

/* Title and missions: a cover page with ruled entries, on paper rather than over a haze */
.lab[data-theme="ledger"] .game-overlay {
  background: transparent;
}
.lab[data-theme="ledger"] .game-overlay.is-scroll {
  background: color-mix(in srgb, var(--lab-bg) 25%, transparent);
  backdrop-filter: none;
}
/* The briefing sits left like the title card, with the island in full colour beside it. */
.lab[data-theme="ledger"] .game-overlay.is-scroll.is-briefing {
  align-items: center;
  background: transparent;
}
/* Missions: a solid paper sheet near the top, under a section-front headline. */
.lab[data-theme="ledger"] .game-overlay.is-scroll:not(.is-briefing) {
  align-items: flex-start;
  padding-top: clamp(1rem, 10vh, 6rem);
}
.lab[data-theme="ledger"] .game-mission,
.lab[data-theme="ledger"] .game-mission:focus-visible {
  box-shadow: none;
}
.lab[data-theme="ledger"] .game-missions {
  border: 1px solid var(--lab-ink);
  background: var(--lab-paper);
  padding: 1.1rem 1.4rem 1.4rem;
}
.lab[data-theme="ledger"] .game-missions-head {
  border-bottom: 4px double var(--lab-ink);
  padding-bottom: 0.7rem;
  margin-bottom: 1rem;
}
.lab[data-theme="ledger"] .game-missions-title {
  font-size: var(--t-2xl);
  font-weight: var(--w-bold);
  line-height: 1;
}
.lab[data-theme="ledger"] .game-title-card {
  border: 1px solid var(--lab-ink);
  border-top: 4px double var(--lab-ink);
  background: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-mission {
  border: 1px solid var(--lab-ink);
  border-top-width: 3px;
  background: var(--lab-paper);
  padding: 0.9rem 0.7rem 0.6rem;
}
.lab[data-theme="ledger"] .game-mission:not(:disabled):hover {
  transform: none;
  border-color: var(--lab-focus);
}
/* Locked missions: a solid hairline, no paper rule on top; the playable ones carry an
   ink border and a double rule, so they read as the stronger cards. */
.lab[data-theme="ledger"] .game-mission {
  border-top: 4px double var(--lab-ink);
}
.lab[data-theme="ledger"] .game-mission.is-locked {
  opacity: 1;
  border: 1px solid var(--lab-line);
  background: transparent;
}
.lab[data-theme="ledger"] .game-mission.is-locked * {
  opacity: 1;
}
.lab[data-theme="ledger"] .game-mission.is-locked .game-mission-meta,
.lab[data-theme="ledger"] .game-mission.is-locked .game-mission-kicker,
.lab[data-theme="ledger"] .game-mission.is-locked .game-mission-unlock {
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-mission-stars span,
.lab[data-theme="ledger"] .game-mission-stars span.is-on {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-mission.is-locked .game-mission-title {
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-mission-number {
  font-family: var(--lab-font-display);
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-mission-title {
  font-size: var(--t-lg);
}
.lab[data-theme="ledger"] .game-mission-meta,
.lab[data-theme="ledger"] .game-mission-unlock {
  font-size: var(--t-xs);
}
.lab[data-theme="ledger"] .game-mission-kicker {
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-briefing .game-card {
  border-top-width: 4px;
}

/* Framework overlay: tabs as ruled columns, the active one as a black slab */
.lab[data-theme="ledger"] .game-fw-head {
  border-bottom: 3px double var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-head h2 {
  font-size: var(--t-lg);
}
.lab[data-theme="ledger"] .game-fw-tabs {
  background: var(--lab-paper);
  gap: 0;
  margin-top: 0.8rem;
  border-bottom: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-tabs button {
  border: 0;
  border-left: 1px solid var(--lab-line-strong);
  background: transparent;
  padding: 0.55rem 0.7rem;
}
.lab[data-theme="ledger"] .game-fw-tabs button:first-child {
  border-left: 0;
}
.lab[data-theme="ledger"] .game-fw-tabs button:hover {
  border-color: var(--lab-line-strong);
  background: color-mix(in srgb, var(--lab-ink) 5%, transparent);
}
.lab[data-theme="ledger"] .game-fw-tabs button.is-on {
  background: var(--lab-ink);
  color: var(--lab-paper);
  border-color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-tabs strong {
  font-family: var(--lab-font-display);
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-tabs small {
  font-size: var(--t-xs);
}
.lab[data-theme="ledger"] .game-fw-tab-n {
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-note {
  border: 0;
  border-top: 2px solid var(--lab-ink);
  background: transparent;
  padding: 0.55rem 0 0;
  font-size: var(--t-md);
  line-height: 1.5;
}
.lab[data-theme="ledger"] .game-fw-note.is-warn {
  border-top: 3px double var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-note strong {
  font-family: var(--lab-font-display);
  font-size: var(--t-md);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-note-text {
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}
/* Why tiles: a rule above each, the figure read from across the room. */
.lab[data-theme="ledger"] .game-fw-tile {
  border: 0;
  border-top: 2px solid var(--lab-ink);
  background: transparent;
}
.lab[data-theme="ledger"] .game-fw-tile:hover {
  border-top-color: var(--lab-scenario);
  transform: none;
}
.lab[data-theme="ledger"] .game-fw-tile-sector {
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-fw-tile-label {
  font-size: var(--t-md);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-tile-value {
  font-size: var(--t-xl);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-tile-foot {
  font-size: var(--t-xs);
}
/* "Dig deeper" is a row of links, not another set of boxed buttons. */
.lab[data-theme="ledger"] .game-fw-next button {
  border: 0;
  background: transparent;
  padding: 0.2rem 0.4rem;
  font-weight: var(--w-regular);
  color: var(--lab-ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.lab[data-theme="ledger"] .game-fw-next button:hover {
  background: transparent;
  color: var(--lab-focus);
}
/* Second-level navigation everywhere: underline text tabs. */
.lab[data-theme="ledger"] .game-fw-jump {
  flex-wrap: nowrap;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--lab-line-strong);
  scrollbar-width: none;
}
.lab[data-theme="ledger"] .game-fw-jump button {
  flex: none;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0.35rem 0.6rem;
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-fw-jump button:hover {
  background: transparent;
  border-bottom-color: var(--lab-ink);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-channel {
  border: 0;
  border-bottom: 1px solid var(--lab-line-strong);
  background: transparent;
  padding: 0.65rem 0;
}
.lab[data-theme="ledger"] .game-fw-channel.is-blocked,
.lab[data-theme="ledger"] .game-fw-channel.is-idle {
  background: transparent;
  opacity: 1;
}
.lab[data-theme="ledger"] .game-fw-chain {
  font-size: var(--t-sm);
  font-weight: var(--w-regular);
}
.lab[data-theme="ledger"] .game-fw-pill {
  background: transparent !important;
  padding: 0;
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-fw-pill::before {
  display: none;
}
.lab[data-theme="ledger"] .game-fw-pill.is-weak,
.lab[data-theme="ledger"] .game-fw-pill.is-idle {
  font-weight: var(--w-semi);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-fw-pill.is-blocked {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-table th,
.lab[data-theme="ledger"] .game-fw-table td {
  border-bottom: 1px solid var(--lab-line);
}
.lab[data-theme="ledger"] .game-fw-table td:last-child {
  background: transparent;
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-fw-table thead th {
  font-weight: var(--w-bold);
  border-bottom: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-effect.is-up,
.lab[data-theme="ledger"] .game-fw-effect.is-down {
  background: transparent;
}
.lab[data-theme="ledger"] .game-dc {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  padding: 0.6rem 0 0;
}
/* The indicator strip: one scrollable row of underline tabs, fading at the edge. */
.lab[data-theme="ledger"] .game-dc-metrics {
  flex-wrap: nowrap;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--lab-line-strong);
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 2.5rem), transparent);
  mask-image: linear-gradient(90deg, #000 calc(100% - 2.5rem), transparent);
  padding-right: 2rem;
}
.lab[data-theme="ledger"] .game-dc-metrics button {
  flex: none;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0.3rem 0.6rem;
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-dc-metrics button.is-on {
  border-bottom-color: var(--lab-ink);
  background: transparent;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-dc-mini {
  background: transparent;
  border-top: 1px solid var(--lab-line-strong);
}

.lab[data-theme="ledger"] .game-fw-table th:last-child {
  background: transparent;
}
.lab[data-theme="ledger"] .game-fw-sector {
  border: 0;
  border-top: 3px double var(--lab-ink);
  padding: 0.6rem 0 0.4rem;
}
.lab[data-theme="ledger"] .game-fw-sector h4 {
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
}

/* Phones: the same scale, one step down where a row would otherwise overflow. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-fw-tabs button {
    padding: 0.4rem 0.2rem;
  }
  .lab[data-theme="ledger"] .game-fw-tabs strong {
    font-size: var(--t-sm);
    line-height: 1.15;
  }
  .lab[data-theme="ledger"] .game-fw-table {
    font-size: var(--t-xs);
  }
  .lab[data-theme="ledger"] .game-fw-table th,
  .lab[data-theme="ledger"] .game-fw-table td {
    padding-inline: 0.2rem;
  }
  .lab[data-theme="ledger"] .lab-segmented button {
    font-size: var(--t-xs);
  }
  /* The recap headline steps down one size so the card fits a phone screen. */
  .lab[data-theme="ledger"] .game-headline {
    font-size: var(--t-lg);
  }
}
@media (max-width: 480px) {
  .lab[data-theme="ledger"] .game-stamp-row {
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

/* Island tags: one line, "Title value", in the goal cards' words, flat on paper with an ink
   leader down to the district. A district whose goal is in trouble adds the goal's own
   square and word; the colourful map stays as it is. */
.lab[data-theme="ledger"] .lab-scene-label {
  gap: 0.45rem;
  border: 1px solid var(--lab-ink);
  border-bottom: 1px solid var(--lab-ink);
  background: var(--lab-paper);
  padding: 0.22rem 0.5rem;
  font-family: var(--lab-font-ui);
  font-size: 0.95rem;
  line-height: 1.2;
  box-shadow: none !important;
  translate: 0 var(--dodge, 0px);
  transition: translate var(--dur) var(--ease), opacity 160ms ease;
}
.lab[data-theme="ledger"].is-reduced .lab-scene-label {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .lab[data-theme="ledger"] .lab-scene-label {
    transition: none;
  }
}
/* Flat, not tilted: tags are type on paper. */
.lab[data-theme="ledger"] .lab-scene-label:not(.is-docked) {
  transform: none !important;
}
.lab[data-theme="ledger"] .lab-scene-label::after {
  top: 100%;
  bottom: auto;
  width: 1px;
  height: calc(14px - var(--dodge, 0px));
  border: 0;
  transform: translateX(-50%);
  background: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-icon {
  display: none !important;
}
.lab[data-theme="ledger"] .lab-scene .lab-scene-label .lab-banner-text,
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-text,
.lab[data-theme="ledger"] .lab-scene-label:not(.is-pending):not(.is-capital):not(.is-focus) .lab-banner-text {
  display: inline;
  font-size: 0.95rem !important;
  font-weight: var(--w-regular);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-scene-label strong,
.lab[data-theme="ledger"] .lab-scene .lab-scene-label .lab-banner-text strong,
.lab[data-theme="ledger"] .lab-scene-label:not(.is-pending):not(.is-capital):not(.is-focus) .lab-banner-text strong {
  display: inline;
  font-family: var(--lab-font-ui);
  font-size: 0.95rem !important;
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .lab-scene-label.is-bad {
  background: var(--lab-paper);
  border-color: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-scene-label.is-focus,
.lab[data-theme="ledger"] .lab-scene-label.is-pending {
  border-width: 2px;
  border-color: var(--lab-ink);
  box-shadow: none !important;
}
.lab[data-theme="ledger"] .lab-scene .lab-scene-label.is-capital {
  border-color: var(--lab-ink);
  background: var(--lab-ink);
  padding: 0.22rem 0.55rem;
}
.lab[data-theme="ledger"] .lab-scene .lab-scene-label.is-capital .lab-banner-text,
.lab[data-theme="ledger"] .lab-scene .lab-scene-label.is-capital .lab-banner-text strong {
  color: var(--lab-paper);
  letter-spacing: 0;
}
.lab[data-theme="ledger"] .lab-banner-status {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  font-size: 0.95rem;
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .lab-banner-status::before {
  content: "";
  width: 0.6em;
  height: 0.6em;
  background: currentColor;
}
.lab[data-theme="ledger"] .lab-banner-status.is-at-risk {
  color: var(--lab-warn);
}
.lab[data-theme="ledger"] .lab-banner-status.is-at-risk::before {
  background: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .lab-banner-status.is-failed {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .lab-banner-next {
  font-weight: var(--w-bold);
  color: var(--lab-scenario);
}
/* Phones: only the district with a pending decision (or in trouble) keeps its tag;
   tap a district to see its own. */
@media (max-width: 480px) {
  .lab[data-theme="ledger"] .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status) {
    display: none;
  }
  .lab[data-theme="ledger"] .lab-scene-label.is-focus,
  .lab[data-theme="ledger"] .lab-scene-label.has-status {
    display: flex;
  }
}
@media (max-width: 760px) {
  .lab[data-theme="ledger"] .lab-scene-label,
  .lab[data-theme="ledger"] .lab-scene-label .lab-banner-text,
  .lab[data-theme="ledger"] .lab-scene-label .lab-banner-text strong,
  .lab[data-theme="ledger"] .lab-banner-status {
    font-size: var(--t-xs) !important;
  }
}
.lab[data-theme="ledger"] .lab-stamp {
  transform: none;
  border-width: 1px;
  font-family: var(--lab-font-ui);
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
}

/* Free play: the same flat newsprint as the campaign. */
.lab[data-theme="ledger"] .lab-topbar-logo img {
  filter: grayscale(1) contrast(1.3);
}
.lab[data-theme="ledger"] .lab-desk-note {
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding-inline: 0;
}
/* Status words (Illustrative, Sustainable, Watch): plain bold type, no chip. */
.lab[data-theme="ledger"] .lab-stamp {
  border: 0;
  background: transparent;
  padding: 0;
  letter-spacing: 0;
  text-transform: none;
}

/* Contagion: plain paper, no haze. */
.lab[data-theme="ledger"] .ctg {
  background: var(--lab-bg);
}

/* Tables and tiles in the lab: ruled, not boxed */
.lab[data-theme="ledger"] .lab-tile {
  border: 0;
  border-top: 2px solid var(--lab-ink);
  background: transparent;
}
.lab[data-theme="ledger"] .lab-table thead th {
  font-weight: var(--w-bold);
}

/* Decomposition chart: the validated bright palette (amber shocks, blue instruments), so
   cause and effect read from across a room; only the momentum grey is warmed to the paper. */
.lab[data-theme="ledger"].game {
  --dc-momentum: #8c877c;
}

/* Type for the sofa: the scale's lower steps move up (labels 14px, body 16px, lead 18px),
   so nothing a player needs is set below 14px. */
.lab[data-theme="ledger"] {
  --t-xs: 0.875rem;
  --t-sm: 1rem;
  --t-md: 1.125rem;
}

/* Kickers and small labels: semi-bold ink-2, not another bold. */
.lab[data-theme="ledger"] .game-section,
.lab[data-theme="ledger"] .game-log h3,
.lab[data-theme="ledger"] .game-mission-number {
  font-weight: var(--w-semi);
  color: var(--lab-ink-2);
}

/* Your decisions so far: a hairline ledger table. */
.lab[data-theme="ledger"] .game-log {
  border-top: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-log h3 {
  font-size: var(--t-xs);
}
.lab[data-theme="ledger"] .game-log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--t-xs);
}
.lab[data-theme="ledger"] .game-log-table th,
.lab[data-theme="ledger"] .game-log-table td {
  border-bottom: 1px solid var(--lab-line);
  padding: 0.3rem 0.5rem 0.3rem 0;
  text-align: left;
  vertical-align: top;
}
.lab[data-theme="ledger"] .game-log-table thead th {
  border-bottom: 1px solid var(--lab-ink);
  font-weight: var(--w-semi);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-log-table tbody th {
  width: 5rem;
  font-weight: var(--w-bold);
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-log-table tr.is-start {
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-log-table tr.is-start th {
  font-weight: var(--w-regular);
}
.lab[data-theme="ledger"] .game-lever-group {
  border-top: 2px solid var(--lab-ink);
  padding-top: 0.4rem;
}
.lab[data-theme="ledger"] .game-lever-group + .game-lever-group {
  border-top-width: 2px;
}
.lab[data-theme="ledger"] .game-stance.is-calm {
  color: var(--lab-ink-2);
}

/* Header menu: ruled list on paper. */
.lab[data-theme="ledger"] .game-menu-list {
  padding: 0;
}
.lab[data-theme="ledger"] .game-menu-list button {
  border-top: 1px solid var(--lab-line);
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-menu-list button:first-child {
  border-top: 0;
}
.lab[data-theme="ledger"] .game-menu-list button:hover {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-menu-fw,
  .lab[data-theme="ledger"] .game-menu-rewind {
    display: none;
  }
}

/* Phones: the bar is one row (logo, quarter, counters, Menu); the island is taller. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-hud {
    flex-wrap: nowrap;
    gap: 0.6rem;
    padding: 0.45rem 0.75rem;
  }
  .lab[data-theme="ledger"] .game-hud > .min-w-0,
  .lab[data-theme="ledger"] .game-hud .game-fw-open,
  .lab[data-theme="ledger"] .game-hud .game-hud-rewind,
  .lab[data-theme="ledger"] .game-hud .game-election {
    display: none;
  }
  .lab[data-theme="ledger"] .game-logo img {
    height: 22px;
  }
  .lab[data-theme="ledger"] .game-progress {
    flex: 1 1 auto;
    min-width: 0;
    padding-bottom: 0;
  }
  .lab[data-theme="ledger"] .game-progress-head {
    font-size: var(--t-xs);
    white-space: nowrap;
  }
  .lab[data-theme="ledger"] .game-progress-track span {
    flex: 1 1 0;
    width: auto;
    max-width: 12px;
    height: 10px;
  }
  .lab[data-theme="ledger"] .game-nextup {
    display: none;
  }
  .lab[data-theme="ledger"] .game-hud .game-counter {
    padding-left: 0.5rem;
    font-size: var(--t-xs);
  }
  .lab[data-theme="ledger"] .game-hud .game-counter strong {
    font-size: var(--t-md);
  }
  .lab[data-theme="ledger"] .game-hud-actions {
    margin-left: 0;
  }
  .lab[data-theme="ledger"] .game-scene {
    min-height: 35vh;
    max-height: 40vh;
  }
}

/* Phones and tablets: the dock carries the move strip; the column clears it. */
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-end {
    flex-wrap: wrap;
    border-radius: 0;
    box-shadow: none;
  }
  .lab[data-theme="ledger"] .game-end .game-end-btn {
    padding: 0.7rem 1rem;
  }
  .lab[data-theme="ledger"] .game-play {
    padding-bottom: 12rem;
  }
  .lab[data-theme="ledger"] .game-col-levers {
    padding-bottom: 1.5rem;
  }
}

/* While a card is open on a phone, the dock steps aside so it never looks pressable. */
@media (max-width: 1179px) {
  .lab[data-theme="ledger"]:has(.game-modal-backdrop) .game-end {
    visibility: hidden;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop {
    padding-bottom: 1.5rem;
  }
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-dateline {
    flex-direction: column;
    gap: 0;
  }
  .lab[data-theme="ledger"] .game-missions {
    padding: 0.9rem 0.9rem 1.1rem;
  }
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented {
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented button {
    flex: none;
  }
}
/* Title screen, phones: the name on two lines at most; the primary button full width and
   the two secondary ones sharing a row. */
@media (max-width: 480px) {
  .lab[data-theme="ledger"] .game-title {
    font-size: clamp(2.2rem, 10vw, var(--t-2xl));
  }
  .lab[data-theme="ledger"] .game-title-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .lab[data-theme="ledger"] .game-title-actions .game-cta {
    grid-column: 1 / -1;
  }
  .lab[data-theme="ledger"] .game-recap-stats.is-3,
  .lab[data-theme="ledger"] .game-recap-stats.is-4 {
    --cols: 2;
  }
  .lab[data-theme="ledger"] .game-recap-value {
    font-size: 3rem;
  }
  .lab[data-theme="ledger"] .game-recap-stat {
    padding-inline: 0.6rem;
  }
}

/* ---- Design council, Ledger round 2 ---------------------------------------- */

/* One valence system: the triangle is direction, in ink; the square and word say helps
   (filled) or hurts (hollow). Colour only ever sits on the square and its word. */
.lab[data-theme="ledger"] .game-move-chip.is-good,
.lab[data-theme="ledger"] .game-move-chip.is-bad,
.lab[data-theme="ledger"] .game-probe-chip.is-good,
.lab[data-theme="ledger"] .game-probe-chip.is-bad,
.lab[data-theme="ledger"] .game-outcome.is-good,
.lab[data-theme="ledger"] .game-outcome.is-bad,
.lab[data-theme="ledger"] .game-move-strip .game-move-strip-d,
.lab[data-theme="ledger"] .game-fw-effect,
.lab[data-theme="ledger"] .game-fw-tile-foot b {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-outcome {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2em;
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-outcomes {
  gap: 0.25rem 0.9rem;
}
.lab[data-theme="ledger"] .game-fw-valence {
  gap: 0.25rem 1rem;
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-fw-valence .game-direction {
  color: var(--lab-ink);
  font-weight: var(--w-bold);
}

/* Status words in ink; the square carries green, amber or red. */
.lab[data-theme="ledger"] .game-status.is-met,
.lab[data-theme="ledger"] .game-status.is-on-track,
.lab[data-theme="ledger"] .game-status.is-at-risk,
.lab[data-theme="ledger"] .game-status.is-failed,
.lab[data-theme="ledger"] .lab-banner-status.is-at-risk,
.lab[data-theme="ledger"] .lab-banner-status.is-failed,
.lab[data-theme="ledger"] .game-goal-stars .game-goal-star-state,
.lab[data-theme="ledger"] .game-goal-stars .is-at-risk .game-goal-star-state,
.lab[data-theme="ledger"] .game-goal-stars .is-failed .game-goal-star-state,
.lab[data-theme="ledger"] .game-goal-stars .is-met .game-goal-star-state,
.lab[data-theme="ledger"] .game-goal-stars .is-on-track .game-goal-star-state {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-status.is-met::before,
.lab[data-theme="ledger"] .game-status.is-on-track::before {
  background: var(--lab-good-mark);
}
.lab[data-theme="ledger"] .game-status.is-at-risk::before,
.lab[data-theme="ledger"] .lab-banner-status.is-at-risk::before {
  background: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .game-status.is-failed::before,
.lab[data-theme="ledger"] .lab-banner-status.is-failed::before {
  background: var(--lab-alert);
}
.lab[data-theme="ledger"] .game-goal-star-state::before {
  content: "";
  display: inline-block;
  width: 0.6em;
  height: 0.6em;
  margin: 0 0.3em 0 0.1em;
  vertical-align: 0.02em;
  background: var(--lab-good-mark);
}
.lab[data-theme="ledger"] .game-goal-stars .is-at-risk .game-goal-star-state::before {
  background: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .game-goal-stars .is-failed .game-goal-star-state::before {
  background: var(--lab-alert);
}
.lab[data-theme="ledger"] .game-goal-stars .is-at-risk .game-goal-star-state,
.lab[data-theme="ledger"] .game-goal-stars .is-failed .game-goal-star-state {
  font-weight: var(--w-bold);
}
/* A goal in trouble keeps the same plain ink rule: the status line says it, once. */
.lab[data-theme="ledger"] .game-goal.is-at-risk,
.lab[data-theme="ledger"] .game-goal.is-failed {
  border-top: 1px solid var(--lab-ink);
}

/* End and Skip while waiting: paper buttons with a hairline, and the reason above. */
.lab[data-theme="ledger"] .game-end-btn:disabled,
.lab[data-theme="ledger"] .game-skip-btn:disabled {
  opacity: 1;
  filter: none;
  border: 1px solid var(--lab-line-strong);
  background: var(--lab-paper);
  color: var(--lab-ink-2);
  cursor: default;
}
.lab[data-theme="ledger"] .game-end-btn:disabled kbd,
.lab[data-theme="ledger"] .game-skip-btn:disabled kbd {
  opacity: 0.7;
}
.lab[data-theme="ledger"] .game-end-note.is-waiting {
  font-weight: var(--w-semi);
  color: var(--lab-ink);
}

/* Island: one docked strip on the top edge holds the goals' figures, ruled like the
   phone's docked tag. The tags left on the map are the pending decision, a district in
   trouble and the one under the pointer; the GDP index goes. */
.lab[data-theme="ledger"] .game-scene-strip {
  border-bottom: 1px solid var(--lab-ink);
  background: var(--lab-paper);
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"].game .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.is-docked) {
  display: none;
}
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-word {
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-next strong {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-banner-next {
  color: var(--lab-ink);
  font-weight: var(--w-regular);
}

/* Advisers: the lead sentence in full; "More" only when there is more. */
.lab[data-theme="ledger"] .game-advice-text {
  font-size: var(--t-sm);
  line-height: 1.4;
}

/* Modals: one system. A single paper scrim over the whole UI; the card ends on a
   double rule. The recap docks as a broadsheet column so the island stays in view. */
.lab[data-theme="ledger"] .game-modal-backdrop {
  background: color-mix(in srgb, var(--lab-bg) 85%, transparent);
}
.lab[data-theme="ledger"] .game-modal-backdrop.is-recap {
  background: color-mix(in srgb, var(--lab-bg) 30%, transparent);
}
.lab[data-theme="ledger"] .game-card {
  border-bottom: 3px double var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-backdrop {
  align-items: center;
  padding: 1rem;
}
.lab[data-theme="ledger"] .game-fw {
  margin: auto 0;
  max-height: calc(100dvh - 2rem);
}
.lab[data-theme="ledger"] .game-fw-body {
  -webkit-mask-image: none;
  mask-image: none;
}
@media (min-width: 1100px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap {
    align-items: stretch;
    justify-content: flex-end;
    padding: 0;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap > .game-recap {
    width: 560px;
    max-width: 100%;
    height: 100dvh;
    margin: 0;
    overflow-y: auto;
    border: 0;
    border-left: 3px double var(--lab-ink);
    padding: 1.2rem 1.6rem 1.4rem;
  }
}
/* The verdict leads, in bold ink with its square; the bonus-star line sits under it. */
.lab[data-theme="ledger"] .game-stamp-row,
.lab[data-theme="ledger"] .game-recap .game-stamp-row {
  flex-direction: column;
  align-items: flex-start;
  border-bottom: 1px solid var(--lab-ink);
  padding: 0.5rem 0 0.55rem;
}
.lab[data-theme="ledger"] .game-stamp,
.lab[data-theme="ledger"] .game-stamp.is-warn,
.lab[data-theme="ledger"] .game-stamp.is-bad,
.lab[data-theme="ledger"] .game-stamp.is-good {
  font-size: var(--t-lg);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-stamp.is-good::before {
  background: var(--lab-good-mark);
}
.lab[data-theme="ledger"] .game-stamp.is-warn::before {
  background: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .game-stamp.is-bad::before {
  background: var(--lab-alert);
}
.lab[data-theme="ledger"] .game-stamp-note {
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-stamp-row + .game-recap-stats,
.lab[data-theme="ledger"] .game-stamp-row + .game-run-recap {
  margin-top: 0.7rem;
}
/* Quarter deltas as large as the secondary figures. */
.lab[data-theme="ledger"] .game-recap-change {
  font-size: var(--t-lg);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-recap-change .game-valence {
  font-size: var(--t-xs);
}

/* Phones: every dialog is a full-bleed sheet from the bottom with its actions in reach;
   the recap leaves the island peeking above it. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-modal-backdrop,
  .lab[data-theme="ledger"] .game-fw-backdrop {
    align-items: flex-end;
    padding: 0;
    overflow: hidden;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop > .game-card {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    max-width: none;
    max-height: 92dvh;
    margin: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap > .game-card {
    max-height: 72dvh;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop > .game-card.game-fw {
    height: 92dvh;
    min-height: 0;
    overflow: hidden;
  }
  .lab[data-theme="ledger"] .game-recap > .flex:last-child,
  .lab[data-theme="ledger"] .game-fw-head {
    position: sticky;
    z-index: 2;
    background: var(--lab-paper);
  }
  .lab[data-theme="ledger"] .game-recap > .flex:last-child {
    bottom: calc(-1rem - env(safe-area-inset-bottom));
    margin-inline: -1rem;
    margin-bottom: calc(-1rem - env(safe-area-inset-bottom));
    border-top: 1px solid var(--lab-ink);
    padding: 0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom));
  }
  .lab[data-theme="ledger"] .game-fw-head {
    top: 0;
  }
}

/* Phones: the scroll area ends clear of the fixed goals strip and End bar. */
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-play {
    padding-bottom: calc(var(--game-footer-h, 9rem) + env(safe-area-inset-bottom) + 16px);
  }
}

/* Channels: the mixed swatch and bars share one token; the zero line runs through. */
.lab[data-theme="ledger"].game {
  --dc-mixed: color-mix(in srgb, var(--lab-ink) 45%, var(--lab-paper));
}
.lab[data-theme="ledger"] .game-fw-palette i {
  border-radius: 0;
}

/* Overflowing tab strips: wrap on desktop; on phones scroll with snap and a paper edge. */
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-dc-metrics,
  .lab[data-theme="ledger"] .game-fw-jump {
    flex-wrap: wrap;
    overflow: visible;
    -webkit-mask-image: none;
    mask-image: none;
    padding-right: 0;
  }
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-dc-metrics,
  .lab[data-theme="ledger"] .game-fw-jump,
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented {
    scroll-snap-type: x proximity;
    -webkit-mask-image: linear-gradient(to right, #000 85%, transparent);
    mask-image: linear-gradient(to right, #000 85%, transparent);
    padding-right: 2rem;
  }
  .lab[data-theme="ledger"] .game-dc-metrics > *,
  .lab[data-theme="ledger"] .game-fw-jump > *,
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented > * {
    scroll-snap-align: start;
  }
}
/* Sector tabs: real underline tabs that stay in view while the accounts scroll. */
.lab[data-theme="ledger"] .game-fw-jump {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--lab-paper);
}

/* Framework tabs: a small ink numeral on the title's baseline, no boxed badge. */
.lab[data-theme="ledger"] .game-fw-tab-n {
  display: inline;
  width: auto;
  height: auto;
  min-width: 0;
  margin-right: 0.45em;
  border: 0;
  padding: 0;
  background: transparent;
  font-size: var(--t-sm);
  font-weight: var(--w-regular);
  color: inherit;
  opacity: 0.75;
}
/* Why tiles: the figure never wraps; the ends are one "from, arrow, to" row. */
.lab[data-theme="ledger"] .game-fw-tile-value {
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-fw-tile-ends {
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0.35rem;
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-fw-tile-go {
  margin-left: 0.3em;
}
.lab[data-theme="ledger"] .game-fw-tile-ends > span {
  white-space: nowrap;
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-fw-tile-ends {
    flex-wrap: wrap;
    column-gap: 0.3rem;
    row-gap: 0;
  }
}

/* HUD: the product's name set in Plex, in ink, at the masthead's weight. */
.lab[data-theme="ledger"] .game-logo img {
  display: none;
}
.lab[data-theme="ledger"] .game-logo .game-wordmark {
  display: block;
  font-family: var(--lab-font-display);
  font-size: var(--t-md);
  font-weight: var(--w-bold);
  line-height: 1.05;
  color: var(--lab-ink);
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-wordmark .is-short {
  display: none;
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-wordmark .is-long {
    display: none;
  }
  .lab[data-theme="ledger"] .game-wordmark .is-short {
    display: inline;
  }
}
/* Votes and Trust always in words: "Votes 4 · Trust 2"; phones "V 4 · T 2". */
.lab[data-theme="ledger"] .game-counter-name {
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-counter-name .is-long {
    display: none;
  }
  .lab[data-theme="ledger"] .game-counter-name .is-short {
    display: inline;
    font-size: var(--t-xs);
    font-weight: var(--w-semi);
    color: var(--lab-ink-2);
  }
}
.lab[data-theme="ledger"] .game-cost {
  border: 0;
  padding: 0;
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
  color: var(--lab-ink-2);
  white-space: nowrap;
}

/* Goal cards: title, figure with goal and now, Your move, one status line, a shorter
   chart, the star as one row. Two goals fit a 900px screen; the column scrolls if not. */
.lab[data-theme="ledger"] .game-goal-figures > .game-goal-fc {
  column-gap: 0.06em;
}
.lab[data-theme="ledger"] .game-goal-unit {
  margin-left: 0.04em;
  font-size: var(--t-lg);
}
.lab[data-theme="ledger"] .game-goal-lines {
  margin-top: 0.2rem;
}
.lab[data-theme="ledger"] .game-goal-stars {
  margin-top: 0.2rem;
}
.lab[data-theme="ledger"] .game-goal-stars li {
  line-height: 1.35;
}
.lab[data-theme="ledger"] .game-goal-star-state {
  margin-right: 0.15rem;
}
@media (min-width: 1180px) {
  .lab[data-theme="ledger"] .game-grid {
    grid-template-columns: 18rem minmax(0, 1fr) 18.5rem;
  }
  .lab[data-theme="ledger"] .game-col-goals {
    overflow-y: auto;
    border-bottom: 1px solid var(--lab-line-strong);
  }
}
.lab[data-theme="ledger"] .game-log {
  padding-top: 0.4rem;
}
.lab[data-theme="ledger"] .game-log > summary {
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
  color: var(--lab-ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.lab[data-theme="ledger"] .game-log[open] > summary {
  margin-bottom: 0.3rem;
}
.lab[data-theme="ledger"] .game-agenda-note {
  margin-top: 0.15rem;
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}

/* Missions: the next one leads with an ink top rule and a black Play button; locked ones
   are dashed hairlines in ink-3 with a lock word, and no hover. */
.lab[data-theme="ledger"] .game-overlay.is-scroll {
  background: transparent;
}
.lab[data-theme="ledger"] .game-mission.is-lead {
  border: 1px solid var(--lab-ink);
  border-top: 2px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-mission.is-lead .game-mission-title {
  font-size: var(--t-xl);
}
.lab[data-theme="ledger"] .game-mission.is-locked {
  border: 1px dashed var(--lab-line-strong);
  background: transparent;
  color: var(--lab-ink-2);
  cursor: default;
}
.lab[data-theme="ledger"] .game-mission.is-locked:hover {
  border-color: var(--lab-line-strong);
}
.lab[data-theme="ledger"] .game-mission-play {
  background: var(--lab-ink);
  color: var(--lab-paper);
  font-size: var(--t-sm);
}

/* Briefing: tools as a ruled table, the star in drawn type. */
.lab[data-theme="ledger"] .game-bullet.is-star .game-glyph {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-tools {
  font-size: var(--t-xs);
}

/* Keyboard focus: an ink-blue outline everywhere */
.lab[data-theme="ledger"] button:focus-visible,
.lab[data-theme="ledger"] .lab-btn:focus-visible {
  outline: 2px solid var(--lab-scenario);
  outline-offset: 2px;
}
`,
  // The island keeps its full colours: the page frames the map, it does not recolour it.
  scene: {},
};

export default theme;
