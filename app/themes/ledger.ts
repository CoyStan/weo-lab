import type { LabTheme } from "./types.ts";

/** The Ledger: a financial newspaper's front page. Newsprint, true black ink, one oxblood accent, hairline and double rules, no boxes, no shadows, no rounded corners. */
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
    "--lab-scene-bg": "linear-gradient(180deg, #e7e1cd 0%, #eee9d9 100%)",
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
    // Type: Georgia-family serif for text, condensed bold sans for headlines
    "--lab-font-ui": "Georgia, \"Iowan Old Style\", Baskerville, \"Times New Roman\", serif",
    "--lab-font-display": "\"Franklin Gothic Medium\", \"Franklin Gothic\", \"Arial Narrow\", \"Helvetica Neue\", Arial, sans-serif",
    "--lab-font-mono": "\"Courier New\", ui-monospace, monospace",
    // Shape and depth: square, flat
    "--lab-radius-panel": "0",
    "--lab-radius-card": "0",
    "--lab-radius-control": "0",
    "--lab-panel-shadow": "none",
  },
  css: `
/* Square everything: no rounded corners anywhere in the lab. */
.lab[data-theme="ledger"] *,
.lab[data-theme="ledger"] *::before,
.lab[data-theme="ledger"] *::after {
  border-radius: 0 !important;
  box-shadow: none;
}
.lab[data-theme="ledger"] {
  font-variant-numeric: oldstyle-nums;
  line-height: 1.45;
}
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
  font-stretch: condensed;
  font-weight: 800;
  letter-spacing: -0.005em;
  line-height: 1.02;
  text-transform: none;
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
  background: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-progress-track span.is-now {
  background: var(--lab-scenario);
  animation: none;
}
.lab[data-theme="ledger"] .game-counter {
  border: 0;
  border-left: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0 0 0 0.8rem;
  font-variant: small-caps;
  letter-spacing: 0.03em;
}
.lab[data-theme="ledger"] .game-counter strong {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-size: 1.4rem;
  font-weight: 800;
  font-variant-numeric: lining-nums tabular-nums;
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
  .lab[data-theme="ledger"] .game-stage {
    border-top-width: 3px;
  }
}
.lab[data-theme="ledger"] .game-col-title {
  margin-bottom: 0.45rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--lab-ink);
  font-size: 1.35rem;
}

/* Levers */
.lab[data-theme="ledger"] .game-coach {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  border-bottom: 1px solid var(--lab-line);
  background: transparent;
  padding: 0.45rem 0;
  font-style: italic;
  color: var(--lab-ink-2);
}
.lab[data-theme="ledger"] .game-agenda {
  max-width: none;
  border: 0;
  border-top: 1px solid var(--lab-ink);
  border-bottom: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.5rem 0;
  font-size: 0.82rem;
}
.lab[data-theme="ledger"] .game-agenda strong {
  font-variant: small-caps;
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-agenda.is-quiet strong {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-turn-note {
  font-size: 0.8rem;
  font-style: italic;
}
.lab[data-theme="ledger"] .game-lever-group h3 {
  font-variant: small-caps;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
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
.lab[data-theme="ledger"] .lab-slider-value {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-weight: 800;
  font-size: 2.1rem;
  font-variant-numeric: lining-nums tabular-nums;
  letter-spacing: -0.01em;
}
.lab[data-theme="ledger"] .lab-slider-label {
  font-variant: small-caps;
  letter-spacing: 0.04em;
  font-weight: 700;
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
  width: 12px;
  height: 18px;
  margin-top: -8px;
  border: 0;
  background: var(--lab-scenario);
  box-shadow: none;
}
.lab[data-theme="ledger"] .lab-range::-moz-range-thumb {
  width: 12px;
  height: 18px;
  border: 0;
  background: var(--lab-scenario);
}

/* Goals: ruled entries, condensed figures, status as small caps in ink */
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
  font-variant: small-caps;
  font-size: 0.9rem;
  letter-spacing: 0.03em;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-goal-value {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-weight: 800;
  font-size: 2.3rem;
  font-variant-numeric: lining-nums tabular-nums;
  letter-spacing: -0.01em;
}
.lab[data-theme="ledger"] .game-status {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent !important;
  font-variant: small-caps;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
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
.lab[data-theme="ledger"] .game-move-chip {
  border: 0;
  background: transparent !important;
  padding: 0;
  font-variant: small-caps;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.lab[data-theme="ledger"] .game-move-chip.is-good {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .game-move-chip.is-bad {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .game-goal a,
.lab[data-theme="ledger"] .game-col a {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

/* Advisers: a ruled column of short notes with engraved portraits */
.lab[data-theme="ledger"] .game-advice {
  border: 0;
  border-top: 1px solid var(--lab-line-strong);
  border-left: 0;
  background: transparent;
  padding: 0.45rem 0;
}
.lab[data-theme="ledger"] .game-advice-text {
  font-size: 0.82rem;
}
.lab[data-theme="ledger"] .game-portrait {
  filter: grayscale(0.9) contrast(1.05);
}
.lab[data-theme="ledger"] .game-stance,
.lab[data-theme="ledger"] .lab-chip {
  background: transparent !important;
  border: 0;
  padding: 0;
  font-variant: small-caps;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.lab[data-theme="ledger"] .lab-chip-good,
.lab[data-theme="ledger"] .game-stance.is-calm {
  color: var(--lab-good);
}
.lab[data-theme="ledger"] .lab-chip-warn {
  color: var(--lab-warn);
}
.lab[data-theme="ledger"] .lab-chip-bad {
  color: var(--lab-bad);
}
.lab[data-theme="ledger"] .lab-chip-info,
.lab[data-theme="ledger"] .lab-chip-neutral {
  color: var(--lab-ink-2);
}

/* Decision and End turn: the one slab of solid black on the page */
.lab[data-theme="ledger"] .game-end-note {
  font-style: italic;
}
.lab[data-theme="ledger"] .game-end-btn {
  background: var(--lab-ink);
  color: var(--lab-paper);
  padding: 1rem 1.2rem;
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  transform: none;
}
.lab[data-theme="ledger"] .game-end-btn:not(:disabled):hover {
  background: var(--lab-scenario);
  transform: none;
}
.lab[data-theme="ledger"] .game-end-btn:not(:disabled):active {
  transform: none;
}
.lab[data-theme="ledger"] .game-end-btn kbd {
  border: 1px solid var(--lab-paper);
  font-family: var(--lab-font-ui);
}
.lab[data-theme="ledger"] .game-skip-btn {
  border: 1px solid var(--lab-ink);
  background: transparent;
  font-variant: small-caps;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-size: 0.9rem;
}
.lab[data-theme="ledger"] .game-skip-btn:not(:disabled):hover {
  background: var(--lab-ink);
  color: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-skip-btn svg {
  color: currentColor;
}

/* Buttons: flat black slabs with white text; secondary ones are hairline outlines */
.lab[data-theme="ledger"] .lab-btn {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-weight: 700;
  letter-spacing: 0.03em;
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
.lab[data-theme="ledger"] .lab-btn-ghost {
  background: transparent;
  border: 1px solid var(--lab-ink);
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
  font-variant: small-caps;
  font-size: 1rem;
  letter-spacing: 0.03em;
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
  font-variant: small-caps;
  font-weight: 700;
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
  border-bottom: 1px solid var(--lab-ink);
  padding: 0 0 0.6rem;
}
.lab[data-theme="ledger"] .game-masthead {
  border-bottom: 1px solid var(--lab-ink);
  font-family: var(--lab-font-ui);
  font-size: 0.8rem;
  font-style: italic;
  letter-spacing: 0.02em;
  color: var(--lab-ink);
}
.lab[data-theme="ledger"] .game-headline {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-size: clamp(1.9rem, 4vw, 2.7rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.005em;
}
.lab[data-theme="ledger"] .game-recap-stat {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.45rem 0 0;
}
.lab[data-theme="ledger"] .game-stamp {
  display: inline-block;
  transform: none;
  animation: none;
  border: 1px solid currentColor;
  border-width: 1px 0;
  padding: 0.15rem 0;
  font-family: var(--lab-font-ui);
  font-size: 0.9rem;
  font-style: italic;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
}
.lab[data-theme="ledger"] .game-stamp-note {
  font-style: italic;
}
.lab[data-theme="ledger"] .game-shock {
  border: 0;
  border-top: 4px double var(--lab-ink);
  background: var(--lab-paper);
}
.lab[data-theme="ledger"] .game-shock-kicker {
  background: transparent;
  padding: 0;
  font-variant: small-caps;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: var(--lab-bad);
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
  font-variant: small-caps;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
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

/* Title and missions: a cover page with ruled entries */
.lab[data-theme="ledger"] .game-title-card {
  border-top: 4px double var(--lab-ink);
}
.lab[data-theme="ledger"] .game-mission {
  border: 0;
  border-top: 1px solid var(--lab-ink);
  background: transparent;
  padding: 0.9rem 0.2rem 0.6rem;
}
.lab[data-theme="ledger"] .game-mission.is-locked {
  opacity: 0.45;
}
.lab[data-theme="ledger"] .game-mission-number {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-weight: 800;
}
.lab[data-theme="ledger"] .game-briefing .game-card {
  border-top-width: 4px;
}

/* Framework overlay: tabs as ruled columns, the active one as a black slab */
.lab[data-theme="ledger"] .game-fw-head {
  border-bottom: 3px double var(--lab-ink);
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
  font-stretch: condensed;
  font-size: 1.15rem;
  font-weight: 800;
}
.lab[data-theme="ledger"] .game-fw-tab-n {
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
}
.lab[data-theme="ledger"] .game-fw-note {
  border: 0;
  border-top: 2px solid var(--lab-ink);
  background: transparent;
  padding: 0.55rem 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
}
.lab[data-theme="ledger"] .game-fw-note.is-warn {
  border-top-color: var(--lab-alert);
}
.lab[data-theme="ledger"] .game-fw-note strong {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-size: 1.25rem;
  font-weight: 800;
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
  font-variant: small-caps;
  font-weight: 700;
  letter-spacing: 0.03em;
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
.lab[data-theme="ledger"] .game-fw-table {
  font-variant-numeric: lining-nums tabular-nums;
}
.lab[data-theme="ledger"] .game-fw-table th,
.lab[data-theme="ledger"] .game-fw-table td {
  border-bottom: 1px solid var(--lab-line);
}
.lab[data-theme="ledger"] .game-fw-table thead th {
  font-variant: small-caps;
  letter-spacing: 0.03em;
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
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  font-variant: small-caps;
  font-weight: 700;
}
.lab[data-theme="ledger"] .game-dc-metrics button.is-on {
  border-bottom-color: var(--lab-ink);
  background: transparent;
  color: var(--lab-ink);
}

/* Floating labels on the island: flat tags with a rule under them */
.lab[data-theme="ledger"] .lab-scene-label {
  border: 1px solid var(--lab-ink);
  border-bottom: 2px solid var(--label-accent, var(--lab-scenario));
  background: var(--lab-paper);
  padding: 0.25rem 0.55rem 0.25rem 0.4rem;
  font-family: var(--lab-font-ui);
  font-size: 11px;
  letter-spacing: 0.01em;
}
.lab[data-theme="ledger"] .lab-scene-label strong {
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  font-weight: 800;
  font-size: 12.5px;
}
.lab[data-theme="ledger"] .lab-stamp {
  transform: none;
  border-width: 1px;
  font-family: var(--lab-font-display);
  font-stretch: condensed;
  letter-spacing: 0.06em;
}

/* Tables and tiles in the lab: ruled, not boxed */
.lab[data-theme="ledger"] .lab-tile {
  border: 0;
  border-top: 2px solid var(--lab-ink);
  background: transparent;
}
.lab[data-theme="ledger"] .lab-table thead th {
  font-variant: small-caps;
  letter-spacing: 0.03em;
}

/* Decomposition chart: the validated bright palette (amber shocks, blue instruments), so
   cause and effect read from across a room; only the momentum grey is warmed to the paper. */
.lab[data-theme="ledger"].game {
  --dc-momentum: #8c877c;
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
