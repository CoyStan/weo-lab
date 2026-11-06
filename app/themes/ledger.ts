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
    "--lab-ink-2": "#4a4540",
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
.lab[data-theme="ledger"] .game-progress-track {
  gap: 2px;
}
.lab[data-theme="ledger"] .game-progress-track span {
  height: 4px;
  background: color-mix(in srgb, var(--lab-ink) 16%, transparent);
}
.lab[data-theme="ledger"] .game-progress-track span.is-done {
  --game-track-done: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-progress-track span.is-now {
  background: var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-progress-track span em {
  top: 0.5rem;
  font-weight: var(--w-regular);
  line-height: 1;
}
@media (min-width: 641px) {
  .lab[data-theme="ledger"] .game-progress {
    padding-bottom: 0.75rem;
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
.lab[data-theme="ledger"] .game-agenda strong {
  font-size: var(--t-md);
  font-weight: var(--w-bold);
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-agenda.is-quiet strong {
  color: var(--lab-good);
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
  box-shadow: inset 3px 0 0 var(--lab-scenario);
}
.lab[data-theme="ledger"] .lab-slider-label {
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .lab-slider-value {
  font-family: var(--lab-font-display);
  font-size: var(--t-md);
  font-weight: var(--w-bold);
}
/* The decision itself: the biggest figure in the column. */
.lab[data-theme="ledger"] .game-lever .lab-slider-value {
  font-size: var(--t-xl);
  font-weight: var(--w-bold);
  line-height: 1;
}
.lab[data-theme="ledger"] .lab-range::-webkit-slider-runnable-track {
  height: 2px;
  background: linear-gradient(to right, var(--lab-ink) 0 var(--pct, 0%), color-mix(in srgb, var(--lab-ink) 22%, transparent) var(--pct, 0%) 100%);
}
.lab[data-theme="ledger"] .lab-range::-moz-range-track {
  height: 2px;
  background: color-mix(in srgb, var(--lab-ink) 22%, transparent);
}
.lab[data-theme="ledger"] .lab-range::-moz-range-progress {
  height: 2px;
  background: var(--lab-ink);
}
.lab[data-theme="ledger"] .lab-range::-webkit-slider-thumb {
  width: 14px;
  height: 22px;
  margin-top: -10px;
  border: 0;
  background: var(--lab-scenario);
  box-shadow: none;
}
.lab[data-theme="ledger"] .lab-range::-moz-range-thumb {
  width: 14px;
  height: 22px;
  border: 0;
  background: var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-reform {
  background: transparent;
  border-color: var(--lab-line-strong);
}
.lab[data-theme="ledger"] .game-reform.is-owned {
  background: transparent;
  border-color: var(--lab-good);
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
  font-size: var(--t-md);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-now small,
.lab[data-theme="ledger"] .game-goal-fc small {
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-goal-value {
  font-family: var(--lab-font-display);
  font-size: var(--t-xl);
  font-weight: var(--w-bold);
  line-height: 1;
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
  border: 0;
  background: transparent !important;
  padding: 0;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-move-chip small {
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-move-chip.is-good,
.lab[data-theme="ledger"] .game-probe-chip.is-up {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-move-chip.is-bad,
.lab[data-theme="ledger"] .game-probe-chip.is-down {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-why {
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .game-why-panel {
  border: 0;
  border-top: 1px solid var(--lab-line-strong);
  background: transparent;
  padding-inline: 0;
}
.lab[data-theme="ledger"] .game-goal a,
.lab[data-theme="ledger"] .game-col a,
.lab[data-theme="ledger"] .game-why {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
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
.lab[data-theme="ledger"] .game-stance.is-calm,
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
  color: var(--lab-good);
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
.lab[data-theme="ledger"] .game-toast.is-bad {
  border-top: 3px solid var(--lab-alert);
}
.lab[data-theme="ledger"] .game-toast.is-good {
  border-top: 3px solid var(--lab-good);
}

/* End turn: a solid black key with a darker edge under it; it goes down when pressed. */
.lab[data-theme="ledger"] .game-end-note {
  font-size: var(--t-sm);
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-end-btn {
  margin-bottom: 6px;
  border: 0;
  background: #2a2724;
  color: var(--lab-paper);
  padding: 1rem 1.2rem;
  font-family: var(--lab-font-display);
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
  filter: none;
  transform: none;
  box-shadow: 0 6px 0 0 #000000;
  transition:
    transform var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.lab[data-theme="ledger"] .game-end-btn:not(:disabled):hover {
  background: var(--lab-scenario);
  transform: none;
  box-shadow: 0 6px 0 0 #0d2f5c;
}
.lab[data-theme="ledger"] .game-end-btn:not(:disabled):active {
  transform: translateY(5px);
  box-shadow: 0 1px 0 0 #0d2f5c;
}
.lab[data-theme="ledger"] .game-end-btn:disabled {
  transform: translateY(5px);
  box-shadow: 0 1px 0 0 #000000;
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
  border-color: var(--lab-bad);
  color: var(--lab-bad);
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
.lab[data-theme="ledger"] .game-modal-backdrop {
  background: color-mix(in srgb, var(--lab-bg) 82%, transparent);
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
.lab[data-theme="ledger"] .game-masthead {
  border-bottom: 1px solid var(--lab-ink);
  font-family: var(--lab-font-ui);
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-headline {
  font-size: var(--t-xl);
  line-height: 1.08;
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
.lab[data-theme="ledger"] .game-recap-stat {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.45rem 0 0;
}
.lab[data-theme="ledger"] .game-recap .grid:has(> .game-recap-stat) {
  column-gap: 1.25rem;
}
.lab[data-theme="ledger"] .game-recap-value {
  font-size: var(--t-xl);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-shock {
  border: 0;
  border-top: 4px double var(--lab-ink);
  background: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-shock-kicker {
  background: transparent;
  padding: 0;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
  color: var(--lab-bad);
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
  border-top-color: var(--lab-scenario);
  transform: none;
  background: transparent;
  box-shadow: inset 3px 0 0 var(--lab-scenario);
}
.lab[data-theme="ledger"] .game-choice.is-plain {
  border-style: none;
  border-top: 1px dotted var(--lab-ink);
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
  background: color-mix(in srgb, var(--lab-bg) 90%, transparent);
  backdrop-filter: none;
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
  border-top-color: var(--lab-scenario);
}
/* Locked missions: a hairline dashed outline on no paper, so the playable
   ones read as the stronger cards; the text stays readable. */
.lab[data-theme="ledger"] .game-mission.is-locked {
  opacity: 1;
  border: 1px dashed var(--lab-line-strong);
  background: transparent;
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
  border-top-color: var(--lab-alert);
}
.lab[data-theme="ledger"] .game-fw-note strong {
  font-family: var(--lab-font-display);
  font-size: var(--t-lg);
  font-weight: var(--w-bold);
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
.lab[data-theme="ledger"] .game-fw-jump button {
  border: 1px solid var(--lab-ink);
  background: transparent;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
}
.lab[data-theme="ledger"] .game-fw-jump button:hover {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-fw-channel {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.5rem 0;
}
.lab[data-theme="ledger"] .game-fw-channel.is-blocked,
.lab[data-theme="ledger"] .game-fw-channel.is-idle {
  background: transparent;
  opacity: 0.7;
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
.lab[data-theme="ledger"] .game-fw-pill.is-weak {
  color: var(--lab-warn);
}
.lab[data-theme="ledger"] .game-fw-pill.is-blocked {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-fw-pill.is-idle {
  color: var(--lab-ink-2);
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
.lab[data-theme="ledger"] .game-dc-metrics {
  gap: 0;
}
.lab[data-theme="ledger"] .game-dc-metrics button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0.3rem 0.45rem;
  font-size: var(--t-sm);
  font-weight: var(--w-bold);
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

/* Floating labels on the island: flat tags with a rule under them, in the same family. */
.lab[data-theme="ledger"] .lab-scene-label {
  border: 1px solid var(--lab-ink);
  border-bottom: 2px solid var(--label-accent, var(--lab-scenario));
  background: var(--lab-paper);
  padding: 0.25rem 0.55rem 0.25rem 0.4rem;
  font-family: var(--lab-font-ui);
  font-size: var(--t-xs);
  box-shadow: none !important;
}
.lab[data-theme="ledger"] .lab-banner-text {
  font-size: var(--t-xs);
  font-weight: var(--w-semi);
}
.lab[data-theme="ledger"] .lab-scene-label strong,
.lab[data-theme="ledger"] .lab-scene .lab-scene-label .lab-banner-text strong {
  font-family: var(--lab-font-ui);
  font-size: var(--t-sm) !important;
  font-weight: var(--w-bold);
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
