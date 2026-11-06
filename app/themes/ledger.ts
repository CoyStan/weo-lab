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
  /* One eight-step type scale (the shared tokens, re-tuned): secondary text is never below
     15px, so the play screen and recap read from a sofa; chart axes alone use --t-axis. */
  --t-axis: 0.8125rem;
  --t-xs: 0.9375rem;
  --t-sm: 1rem;
  --t-md: 1.1rem;
  --t-lg: 1.4rem;
  --t-xl: 2.4rem;
  --t-2xl: 2.75rem;
  --t-3xl: 3.4rem;
  --t-4xl: 4rem;
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
  font-size: var(--t-3xl);
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
  font-size: var(--t-2xl);
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
  font-size: var(--t-2xl);
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
  font-size: clamp(2rem, 8vw, var(--t-3xl));
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
  font-size: var(--t-4xl);
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
  font-size: var(--t-3xl);
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
  font-size: var(--t-sm);
  line-height: 1.2;
  box-shadow: none !important;
  translate: var(--nudge, 0px) var(--dodge, 0px);
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
  transform: translateX(calc(-50% - var(--nudge, 0px)));
  background: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-icon {
  display: none !important;
}
.lab[data-theme="ledger"] .lab-scene .lab-scene-label .lab-banner-text,
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-text,
.lab[data-theme="ledger"] .lab-scene-label:not(.is-pending):not(.is-capital):not(.is-focus) .lab-banner-text {
  display: inline;
  font-size: var(--t-sm) !important;
  font-weight: var(--w-regular);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-scene-label strong,
.lab[data-theme="ledger"] .lab-scene .lab-scene-label .lab-banner-text strong,
.lab[data-theme="ledger"] .lab-scene-label:not(.is-pending):not(.is-capital):not(.is-focus) .lab-banner-text strong {
  display: inline;
  font-family: var(--lab-font-ui);
  font-size: var(--t-sm) !important;
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
  font-size: var(--t-sm);
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
}
/* Title screen, phones: the name on two lines at most; the primary button full width and
   the two secondary ones sharing a row. */
@media (max-width: 480px) {
  .lab[data-theme="ledger"] .game-title {
    font-size: clamp(2.2rem, 10vw, var(--t-3xl));
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
    font-size: var(--t-2xl);
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
.lab[data-theme="ledger"].game .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.is-docked):not(.has-cue):not(.is-shocked) {
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
/* The framework frame hangs from a fixed top offset at one fixed height (game.css): its
   title and tabs hold still while the panes cross-fade; only the body scrolls. */
.lab[data-theme="ledger"] .game-fw-backdrop {
  align-items: flex-start;
  padding: 0 1rem;
}
.lab[data-theme="ledger"] .game-fw {
  margin: 1.5rem 0 0;
  height: min(calc(100dvh - 3rem), 960px);
  max-height: none;
}
@media (min-width: 1100px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap {
    align-items: stretch;
    justify-content: flex-end;
    padding: 0;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap > .game-recap {
    width: var(--recap-w);
    max-width: 100%;
    height: 100dvh;
    margin: 0;
    overflow: hidden;
    border: 0;
    border-left: 3px double var(--lab-ink);
    padding: 0;
  }
  .lab[data-theme="ledger"] .game-recap > .game-recap-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.2rem 1.6rem 1rem;
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
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }
  .lab[data-theme="ledger"] .game-fw-head {
    position: sticky;
    z-index: 2;
    background: var(--lab-paper);
  }
  /* The recap sheet: its body scrolls, its actions bar sits below the body on a solid
     paper ground with its own top rule, so no text passes under it. */
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap > .game-card.game-recap {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }
  .lab[data-theme="ledger"] .game-recap > .game-recap-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1rem 1rem 0.75rem;
  }
  .lab[data-theme="ledger"] .game-recap > .game-recap-actions {
    flex: none;
    margin: 0;
    border-top: 1px solid var(--lab-ink);
    background: var(--lab-paper);
    padding: 0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom));
  }
  .lab[data-theme="ledger"] .game-fw-head {
    top: 0;
  }
}

/* Phones: the scroll area ends clear of the fixed goals strip and End bar. */
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-play {
    padding-bottom: calc(var(--sticky-h, 9rem) + env(safe-area-inset-bottom) + 1rem);
  }
}

/* Channels: the mixed swatch and bars share one token; the zero line runs through. */
.lab[data-theme="ledger"].game {
  --dc-mixed: color-mix(in srgb, var(--lab-ink) 45%, var(--lab-paper));
}
.lab[data-theme="ledger"] .game-fw-palette i {
  border-radius: 0;
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

/* ---- Design council, Ledger round 3 ---------------------------------------- */

/* Goal cards: ONE verdict per goal, first, as the word and its square. The bonus star and
   "Your move" sit under it as subordinate lines of ink type. */
.lab[data-theme="ledger"] .game-goal-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.1rem 0.6rem;
}
.lab[data-theme="ledger"] .game-goal-head .game-goal-title {
  margin: 0;
}
.lab[data-theme="ledger"] .game-goal-verdict {
  font-size: var(--t-lg);
  line-height: 1.15;
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-goal-figures {
  margin-top: 0.2rem;
}
.lab[data-theme="ledger"] .game-goal-sub {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0.3rem 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--t-sm);
  line-height: 1.35;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-sub .game-goal-move {
  min-height: 1.35em;
}
.lab[data-theme="ledger"] .game-goal-sub .game-move-chip,
.lab[data-theme="ledger"] .game-goal-sub .game-probe-chip {
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-goal-sub .game-move-chip small,
.lab[data-theme="ledger"] .game-goal-sub .game-probe-chip small {
  font-size: var(--t-sm);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-bonus .game-glyph {
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-sub .game-goal-star-state {
  font-weight: var(--w-semi);
  color: var(--lab-ink);
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-goal-bonus.is-at-risk .game-goal-star-state::before,
.lab[data-theme="ledger"] .game-goal-star-state.is-at-risk::before {
  background: var(--lab-warn-mark);
}
.lab[data-theme="ledger"] .game-goal-bonus.is-failed .game-goal-star-state::before,
.lab[data-theme="ledger"] .game-goal-star-state.is-failed::before {
  background: var(--lab-alert);
}
.lab[data-theme="ledger"] .game-goal-fc small,
.lab[data-theme="ledger"] .game-goal-now small {
  font-size: var(--t-xs);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-target {
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-outlook {
  margin-top: 0.35rem;
}
.lab[data-theme="ledger"] .game-col-goals {
  min-height: 0;
  overflow-y: auto;
}
/* The free-play note now closes the lever column. */
.lab[data-theme="ledger"] .game-col-levers .game-freeplay {
  display: block;
  margin-top: 0.9rem;
  border-top: 1px solid var(--lab-line-strong);
  padding-top: 0.6rem;
  font-size: var(--t-xs);
  text-align: left;
}

/* Levers: the label never breaks; "changed" is its own small ink tag on the next line. */
.lab[data-theme="ledger"] .lab-slider-label {
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-lever.is-moved .lab-slider-label::after {
  content: "changed";
  display: block;
  width: fit-content;
  margin-top: 0.2rem;
  border: 1px solid var(--lab-ink);
  padding: 0 0.3em;
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
  line-height: 1.35;
  color: var(--lab-ink);
}

/* Turn track: the game's clock at a size the room can read. 18px squares, the current
   quarter filled ink blue with its code beneath, the years at the secondary size. */
.lab[data-theme="ledger"] .game-progress-track {
  gap: 4px;
}
.lab[data-theme="ledger"] .game-progress-track span {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
}
.lab[data-theme="ledger"] .game-progress-track span.is-now {
  border-color: var(--lab-focus);
  background: var(--lab-focus);
}
.lab[data-theme="ledger"] .game-progress-track span em {
  top: calc(100% + 3px);
  font-size: var(--t-xs);
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-progress-track span em.is-code {
  left: 50%;
  transform: translateX(-50%);
  font-weight: var(--w-bold);
  color: var(--lab-focus);
}
.lab[data-theme="ledger"] .game-progress-track span:first-child em.is-code {
  left: 0;
  transform: none;
}
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-progress {
    padding-bottom: 1.4rem;
  }
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-progress-track {
    gap: 3px;
  }
  .lab[data-theme="ledger"] .game-progress-track span {
    flex: 0 0 13px;
    width: 13px;
    max-width: none;
    height: 13px;
  }
  .lab[data-theme="ledger"] .game-progress-track span em {
    display: none;
  }
  /* Votes and Trust in words on phones too: the figure over its name, never a letter. */
  .lab[data-theme="ledger"] .game-counter-name .is-long {
    display: inline;
  }
  .lab[data-theme="ledger"] .game-counter-name .is-short {
    display: none;
  }
  .lab[data-theme="ledger"] .game-hud .game-counter {
    display: inline-flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: 0;
    padding-left: 0.45rem;
    line-height: 1;
  }
  .lab[data-theme="ledger"] .game-hud .game-counter .game-counter-name {
    font-size: var(--t-axis);
    font-weight: var(--w-regular);
    color: var(--lab-ink);
  }
}

/* Shock card: four numbered decisions, not a printed list. Each is a full-width ink-ruled
   button with its key on the left and "Choose" on the right, which fills on hover/focus. */
.lab[data-theme="ledger"] .game-choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}
.lab[data-theme="ledger"] .game-choice,
.lab[data-theme="ledger"] .game-choice.is-plain,
.lab[data-theme="ledger"] .game-choice:hover,
.lab[data-theme="ledger"] .game-choice.is-plain:hover {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  border: 1px solid var(--lab-ink);
  background: transparent !important;
  padding: 0.6rem 0.7rem;
  text-align: left;
  transform: none;
}
.lab[data-theme="ledger"] .game-choice .game-choice-key {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--lab-ink);
  background: transparent;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-choice .game-choice-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  font-size: var(--t-xs);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-choice .game-choice-body > span:last-child {
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-choice strong {
  font-size: var(--t-md);
}
.lab[data-theme="ledger"] .game-choice .game-choice-go {
  flex: none;
  border: 1px solid var(--lab-ink);
  padding: 0.35rem 0.75rem;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-choice:hover .game-choice-go,
.lab[data-theme="ledger"] .game-choice:focus-visible .game-choice-go {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-choice:focus-visible {
  outline: 2px solid var(--lab-focus);
  outline-offset: 2px;
}
.lab[data-theme="ledger"] .game-shock-where,
.lab[data-theme="ledger"] .game-recap-watch {
  margin-top: 0.6rem;
  border-top: 1px solid var(--lab-ink);
  padding-top: 0.45rem;
  font-size: var(--t-sm);
  line-height: 1.4;
  color: var(--lab-ink);
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-choice .game-choice-go {
    display: none;
  }
  .lab[data-theme="ledger"] .game-choice,
  .lab[data-theme="ledger"] .game-choice.is-plain {
    align-items: flex-start;
  }
}
/* The world stays visible behind the news: a light wash over the island, a stronger one
   over the side columns; on wide screens the card sits over the levers, clear of the town. */
.lab[data-theme="ledger"] .game-modal-backdrop.is-shock {
  background: color-mix(in srgb, var(--lab-bg) 12%, transparent);
}
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-col,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-hud,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-stage-foot {
  opacity: 0.32;
}
@media (min-width: 1180px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-shock {
    justify-content: flex-start;
    padding-left: 1rem;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-shock > .game-shock {
    width: min(34rem, 100%);
  }
}
/* Island tags that must stay up through a card: the district a news card points at, and
   the delta tag after a quarter ends (it stays through the recap). */
.lab[data-theme="ledger"].has-modal .lab-scene-label.has-cue,
.lab[data-theme="ledger"].has-modal .lab-scene-label.is-shocked {
  visibility: visible;
}
.lab[data-theme="ledger"].game .lab-scene-label.has-cue,
.lab[data-theme="ledger"].game .lab-scene-label.is-shocked {
  display: flex !important;
}
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-place {
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
/* Naming: every district tag shows, as its place name alone, on a hairline leader. */
.lab[data-theme="ledger"].game .is-naming .lab-scene-label {
  display: flex !important;
  opacity: 1 !important;
}
.lab[data-theme="ledger"] .is-naming .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.has-cue):not(.is-shocked) .lab-banner-title,
.lab[data-theme="ledger"] .is-naming .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.has-cue):not(.is-shocked) .lab-banner-value,
.lab[data-theme="ledger"] .is-naming .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.has-cue):not(.is-shocked) .lab-banner-sep,
.lab[data-theme="ledger"] .is-naming .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.has-cue):not(.is-shocked) .lab-banner-word,
.lab[data-theme="ledger"] .is-naming .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.has-cue):not(.is-shocked) .lab-banner-next,
.lab[data-theme="ledger"] .is-naming .lab-scene-label:not(.is-pending):not(.is-focus):not(.has-status):not(.has-cue):not(.is-shocked) .lab-banner-delta {
  display: none !important;
}
.lab[data-theme="ledger"] .lab-scene-label.has-cue,
.lab[data-theme="ledger"] .lab-scene-label.is-shocked {
  border-width: 2px;
  z-index: 5;
}
.lab[data-theme="ledger"] .lab-scene-label .lab-banner-cue {
  color: var(--lab-ink);
}

/* Recap, every width: the quarter's move is a fact in ink; the one verdict per goal sits
   on its forecast line; the goal chart sits between them. */
.lab[data-theme="ledger"] .game-recap-label {
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-recap-change {
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-recap-when {
  font-size: var(--t-xs);
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-recap-chart {
  display: block;
  margin-top: 0.2rem;
}
.lab[data-theme="ledger"] .game-recap-goal {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin-top: 0.25rem;
}
.lab[data-theme="ledger"] .game-recap-goal .game-status {
  font-size: var(--t-md);
}
.lab[data-theme="ledger"] .game-recap-goal-text {
  font-size: var(--t-xs);
  line-height: 1.35;
  color: var(--lab-ink);
}
/* Masthead: the nameplate set tight, between a thin rule and the double rule. */
.lab[data-theme="ledger"] .game-recap .game-masthead {
  border-top: 1px solid var(--lab-ink);
  padding-top: 0.4rem;
  letter-spacing: -0.025em !important;
}
.lab[data-theme="ledger"] .game-recap .game-dateline {
  font-size: var(--t-xs);
  font-weight: var(--w-regular);
  color: var(--lab-ink);
}
/* The secondary action stays a hairline outline at every width and in every state. */
.lab[data-theme="ledger"] .game-recap .lab-btn-ghost,
.lab[data-theme="ledger"] .game-recap .lab-btn-ghost:not(:disabled):hover {
  border: 1px solid var(--lab-ink);
  background: transparent;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-recap .lab-btn-ghost:not(:disabled):hover {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

/* Desktop recap: a full-height broadsheet column. What it covers steps aside; the actions
   sit at its foot. */
@media (min-width: 1100px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap > .game-recap {
    display: flex;
    flex-direction: column;
  }
  .lab[data-theme="ledger"] .game-recap .game-recap-actions {
    flex: none;
    margin: 0;
    border-top: 1px solid var(--lab-ink);
    background: var(--lab-paper);
    padding: 0.8rem 1.6rem 1.2rem;
  }
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-hud-actions,
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-hud > [aria-label="Political capital"],
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-end,
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-col-goals {
    visibility: hidden;
  }
}

/* Phone recap: the island gets a band of its own above the sheet (no blank paper, no
   overlap), and the sheet ends clear of its sticky actions. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-scene {
    height: 180px;
    min-height: 0;
    max-height: 180px;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap > .game-card {
    max-height: calc(100dvh - 236px);
  }
  .lab[data-theme="ledger"] .game-recap-chart {
    display: none;
  }
}

/* Channel status words and advisor moods are ink, told apart by weight: green, amber and
   red stay reserved for helps, at risk and hurts. */
.lab[data-theme="ledger"] .game-fw-pill,
.lab[data-theme="ledger"] .game-fw-pill.is-active,
.lab[data-theme="ledger"] .game-fw-pill.is-weak,
.lab[data-theme="ledger"] .game-fw-pill.is-idle,
.lab[data-theme="ledger"] .game-fw-pill.is-blocked,
.lab[data-theme="ledger"] .game-stance,
.lab[data-theme="ledger"] .game-stance.is-worried,
.lab[data-theme="ledger"] .game-stance.is-pleased,
.lab[data-theme="ledger"] .game-stance.is-calm {
  background: transparent !important;
  color: var(--lab-ink) !important;
}
.lab[data-theme="ledger"] .game-fw-pill.is-active,
.lab[data-theme="ledger"] .game-stance.is-worried {
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-pill.is-weak,
.lab[data-theme="ledger"] .game-fw-pill.is-idle,
.lab[data-theme="ledger"] .game-stance.is-calm,
.lab[data-theme="ledger"] .game-stance.is-pleased {
  font-weight: var(--w-regular);
}
.lab[data-theme="ledger"] .game-stance::before,
.lab[data-theme="ledger"] .game-stance::after {
  display: none !important;
}

/* Channels: each channel on its own scale (±1 when every push is under 1, else ±2), drawn
   once per channel under its bars with ticks; labels on their own line above each bar. */
.lab[data-theme="ledger"] .game-fw-channel-scale .game-fw-axis {
  display: none;
}
.lab[data-theme="ledger"] .game-fw-axis.is-row {
  display: flex;
  margin-top: 0.3rem;
  border-top: 1px solid var(--lab-ink);
  background: none;
  padding-top: 0.15rem;
  font-size: var(--t-axis);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-fw-link > span:first-child {
  font-size: var(--t-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lab[data-theme="ledger"] .game-fw-axisbar {
  height: 14px;
}

/* Missions: one border token for the lead mission at every width; locked ones are solid
   hairlines with 60% ink and the lock glyph, not dashed wireframes. */
.lab[data-theme="ledger"] .game-mission.is-lead,
.lab[data-theme="ledger"] .game-mission.is-lead:hover {
  border: 1px solid var(--lab-ink);
  border-top: 2px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-mission.is-locked,
.lab[data-theme="ledger"] .game-mission.is-locked:hover {
  border: 1px solid var(--lab-line-strong);
  color: color-mix(in srgb, var(--lab-ink) 60%, var(--lab-paper));
}

/* Phones: the turn track says how many quarters are left; the words step aside for Votes and Trust. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-progress-head span {
    display: none;
  }
}
.lab[data-theme="ledger"] .game-choice strong {
  color: var(--lab-ink);
}
/* "How it is measured": a regular-weight note with only its lead-in in bold. */
.lab[data-theme="ledger"] .game-dc-note,
.lab[data-theme="ledger"] .game-dc-note * {
  font-weight: var(--w-regular);
}
.lab[data-theme="ledger"] .game-dc-note {
  max-width: 60ch;
  font-size: var(--t-xs);
  line-height: 1.45;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-dc-note strong {
  font-weight: var(--w-bold);
}

/* Missions sheet as a front page: the next mission is the lead story across the full width,
   the rest an index strip below it; the sheet is as tall as its content. */
.lab[data-theme="ledger"] .game-mission-grid {
  grid-auto-rows: auto;
  align-content: start;
}
.lab[data-theme="ledger"] .game-mission-grid > .game-mission-lead {
  order: -1;
  grid-column: 1 / -1;
}
.lab[data-theme="ledger"] .game-mission-grid > li > .game-mission {
  height: 100%;
}
@media (min-width: 1280px) {
  .lab[data-theme="ledger"] .game-mission-grid:has(> .game-mission-lead) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .lab[data-theme="ledger"] .game-mission-grid > li:not(.game-mission-lead) .game-mission-title {
    font-size: var(--t-md);
  }
}

/* Why tiles: charts tall enough to read, with an end dot and the 2027Q4 value. */
.lab[data-theme="ledger"] .game-fw-tile-ends {
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}

/* Desktop recap: the play table reflows to the left of the docked sheet, so the header and
   the island sit beside the paper instead of under it; the goals (the sheet repeats them)
   and the turn's buttons step out until the group plans the next quarter. */
@media (min-width: 1180px) {
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-play {
    margin-right: var(--recap-w);
  }
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-grid {
    grid-template-columns: 18rem minmax(0, 1fr);
  }
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-col-goals,
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-hud-actions,
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-hud > [aria-label="Political capital"] {
    display: none;
  }
  .lab[data-theme="ledger"] .game-recap .game-masthead {
    font-size: var(--t-2xl);
  }
}
.lab[data-theme="ledger"] .game-fw-legend i.is-forecast {
  border-top: 2.5px solid var(--lab-scenario);
}
/* ---- Ledger council, round 4 ------------------------------------------------ */

/* One type scale with a big-screen step: from 1280px every step grows, so a shared screen
   read from a sofa never sets secondary text under 16px. Chart axes use --t-xs too: nothing
   is set smaller than --t-xs anywhere. */
.lab[data-theme="ledger"] {
  --t-axis: var(--t-xs);
  --recap-w: clamp(560px, 48vw, 920px);
}
@media (min-width: 1280px) {
  .lab[data-theme="ledger"] {
    --t-xs: 1rem;
    --t-sm: 1.0625rem;
    --t-md: 1.1875rem;
    --t-lg: 1.5rem;
  }
}

/* Tab strips: one pattern. The rule is drawn by an unmasked wrapper, so it always runs the
   full width; a strip scrolls, snaps and fades its right edge only while its tabs do not
   fit ([data-overflow="true"], set by useStripOverflow). Every tab stretches to the rule. */
.lab[data-theme="ledger"] .game-strip {
  position: relative;
  max-width: 100%;
  border-bottom: 1px solid var(--lab-line-strong);
  background: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-fw-tabs-strip {
  margin-top: 0.8rem;
  border-bottom-color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-jump-strip {
  position: sticky;
  top: 0;
  z-index: 3;
}
.lab[data-theme="ledger"] .game-strip > .game-fw-tabs,
.lab[data-theme="ledger"] .game-strip > .game-dc-metrics,
.lab[data-theme="ledger"] .game-strip > .game-fw-jump,
.lab[data-theme="ledger"] .game-missions-head .lab-segmented {
  position: static;
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 0;
  max-width: 100%;
  margin: 0;
  overflow: visible;
  border-bottom: 0;
  background: transparent;
  padding: 0;
  white-space: nowrap;
  scrollbar-width: none;
  -webkit-mask-image: none;
  mask-image: none;
}
.lab[data-theme="ledger"] .game-missions-head .lab-segmented {
  border: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-strip > .game-fw-tabs > *,
.lab[data-theme="ledger"] .game-strip > .game-dc-metrics > *,
.lab[data-theme="ledger"] .game-strip > .game-fw-jump > *,
.lab[data-theme="ledger"] .game-missions-head .lab-segmented > * {
  flex: none;
  align-self: stretch;
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-strip > .game-fw-tabs[data-overflow="true"],
.lab[data-theme="ledger"] .game-strip > .game-dc-metrics[data-overflow="true"],
.lab[data-theme="ledger"] .game-strip > .game-fw-jump[data-overflow="true"],
.lab[data-theme="ledger"] .game-missions-head .lab-segmented[data-overflow="true"] {
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 2rem;
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 2.5rem), transparent);
  mask-image: linear-gradient(to right, #000 calc(100% - 2.5rem), transparent);
  padding-right: 2.5rem;
}
.lab[data-theme="ledger"] .game-strip > [data-overflow="true"]::-webkit-scrollbar,
.lab[data-theme="ledger"] .game-missions-head .lab-segmented::-webkit-scrollbar {
  display: none;
}
.lab[data-theme="ledger"] [data-overflow="true"] > * {
  scroll-snap-align: start;
}
/* Framework tabs: the same padding in every state, so the black slab reaches the rule and
   holds its subtitle; a divider before every tab but the first, whatever its state. */
.lab[data-theme="ledger"] .game-fw-tabs button,
.lab[data-theme="ledger"] .game-fw-tabs button:hover,
.lab[data-theme="ledger"] .game-fw-tabs button.is-on {
  display: flex;
  align-items: flex-start;
  border: 0;
  border-left: 1px solid var(--lab-line-strong);
  padding: 0.55rem 0.8rem 0.6rem;
  text-align: left;
}
.lab[data-theme="ledger"] .game-fw-tabs button:first-child {
  border-left: 0;
}
.lab[data-theme="ledger"] .game-fw-tabs button.is-on + button {
  border-left-color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-tabs strong {
  display: block;
  line-height: 1.2;
}
.lab[data-theme="ledger"] .game-fw-tabs small {
  display: block;
  margin-top: 0.1rem;
  line-height: 1.25;
}
.lab[data-theme="ledger"] .game-fw-tab-short {
  display: none;
}
/* Phones: short labels, no subtitles; the four tabs share the width without scrolling. */
@media (max-width: 600px) {
  .lab[data-theme="ledger"] .game-fw-tabs button,
  .lab[data-theme="ledger"] .game-fw-tabs button:hover,
  .lab[data-theme="ledger"] .game-fw-tabs button.is-on {
    flex: 1 1 auto;
    justify-content: center;
    padding: 0.5rem 0.35rem;
    text-align: center;
  }
  .lab[data-theme="ledger"] .game-fw-tabs small,
  .lab[data-theme="ledger"] .game-fw-tab-long {
    display: none;
  }
  .lab[data-theme="ledger"] .game-fw-tab-short {
    display: inline;
  }
  .lab[data-theme="ledger"] .game-fw-tabs strong {
    font-size: var(--t-sm);
  }
  .lab[data-theme="ledger"] .game-fw-tab-n {
    margin-right: 0.3em;
  }
}
/* Wide screens: the eleven indicators wrap to two rows instead of scrolling. */
@media (min-width: 900px) {
  .lab[data-theme="ledger"] .game-strip > .game-dc-metrics {
    flex-wrap: wrap;
  }
}
/* Missions sheet on a phone: the four modes as a two-by-two grid, nothing cut. */
@media (max-width: 480px) {
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented > * + * {
    border-left: 1px solid var(--lab-ink);
  }
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented > :nth-child(3) {
    border-left: 0;
  }
  .lab[data-theme="ledger"] .game-missions-head .lab-segmented > :nth-child(n + 3) {
    border-top: 1px solid var(--lab-ink);
  }
}

/* Recap: the Ledger nameplate, set apart from every other heading: the heaviest weight at
   the largest size, between a thick rule and a thin one, with the quarter's edition mark. */
.lab[data-theme="ledger"] .game-masthead-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border-top: 4px solid var(--lab-ink);
  border-bottom: 1px solid var(--lab-ink);
  padding: 0.35rem 0 0.4rem;
}
.lab[data-theme="ledger"] .game-recap .game-masthead-row .game-masthead {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  padding: 0;
  font-size: clamp(1.9rem, 3vw, var(--t-3xl));
  font-weight: var(--w-bold);
  line-height: 1;
  letter-spacing: -0.03em !important;
  text-align: left;
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-edition-mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.45em;
  border: 3px double var(--lab-ink);
  padding: 0.3rem 0.55rem;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  line-height: 1;
  color: var(--lab-ink);
  transform: rotate(-2deg);
  animation: game-stamp-in 420ms cubic-bezier(0.2, 1.4, 0.4, 1) 250ms both;
}
.lab[data-theme="ledger"] .game-edition-mark i {
  display: inline-block;
  width: 0.7em;
  height: 0.7em;
  background: var(--lab-good-mark);
}
.lab[data-theme="ledger"] .game-edition-mark.is-warn i {
  border: 2px solid var(--lab-warn-mark);
  background: transparent;
}
.lab[data-theme="ledger"] .game-edition-mark.is-bad i {
  border: 2px solid var(--lab-alert);
  background: transparent;
}
@keyframes game-stamp-in {
  from {
    opacity: 0;
    transform: rotate(-2deg) scale(1.6);
  }
  to {
    opacity: 1;
    transform: rotate(-2deg) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .lab[data-theme="ledger"] .game-edition-mark {
    animation: none;
  }
}
.lab[data-theme="ledger"] .game-recap .game-dateline {
  border-bottom: 0;
}

/* Votes and trust beside the goals: two ruled figures, before and after. */
.lab[data-theme="ledger"] .game-recap-capital {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0.8rem 0 0;
  border-top: 1px solid var(--lab-ink);
  border-bottom: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-recap-capital > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.45rem 0.8rem 0.45rem 0;
}
.lab[data-theme="ledger"] .game-recap-capital > div + div {
  border-left: 1px solid var(--lab-line-strong);
  padding-left: 0.8rem;
}
.lab[data-theme="ledger"] .game-recap-capital dt {
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-recap-capital dd {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin: 0;
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-recap-capital dd b {
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-recap-capital-was {
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-recap-capital-d {
  margin-left: 0.2rem;
  font-weight: var(--w-semi);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-recap-capital-d.is-up,
.lab[data-theme="ledger"] .game-recap-capital-d.is-down {
  color: var(--lab-ink);
}

/* While the recap is open the levers step back (dimmed, not live) and the advisers give
   their seat to the paper, which carries their notes; the island stays in full colour. */
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-col-levers {
  opacity: 0.4;
  filter: grayscale(1);
  pointer-events: none;
  user-select: none;
}
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-stage-foot .game-advisors {
  visibility: hidden;
}
@media (min-width: 1100px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap {
    background: transparent;
  }
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-stage-foot {
    display: none;
  }
}
/* A recap body that scrolls fades into paper above the actions rule, and ends clear of it. */
.lab[data-theme="ledger"] .game-recap > .game-recap-body {
  padding-bottom: 1.6rem;
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 1.4rem), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 1.4rem), transparent);
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-masthead-row {
    flex-wrap: wrap;
    gap: 0.35rem 0.8rem;
  }
  .lab[data-theme="ledger"] .game-recap .game-masthead-row .game-masthead {
    flex-basis: 100%;
    font-size: clamp(1.6rem, 8vw, 2.4rem);
  }
  .lab[data-theme="ledger"] .game-edition-mark {
    font-size: var(--t-xs);
  }
}

/* Sparklines: drawn in CSS pixels at the column's width; their text takes --t-sm. */
.lab[data-theme="ledger"] .game-spark {
  display: block;
  width: 100%;
  margin-top: 0.45rem;
  font-size: var(--t-sm);
  line-height: 0;
}
.lab[data-theme="ledger"] .game-spark > svg {
  display: block;
  overflow: visible;
}
.lab[data-theme="ledger"] .game-spark text {
  font-family: var(--lab-font-ui);
}
.lab[data-theme="ledger"] .game-goal-key i.is-past {
  border-top: 2px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-key i.is-fc {
  border-top: 3px solid var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-goal-key i.is-ghost {
  border-top: 2px dotted var(--lab-ink-2);
}
/* Why tiles: the whole card is the link; its title underlines on hover and focus. */
.lab[data-theme="ledger"] .game-fw-tile:hover .game-fw-tile-label,
.lab[data-theme="ledger"] .game-fw-tile:focus-visible .game-fw-tile-label {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}
.lab[data-theme="ledger"] .game-fw-tile-ends {
  display: block;
  white-space: normal;
  font-size: var(--t-xs);
  color: var(--lab-ink);
}

/* "Your move": its own ruled line under the forecast figure, set large and bold, so the
   thing that reacts to the slider reads from across the room. */
.lab[data-theme="ledger"] .game-goal > .game-goal-move {
  display: flex;
  align-items: baseline;
  min-height: 2.2rem;
  margin: 0.35rem 0 0.2rem;
  border-top: 1px solid var(--lab-line-strong);
  border-bottom: 1px solid var(--lab-line-strong);
  padding: 0.25rem 0;
}
.lab[data-theme="ledger"] .game-goal > .game-goal-move:empty {
  display: none;
}
.lab[data-theme="ledger"] .game-goal > .game-goal-move .game-move-chip,
.lab[data-theme="ledger"] .game-goal > .game-goal-move .game-probe-chip {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.35rem;
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
  line-height: 1.2;
}
.lab[data-theme="ledger"] .game-goal > .game-goal-move small {
  margin-right: 0.2rem;
  font-size: var(--t-sm);
  font-weight: var(--w-regular);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal > .game-goal-move .game-valence {
  margin-left: 0.25rem;
  font-size: var(--t-sm);
}

/* Phone dock: one row per goal, the level with its status word, then the move with its
   helps/hurts word, at --t-md. */
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-move-strip {
    flex-direction: column;
    gap: 0.15rem;
    font-size: var(--t-md);
  }
  .lab[data-theme="ledger"] .game-move-strip-item {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0 0.6rem;
  }
  .lab[data-theme="ledger"] .game-move-strip-level .game-status {
    font-size: var(--t-sm);
  }
  .lab[data-theme="ledger"] .game-move-strip .game-move-strip-d {
    gap: 0.2rem;
    color: var(--lab-ink);
  }
  .lab[data-theme="ledger"] .game-move-strip .game-move-strip-d .game-valence {
    margin-left: 0.15rem;
    font-size: var(--t-sm);
  }
}

/* Phones: the framework is a full-height sheet over the HUD; a one-line title beside
   Close, the tab strip under it, and the body scrolling below both. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-modal-backdrop > .game-card.game-fw {
    inset: 0;
    max-height: none;
    border-top: 0;
    padding: 0.6rem 1rem 0;
  }
  .lab[data-theme="ledger"] .game-fw-head {
    align-items: center;
    border-bottom: 3px double var(--lab-ink);
    padding-bottom: 0.5rem;
  }
  .lab[data-theme="ledger"] .game-fw-head .game-eyebrow {
    font-size: var(--t-lg);
    font-weight: var(--w-bold);
    line-height: 1.2;
    color: var(--lab-ink);
  }
  .lab[data-theme="ledger"] .game-fw-head h2,
  .lab[data-theme="ledger"] .game-fw-head > div > p:not(.game-eyebrow) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .lab[data-theme="ledger"] .game-fw-tabs-strip {
    margin-top: 0.5rem;
  }
  .lab[data-theme="ledger"] .game-fw-place {
    display: none;
  }
}

/* Wide screens: the commit sits in the lever rail directly under the levers: End is the
   one black slab, Skip a hairline under it. */
.lab[data-theme="ledger"] .game-end.is-rail {
  position: static;
  min-width: 0;
  margin-top: 0.9rem;
  border: 0;
  border-top: 3px double var(--lab-ink);
  background: transparent;
  padding: 0.7rem 0 0;
}
.lab[data-theme="ledger"] .game-end.is-rail .game-end-note {
  text-align: left;
}
.lab[data-theme="ledger"] .game-end.is-rail .game-end-btn {
  width: 100%;
}
.lab[data-theme="ledger"] .game-end.is-rail .game-skip-btn {
  width: 100%;
}
/* The decisions log closes the Goals column on wide screens. */
.lab[data-theme="ledger"] .game-col-goals > .game-log {
  margin-top: 0.9rem;
  border-top: 3px double var(--lab-ink);
}
.lab[data-theme="ledger"] .game-menu-hint {
  max-width: 22rem;
  border-top: 1px solid var(--lab-line);
  padding: 0.5rem 0.75rem 0.6rem;
  font-size: var(--t-sm);
  line-height: 1.4;
  color: var(--lab-ink);
}

/* The freed row under the island: a full-width advisor strip, one line per advisor; the
   stance shows (square and word) only when it isn't "Steady"; no role line. */
@media (min-width: 1180px) {
  .lab[data-theme="ledger"] .game-stage-foot {
    grid-template-columns: minmax(0, 1fr);
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-advisors {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-advice {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-advice:last-child {
    border-bottom: 1px solid var(--lab-line-strong);
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-portrait {
    width: 32px;
    height: 32px;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-advice > div {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 0.6rem;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-advice > div > div:first-child {
    width: auto;
    flex: none;
    align-items: baseline;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-advice > div > div:first-child > span:first-child > span {
    display: none;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-stance.is-calm {
    display: none;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-stance::before {
    content: "";
    display: inline-block !important;
    width: 0.6em;
    height: 0.6em;
    margin-right: 0.3em;
    border: 1.5px solid var(--lab-ink);
    vertical-align: 0.02em;
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-stance.is-worried::before {
    background: var(--lab-ink);
  }
  .lab[data-theme="ledger"] .game-stage-foot .game-advice-text {
    flex: 1 1 20rem;
    margin: 0;
  }
}

/* Phones: one Why tile per row, so each chart is drawn at the full width with its labels
   at full size. */
@media (max-width: 480px) {
  .lab[data-theme="ledger"] .game-fw-section .game-fw-overview {
    grid-template-columns: minmax(0, 1fr);
  }
}
/* The phone dock: content scrolling under it fades into paper above its rule, so no line
   of text ever meets the rule head-on. */
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-end:not(.is-rail)::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 3px);
    height: 1.5rem;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--lab-bg) 0%, transparent), var(--lab-bg));
    pointer-events: none;
  }
}

/* Key chips appear only once someone has pressed a key: a TV screen shows none. */
.lab[data-theme="ledger"]:not(.has-kbd) kbd:not(.game-choice-key) {
  display: none !important;
}

/* Shock card: each option a full-width button; its number a keycap (a heavier bottom
   edge); on phones a compact outlined "Choose" stays at the right of the title line. */
.lab[data-theme="ledger"] .game-choice .game-choice-key {
  border: 1px solid var(--lab-ink);
  border-bottom-width: 3px;
  padding-top: 1px;
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-choice,
  .lab[data-theme="ledger"] .game-choice.is-plain {
    position: relative;
  }
  .lab[data-theme="ledger"] .game-choice .game-choice-go {
    position: absolute;
    top: 0.55rem;
    right: 0.6rem;
    display: inline-block;
    padding: 0.15rem 0.5rem;
    font-size: var(--t-xs);
  }
  .lab[data-theme="ledger"] .game-choice .game-choice-body > :first-child {
    padding-right: 4.6rem;
  }
}
/* While the card is open: one even paper dim over the columns and the HUD, the island only
   lightly washed so the pending district's pulse still shows; its tags and news step out,
   and End and Skip wait out of sight until the card closes. */
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-col,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-hud,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-stage-foot {
  opacity: 0.3;
  filter: grayscale(1);
}
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-scene-news,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .lab-scene-label,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-scene-strip {
  visibility: hidden !important;
}
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-end {
  visibility: hidden;
}

/* Units: one treatment everywhere, as on the recap: tight after the figure, a step smaller. */
.lab[data-theme="ledger"] .game-unit {
  margin-left: 0.08em;
  font-size: 0.82em;
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-goal-figures > .game-goal-fc {
  grid-template-columns: auto 1fr;
  column-gap: 0;
}
.lab[data-theme="ledger"] .game-goal-figures > .game-goal-fc .game-goal-unit {
  justify-self: start;
  margin-left: 0.08em;
}

/* Channels: one shared scale; no frame, only the zero line (FT style); tick labels inset. */
.lab[data-theme="ledger"] .game-fw-channel-bars {
  background-image: linear-gradient(var(--lab-ink), var(--lab-ink));
  background-size: 1px 100%;
  background-position: 50% 0;
}
.lab[data-theme="ledger"] .game-fw-axis.is-row {
  justify-content: space-between;
  border-top: 0;
  padding: 0.15rem 0.35rem 0;
}
/* Phones: the framework's one-line title is its eyebrow, shown even where the other
   header lines step out. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-fw-head > div > p.game-eyebrow {
    display: block;
  }
}

/* Decomposition key: the quarter shown and the end of the forecast, side by side, so the
   table answers the chart's whole path. */
.lab[data-theme="ledger"] .game-dc-table thead th {
  border-bottom: 1px solid var(--lab-ink);
  padding: 0 0 0.25rem 0.75rem;
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
  text-align: right;
  white-space: nowrap;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-dc-table td + td {
  padding-left: 0.75rem;
}

/* ---- Ledger council, round 5 ------------------------------------------------ */

/* Docks and scroll panes, one rule: a pane above a dock ends a dock's height plus a line
   clear of it; every dock is solid paper under one ink hairline, with no fade above it, so
   text slides cleanly under a rule. */
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-play {
    padding-bottom: calc(var(--sticky-h, 9rem) + env(safe-area-inset-bottom) + 1rem);
  }
  .lab[data-theme="ledger"] .game-end:not(.is-rail) {
    border-top: 1px solid var(--lab-ink);
    background: var(--lab-paper);
  }
  .lab[data-theme="ledger"] .game-end:not(.is-rail)::before {
    display: none;
  }
}
.lab[data-theme="ledger"] .game-recap > .game-recap-actions {
  border-top: 1px solid var(--lab-ink);
  background: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-fw-body {
  padding-bottom: 1.5rem;
}
.lab[data-theme="ledger"] .game-recap > .game-recap-watch,
.lab[data-theme="ledger"] .game-recap-body > .game-recap-watch {
  margin: 0 0 0.6rem;
  border-top: 0;
  border-bottom: 1px solid var(--lab-line-strong);
  padding: 0.45rem 0 0.5rem;
}

/* The agenda leads with one line; its note runs on in plain text, its list behind "More". */
.lab[data-theme="ledger"] .game-agenda strong .game-agenda-note {
  display: inline;
  margin: 0;
  font-size: var(--t-sm);
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-agenda-more > summary {
  width: fit-content;
  cursor: pointer;
  font-size: var(--t-sm);
  color: var(--lab-ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.lab[data-theme="ledger"] .game-agenda-more > summary::-webkit-details-marker {
  display: none;
}
.lab[data-theme="ledger"] .game-agenda-more > summary {
  list-style: none;
}

/* The island fills its frame to the bottom rule: behind the canvas lies the open sea, so a
   frame drawn a beat before a resize never shows a band of blank paper. */
.lab[data-theme="ledger"] .game-scene:has(canvas) {
  background: #136da0;
}
.lab[data-theme="ledger"] .game-agenda-more[open] > summary {
  margin-bottom: 0.2rem;
}

/* Shock card: every Choose outlined at rest on every screen; the fill is for a real hover
   (a mouse) or keyboard focus, never a touch that sticks. The option number is a plain
   1px ink square. */
.lab[data-theme="ledger"] .game-choice:hover .game-choice-go {
  background: transparent;
  color: var(--lab-ink);
}
@media (hover: hover) {
  .lab[data-theme="ledger"] .game-choice:hover .game-choice-go {
    background: var(--lab-ink);
    color: var(--lab-paper);
  }
}
.lab[data-theme="ledger"] .game-choice:focus-visible .game-choice-go {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-choice .game-choice-key {
  border: 1px solid var(--lab-ink);
  border-bottom-width: 1px;
  box-shadow: none;
  padding-top: 0;
}
.lab[data-theme="ledger"] .game-outcome.is-hold {
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
}
/* Wide screens: the card hangs below the HUD, never over the mission title. */
@media (min-width: 1180px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-shock {
    align-items: flex-start;
    padding-top: calc(var(--hud-h, 5.5rem) + 0.75rem);
    padding-bottom: 0.75rem;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-shock > .game-shock {
    max-height: calc(100dvh - var(--hud-h, 5.5rem) - 1.5rem);
    margin: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}

/* Channels: the zero line stops at the axis rule, so the "0" under it is never struck
   through; the end labels sit centred on the bars' ends. A bar past the scale's end is cut
   with a paper notch. */
.lab[data-theme="ledger"] .game-fw-channel-bars {
  background-size: 1px calc(100% - 1.45rem);
}
.lab[data-theme="ledger"] .game-fw-channel-bars:not(:has(.game-fw-axis.is-row)) {
  background-size: 1px 100%;
}
.lab[data-theme="ledger"] .game-fw-axis.is-row {
  padding: 0.2rem 0 0;
}
.lab[data-theme="ledger"] .game-fw-axis.is-row > span:first-child {
  transform: translateX(-50%);
}
.lab[data-theme="ledger"] .game-fw-axis.is-row > span:last-child {
  transform: translateX(50%);
}
.lab[data-theme="ledger"] .game-fw-axisbar-fill.is-over::after {
  content: "";
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 3px;
  background: var(--lab-paper);
  transform: skewX(-18deg);
}
.lab[data-theme="ledger"] .game-fw-axisbar-fill.is-pos.is-over::after {
  right: 7px;
}
.lab[data-theme="ledger"] .game-fw-axisbar-fill.is-neg.is-over::after {
  left: 7px;
}

/* Why tab: the four multiples fill the fixed frame (their charts are sized in Framework.tsx)
   and "Dig deeper" sits on the frame's bottom rule. */
.lab[data-theme="ledger"] .game-fw-body {
  display: flex;
  flex-direction: column;
}
.lab[data-theme="ledger"] .game-fw-body > .game-fw-pane {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
}
.lab[data-theme="ledger"] .game-fw-pane > .game-fw-section.is-why {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
}
.lab[data-theme="ledger"] .game-fw-section.is-why > .game-fw-next {
  margin-top: auto;
}

/* Shocks vs policy: the key's swatches in full colour, as on the bars. */
.lab[data-theme="ledger"] .game-dc-table button i {
  opacity: 1;
  filter: none;
}
.lab[data-theme="ledger"] .game-dc-table tr:not(.is-off) .game-dc-label {
  color: var(--lab-ink);
}

/* Phones: strips wrap onto a second row instead of scrolling (no label cut mid-word); the
   sector tables keep a small trend column and fold the quarter's change under the level;
   the decomposition table gives its label the room and its numbers only what they need. */
.lab[data-theme="ledger"] .game-fw-dq-inline {
  display: none;
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-strip > .game-fw-jump,
  .lab[data-theme="ledger"] .game-strip > .game-fw-jump[data-overflow="true"],
  .lab[data-theme="ledger"] .game-strip > .game-dc-metrics,
  .lab[data-theme="ledger"] .game-strip > .game-dc-metrics[data-overflow="true"] {
    flex-wrap: wrap;
    overflow: visible;
    padding-right: 0;
    -webkit-mask-image: none;
    mask-image: none;
  }
  .lab[data-theme="ledger"] .game-strip > .game-fw-jump > *,
  .lab[data-theme="ledger"] .game-strip > .game-dc-metrics > * {
    flex: 0 1 auto;
  }
  .lab[data-theme="ledger"] .game-fw-table {
    width: 100%;
    font-size: var(--t-xs);
  }
  .lab[data-theme="ledger"] .game-fw-table th,
  .lab[data-theme="ledger"] .game-fw-table td {
    padding-inline: 0.2rem;
  }
  .lab[data-theme="ledger"] .game-fw-table th:first-child {
    padding-left: 0;
    white-space: normal;
  }
  .lab[data-theme="ledger"] .game-fw-table td:last-child,
  .lab[data-theme="ledger"] .game-fw-table th:last-child {
    padding-right: 0;
  }
  .lab[data-theme="ledger"] .game-fw-table thead th {
    white-space: normal;
    vertical-align: bottom;
  }
  .lab[data-theme="ledger"] .game-fw-spark-col {
    display: table-cell;
    width: 48px;
  }
  .lab[data-theme="ledger"] .game-fw-spark-col svg {
    width: 48px;
    height: auto;
  }
  .lab[data-theme="ledger"] .game-fw-dq-inline {
    display: block;
    font-size: var(--t-axis);
    font-weight: var(--w-regular);
    line-height: 1.2;
    white-space: nowrap;
    color: var(--lab-ink-2);
  }
  .lab[data-theme="ledger"] .game-fw-effect {
    white-space: normal;
  }
  .lab[data-theme="ledger"] .game-fw-effect .game-valence {
    display: flex;
    justify-content: flex-end;
    margin: 0.15rem 0 0;
  }
  .lab[data-theme="ledger"] .game-dc-table th[scope="row"] {
    width: auto;
  }
  .lab[data-theme="ledger"] .game-dc-table td {
    width: 1%;
    white-space: nowrap;
  }
  .lab[data-theme="ledger"] .game-dc-table thead th:not(:first-child) {
    width: 1%;
    min-width: 4.5rem;
    white-space: normal;
  }
}

/* Phone recap: the island gets a taller band and no tags on it; the districts that moved are
   named in one ruled line along its foot. */
.lab[data-theme="ledger"] .game-scene-recapline {
  display: none;
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-scene {
    height: max(240px, 32vh);
    max-height: max(240px, 32vh);
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-recap > .game-card {
    max-height: calc(100dvh - max(240px, 32vh) - 56px);
  }
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .lab-scene-label {
    display: none !important;
  }
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-scene-recapline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: block;
    margin: 0;
    border-top: 1px solid var(--lab-ink);
    background: var(--lab-paper);
    padding: 0.3rem 0.75rem;
    font-size: var(--t-xs);
    line-height: 1.3;
    color: var(--lab-ink);
  }
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-recap) .game-recap-body > .game-recap-watch {
    display: none;
  }
}

/* One marker shape per meaning, so the status survives without colour: a filled square for
   on track and helps, a half-filled square for at risk, a hollow square for missed and
   hurts. */
.lab[data-theme="ledger"] .game-status.is-at-risk::before,
.lab[data-theme="ledger"] .lab-banner-status.is-at-risk::before,
.lab[data-theme="ledger"] .game-goal-bonus.is-at-risk .game-goal-star-state::before,
.lab[data-theme="ledger"] .game-valence.is-warn .game-valence-mark {
  box-sizing: border-box;
  border: 1.5px solid var(--lab-warn-mark);
  background: linear-gradient(to top, var(--lab-warn-mark) 50%, transparent 50%);
}
.lab[data-theme="ledger"] .game-status.is-failed::before,
.lab[data-theme="ledger"] .lab-banner-status.is-failed::before,
.lab[data-theme="ledger"] .game-goal-bonus.is-failed .game-goal-star-state::before {
  box-sizing: border-box;
  border: 1.5px solid var(--lab-alert);
  background: transparent;
}
.lab[data-theme="ledger"] .game-valence.is-warn {
  color: var(--lab-warn);
}

/* Goal card: the verdict at body size and regular weight with its square ("Goal: on
   track"); the bonus row names itself "Bonus star"; bold is kept for figures and the one
   verdict word. */
.lab[data-theme="ledger"] .game-goal-head .game-goal-verdict {
  font-size: var(--t-sm);
  font-weight: var(--w-semi);
  white-space: nowrap;
}
.lab[data-theme="ledger"] .game-goal-verdict-k {
  font-weight: var(--w-regular);
}
.lab[data-theme="ledger"] .game-goal-target,
.lab[data-theme="ledger"] .game-goal-side,
.lab[data-theme="ledger"] .game-goal-sub,
.lab[data-theme="ledger"] .game-outcome-name {
  font-weight: var(--w-regular);
}
.lab[data-theme="ledger"] .game-goal-bonus .game-goal-star-state {
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-goal-bonus-what {
  display: block;
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-recap-change .game-valence {
  margin-left: 0.5em;
  vertical-align: 0.15em;
}

/* Phones: the title balances over its lines instead of orphaning a word. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-title {
    font-size: 2.5rem;
    text-wrap: balance;
  }
}


/* ---- Ledger council, round 5 (b) -------------------------------------------- */

/* Scroll panes above a footer, one rule: each pane ends a footer's height clear of it
   (--footer-h), keyboard focus stops clear of it too, and while there is more below the
   fold its bottom edge fades into paper over 3rem, so a cut line reads as "more below",
   never as a rendering bug. At the end of the pane there is no fade at all. */
.lab[data-theme="ledger"] .game-recap > .game-recap-body,
.lab[data-theme="ledger"] .game-fw-body {
  --footer-h: 2.75rem;
  padding-bottom: var(--footer-h);
  scroll-padding-bottom: var(--footer-h);
  -webkit-mask-image: none;
  mask-image: none;
}
.lab[data-theme="ledger"] .game-recap > .game-recap-body[data-more="true"],
.lab[data-theme="ledger"] .game-fw-body[data-more="true"] {
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 3rem), rgb(0 0 0 / 0.35) calc(100% - 1.25rem), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 3rem), rgb(0 0 0 / 0.35) calc(100% - 1.25rem), transparent);
}
@media (max-width: 1179px) {
  .lab[data-theme="ledger"] .game-col-levers {
    --footer-h: var(--sticky-h, 9rem);
    scroll-margin-bottom: var(--footer-h);
  }
  .lab[data-theme="ledger"] .game-col-levers .lab-range,
  .lab[data-theme="ledger"] .game-col-levers .lab-step,
  .lab[data-theme="ledger"] .game-col-levers p {
    scroll-margin-bottom: calc(var(--sticky-h, 9rem) + 1rem);
  }
}

/* The news card hangs under the HUD, over the levers column (idle while it is open), and
   stops short of the town so the pulsing district stays in view. No scrim anywhere: the
   island keeps its colours and the goals keep full contrast; only the levers under the card
   and the End bar step out. */
.lab[data-theme="ledger"] .game-modal-backdrop.is-shock {
  background: transparent;
}
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-col,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-hud,
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-stage-foot {
  opacity: 1;
  filter: none;
}
@media (min-width: 1180px) {
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-col-levers,
  .lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .game-stage-foot {
    visibility: hidden;
  }
}
.lab[data-theme="ledger"]:has(.game-modal-backdrop.is-shock) .lab-scene-label.is-shocked {
  visibility: visible !important;
}
@media (min-width: 1180px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-shock {
    align-items: flex-start;
    justify-content: flex-start;
    overflow: hidden;
    padding: calc(var(--hud-h, 5.5rem) + 1rem) 1rem 1rem;
  }
  .lab[data-theme="ledger"] .game-modal-backdrop.is-shock > .game-shock {
    width: min(33rem, 40vw);
    max-height: calc(100dvh - var(--hud-h, 5.5rem) - 2rem);
    margin: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-modal-backdrop.is-shock > .game-card {
    max-height: calc(100dvh - var(--hud-h, 3.5rem) - 7.5rem);
  }
}
/* The card's head: one full-width Ledger double rule, then the kicker (which names the
   district the news hits) and the headline at display size. No colour bar, no short rule. */
.lab[data-theme="ledger"] .game-card.game-shock {
  border: 1px solid var(--lab-ink);
  border-top: 4px double var(--lab-ink);
  border-bottom: 3px double var(--lab-ink);
}
.lab[data-theme="ledger"] .game-shock-kicker {
  display: block;
  margin: 0 0 0.25rem;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  line-height: 1.3;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-shock-kicker-where {
  font-weight: var(--w-regular);
}
.lab[data-theme="ledger"] .game-shock .game-shock-title {
  margin: 0 0 0.35rem;
  font-size: var(--t-xl);
  line-height: 1.05;
  text-wrap: balance;
}
.lab[data-theme="ledger"] .game-shock-dek {
  font-size: var(--t-sm);
  line-height: 1.45;
}

/* Each option is the button: the card itself, its number key the affordance. Hover and
   keyboard focus thicken the hairline to 2px (an inset ring, so nothing shifts) and focus
   adds the ink outline; nothing ever fills like the primary button. Labels are regular;
   bold is kept for the size of the move and the helps/hurts word. */
.lab[data-theme="ledger"] .game-choice,
.lab[data-theme="ledger"] .game-choice.is-plain,
.lab[data-theme="ledger"] .game-choice:hover,
.lab[data-theme="ledger"] .game-choice.is-plain:hover {
  position: relative;
  align-items: flex-start;
  border: 1px solid var(--lab-ink);
  background: transparent !important;
  cursor: pointer;
}
.lab[data-theme="ledger"] .game-choice:hover,
.lab[data-theme="ledger"] .game-choice:focus-visible {
  box-shadow: inset 0 0 0 1px var(--lab-ink);
}
.lab[data-theme="ledger"] .game-choice:focus-visible {
  outline: 2px solid var(--lab-ink);
  outline-offset: 3px;
}
.lab[data-theme="ledger"] .game-choice .game-choice-key {
  margin-top: 0.1rem;
}
.lab[data-theme="ledger"] .game-choice:hover .game-choice-key,
.lab[data-theme="ledger"] .game-choice:focus-visible .game-choice-key {
  border-width: 2px;
}
.lab[data-theme="ledger"] .game-choice .game-choice-body > :first-child {
  padding-right: 0;
}
.lab[data-theme="ledger"] .game-choice .game-choice-head {
  display: block;
}
.lab[data-theme="ledger"] .game-choice .game-outcomes {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.05rem;
}
.lab[data-theme="ledger"] .game-choice .game-outcome,
.lab[data-theme="ledger"] .game-choice .game-outcome.is-hold {
  font-size: var(--t-sm);
  font-weight: var(--w-regular);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-choice .game-outcome.is-hold {
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-choice .game-outcome-d {
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-choice .game-valence {
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-choice .game-choice-detail {
  font-size: var(--t-xs);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-choice .game-choice-go {
  display: none;
}

/* Recap masthead: the verdict sits in a flat, double-ruled ear at the top right, in
   sentence case with its square; it fades in, it does not stamp. Headlines balance. */
.lab[data-theme="ledger"] .game-edition-mark {
  transform: none;
  border: 3px double var(--lab-ink);
  padding: 0.35rem 0.65rem;
  font-weight: var(--w-bold);
  animation: game-fade var(--dur-slow) var(--ease) 250ms both;
}
@media (prefers-reduced-motion: reduce) {
  .lab[data-theme="ledger"] .game-edition-mark {
    animation: none;
  }
}
.lab[data-theme="ledger"] .game-headline,
.lab[data-theme="ledger"] .game-title {
  text-wrap: balance;
}

/* Reaction: one quote from each advisor under the headline, with portrait and mood (a
   square and a word). Ink, rules and type only. */
.lab[data-theme="ledger"] .game-reactions {
  margin: 0 0 0.8rem;
  border-bottom: 1px solid var(--lab-line-strong);
  padding-bottom: 0.7rem;
}
.lab[data-theme="ledger"] .game-reactions-title {
  margin: 0 0 0.35rem;
  font-size: var(--t-xs);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-reactions ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 1.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.lab[data-theme="ledger"] .game-reaction {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}
.lab[data-theme="ledger"] .game-reaction + .game-reaction {
  border-left: 1px solid var(--lab-line-strong);
  padding-left: 1.2rem;
  margin-left: -0.6rem;
}
.lab[data-theme="ledger"] .game-reaction .game-portrait {
  flex: none;
  width: 40px;
  height: 40px;
}
.lab[data-theme="ledger"] .game-reaction-who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.5rem;
  margin: 0;
  font-size: var(--t-xs);
  line-height: 1.3;
}
.lab[data-theme="ledger"] .game-reaction-mood {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3em;
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-reaction-mood i {
  display: inline-block;
  box-sizing: border-box;
  width: 0.62em;
  height: 0.62em;
  border: 1.5px solid var(--lab-ink);
  background: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-reaction-mood.is-pleased i {
  border-color: var(--lab-good-mark);
  background: var(--lab-good-mark);
}
.lab[data-theme="ledger"] .game-reaction-mood.is-worried i {
  border-color: var(--lab-warn-mark);
  background: linear-gradient(to top, var(--lab-warn-mark) 50%, transparent 50%);
}
.lab[data-theme="ledger"] .game-reaction-quote {
  margin: 0.1rem 0 0;
  font-size: var(--t-sm);
  line-height: 1.4;
  color: var(--lab-ink);
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-reactions ul {
    grid-template-columns: minmax(0, 1fr);
  }
  .lab[data-theme="ledger"] .game-reaction + .game-reaction {
    border-left: 0;
    border-top: 1px solid var(--lab-line);
    margin-left: 0;
    padding: 0.45rem 0 0;
  }
}

/* The score: Votes and Trust as a two-cell box, the new figure at display size counting up
   with the goals' figures, the change beside it. */
.lab[data-theme="ledger"] .game-recap-capital {
  border-top: 3px double var(--lab-ink);
  border-bottom: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-recap-capital > div {
  align-items: center;
  padding-block: 0.5rem;
}
.lab[data-theme="ledger"] .game-recap-capital dd {
  align-items: baseline;
  gap: 0.6rem;
}
.lab[data-theme="ledger"] .game-recap-capital dd b {
  font-size: var(--t-xl);
  line-height: 1;
}
.lab[data-theme="ledger"] .game-recap-capital-d {
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-recap-capital-d .game-recap-capital-was {
  margin-left: 0.3em;
  font-weight: var(--w-regular);
}

/* The island's key: what each district's motion means, and where it is heading. */
.lab[data-theme="ledger"] .game-scene-strip.is-key {
  font-size: var(--t-sm);
}
.lab[data-theme="ledger"] .game-scene-strip.is-key b {
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-scene-strip-flat {
  color: var(--lab-ink-2);
}

/* HUD: Votes and Trust, the score, at the turn track's size, in ink. */
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-hud .game-counter .game-counter-name,
  .lab[data-theme="ledger"] .game-hud .game-counter strong {
    font-size: var(--t-md);
    color: var(--lab-ink);
  }
  .lab[data-theme="ledger"] .game-hud .game-counter .game-counter-name {
    font-weight: var(--w-semi);
  }
}
/* Turn track: a known shock is named under its square in words, not an unlabelled tick. */
.lab[data-theme="ledger"] .game-progress-track span.has-shock::after {
  display: none;
}
.lab[data-theme="ledger"] .game-progress-track span em.is-flag {
  color: var(--lab-ink-2);
}

/* Shocks vs policy: the key on the chart, which is also its show/hide control. */
.lab[data-theme="ledger"] .game-dc-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1.1rem;
  margin: 0 0 0.35rem;
  font-size: var(--t-xs);
}
.lab[data-theme="ledger"] .game-dc-legend button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 0;
  background: transparent;
  padding: 0.1rem 0;
  font-weight: var(--w-semi);
  color: var(--lab-ink);
  cursor: pointer;
}
.lab[data-theme="ledger"] .game-dc-legend button:hover,
.lab[data-theme="ledger"] .game-dc-legend button:focus-visible {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.lab[data-theme="ledger"] .game-dc-legend button.is-off {
  font-weight: var(--w-regular);
  color: var(--lab-ink-2);
  text-decoration: line-through;
}
.lab[data-theme="ledger"] .game-dc-legend i {
  display: inline-block;
  width: 0.85em;
  height: 0.85em;
}
.lab[data-theme="ledger"] .game-dc-legend button.is-off i {
  opacity: 0.35;
}
.lab[data-theme="ledger"] .game-dc-legend i.is-hatch {
  background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--dc-momentum) 55%, transparent) 0 1.25px, color-mix(in srgb, var(--dc-momentum) 14%, var(--lab-paper)) 1.25px 5px);
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-dc-when {
    display: none;
  }
}
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-dc-table th[scope="row"] {
    min-width: 9rem;
  }
}

/* Sub-tab strips, one pattern: the indicators no longer wrap on wide screens (they scroll,
   snap and fade at the right edge like every other strip), and the sector anchors show the
   sector in view with the same underline as an active tab. */
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-strip > .game-dc-metrics {
    flex-wrap: nowrap;
  }
}
.lab[data-theme="ledger"] .game-fw-jump button.is-on {
  border-bottom-color: var(--lab-ink);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-fw-tile,
.lab[data-theme="ledger"] .game-fw-tile * {
  text-decoration: none;
}
.lab[data-theme="ledger"] .game-fw-tile:hover .game-fw-tile-sector,
.lab[data-theme="ledger"] .game-fw-tile:focus-visible .game-fw-tile-sector {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Sofa legibility: the scale's two lower steps rise (labels 16px, body 17px; 15px on a
   phone held in the hand), with no new steps. "Your move" is never smaller than the bonus
   line under it; the advisors and the island's tags read at --t-md on a big screen. */
.lab[data-theme="ledger"] {
  --ink-amber: #8a5a00;
  --t-xs: 0.9375rem;
}
@media (min-width: 641px) {
  .lab[data-theme="ledger"] {
    --t-xs: 1rem;
    --t-sm: 1.0625rem;
  }
}
@media (min-width: 1200px) {
  .lab[data-theme="ledger"] .game-stage-foot .game-advice-text,
  .lab[data-theme="ledger"] .lab-scene-label .lab-banner-text {
    font-size: var(--t-md);
  }
}
.lab[data-theme="ledger"] .game-move-chip small,
.lab[data-theme="ledger"] .game-goal-sub .game-move-chip small {
  font-size: var(--t-sm);
}
/* The forecast figure in ink: blue stays for the forecast line, its end and the turn. */
.lab[data-theme="ledger"] .game-goal-value.is-hero,
.lab[data-theme="ledger"] .game-goal-unit {
  color: var(--lab-ink);
}
/* Amber words ("at risk") and amber chart text use the dark ink amber; the bright amber is
   for square markers and fills only. */
.lab[data-theme="ledger"] .game-valence.is-warn,
.lab[data-theme="ledger"] .game-stamp.is-warn,
.lab[data-theme="ledger"] .game-election.is-risk {
  color: var(--ink-amber);
}

/* The recap's verdict row: the verdict on the left, the score boxed on the right (each
   cell a label over its display-size figure and change), so the score is above the fold. */
.lab[data-theme="ledger"] .game-recap .game-stamp-row.has-score {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem 1.2rem;
}
.lab[data-theme="ledger"] .game-stamp-lead {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}
.lab[data-theme="ledger"] .game-stamp-row.has-score .game-recap-capital {
  margin: 0;
  border: 3px double var(--lab-ink);
  grid-template-columns: auto auto;
}
.lab[data-theme="ledger"] .game-stamp-row.has-score .game-recap-capital > div {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.1rem;
  padding: 0.35rem 0.85rem 0.45rem;
}
.lab[data-theme="ledger"] .game-stamp-row.has-score .game-recap-capital > div + div {
  border-left: 1px solid var(--lab-ink);
}
.lab[data-theme="ledger"] .game-stamp-row.has-score .game-recap-capital dt {
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-stamp-row.has-score .game-recap-capital dd {
  white-space: nowrap;
}
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-recap .game-stamp-row.has-score {
    grid-template-columns: minmax(0, 1fr);
  }
  .lab[data-theme="ledger"] .game-stamp-row.has-score .game-recap-capital {
    width: 100%;
    grid-template-columns: 1fr 1fr;
  }
}

/* Phones: the decomposition table's column heads wrap ("2027Q4 / (forecast)"), so the
   table never runs past the sheet's edge. */
@media (max-width: 640px) {
  .lab[data-theme="ledger"] .game-dc-table thead th:not(:first-child) {
    white-space: normal;
    width: 5.5rem;
  }
  .lab[data-theme="ledger"] .game-dc-table {
    width: 100%;
    table-layout: auto;
  }
}
`,
  // The island keeps its full colours: the page frames the map, it does not recolour it.
  scene: {},
};

export default theme;
