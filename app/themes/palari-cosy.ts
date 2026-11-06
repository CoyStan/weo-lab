import type { LabTheme } from "./types.ts";

/** Palari cosy: Palari made rounder and cuter, all Nunito, warm cream, a terracotta button that presses down. */
const theme: LabTheme = {
  id: "palari-cosy",
  name: "Palari cosy",
  description: "Palari, rounder and cuter: all Nunito, warm cream paper, a terracotta button that presses down, and dot-and-word statuses.",
  scheme: "light",
  vars: {
    "--lab-bg": "#fbf0de",
    "--lab-paper": "#fff8ec",
    "--lab-surface": "#fffcf5",
    "--lab-scene-bg": "linear-gradient(180deg, #cfeaf2 0%, #e6f1ee 60%, #f8ecd6 100%)",
    "--lab-ink": "#3d3350",
    "--lab-ink-2": "#5e5470",
    "--lab-line": "color-mix(in srgb, #7a5a35 16%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #7a5a35 32%, transparent)",
    "--lab-accent-from": "#c94f33",
    "--lab-accent-to": "#c94f33",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#1f8f89",
    "--lab-bad-surface": "#ffeee6",
    "--lab-good-surface": "#eef8e8",
    "--lab-font-ui": "var(--font-nunito), ui-rounded, system-ui, sans-serif",
    "--lab-font-display": "var(--font-nunito), ui-rounded, system-ui, sans-serif",
    "--lab-radius-panel": "1.4rem",
    "--lab-radius-card": "1rem",
    "--lab-radius-control": "999px",
    "--lab-panel-shadow": "0 3px 0 color-mix(in srgb, #7a5a35 14%, transparent), 0 10px 22px color-mix(in srgb, #7a5a35 8%, transparent)",
  },
  css: `
.lab[data-theme="palari-cosy"] h1,
.lab[data-theme="palari-cosy"] h2,
.lab[data-theme="palari-cosy"] h3,
.lab[data-theme="palari-cosy"] .lab-font-display,
.lab[data-theme="palari-cosy"] .font-display,
.lab[data-theme="palari-cosy"] .game-goal-title {
  font-family: var(--font-nunito), ui-rounded, system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: 0;
}
/* Buttons: flat, tactile, a darker bottom edge that presses down. */
.lab[data-theme="palari-cosy"] .lab-btn-primary,
.lab[data-theme="palari-cosy"] .game-end-btn {
  background: #c94f33;
  color: #ffffff;
  border: 0;
  box-shadow: 0 5px 0 #8c2f1b;
  font-weight: 800;
  transition: transform 120ms var(--ease), box-shadow 120ms var(--ease), filter 120ms var(--ease);
}
.lab[data-theme="palari-cosy"] .lab-btn-primary:not(:disabled):hover,
.lab[data-theme="palari-cosy"] .game-end-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 0 #8c2f1b;
  background: #d1573a;
}
.lab[data-theme="palari-cosy"] .lab-btn-primary:not(:disabled):active,
.lab[data-theme="palari-cosy"] .game-end-btn:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #8c2f1b;
}
.lab[data-theme="palari-cosy"] .game-end-btn {
  border-radius: 1.2rem;
}
.lab[data-theme="palari-cosy"] .lab-btn-ghost {
  border-width: 2px;
  border-color: #ead7bb;
  box-shadow: 0 3px 0 #ead7bb;
}
.lab[data-theme="palari-cosy"] .lab-btn-ghost:not(:disabled):active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #ead7bb;
}
.lab[data-theme="palari-cosy"] .lab-btn-ghost[aria-pressed="true"] {
  background: #5b4a7a;
  border-color: #3d3350;
  box-shadow: 0 3px 0 #3d3350;
}
.lab[data-theme="palari-cosy"] .lab-btn-soft {
  box-shadow: 0 3px 0 color-mix(in srgb, #3d3350 12%, transparent);
}
/* Statuses: a small round dot and a coloured word, not a pill. */
.lab[data-theme="palari-cosy"] .lab-chip,
.lab[data-theme="palari-cosy"] .game-status,
.lab[data-theme="palari-cosy"] .game-stance {
  --dot: var(--lab-ink-2);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
  min-width: 0;
  text-align: left;
  font-weight: 800;
  letter-spacing: 0;
}
.lab[data-theme="palari-cosy"] .lab-chip::before,
.lab[data-theme="palari-cosy"] .game-status::before,
.lab[data-theme="palari-cosy"] .game-stance::before {
  content: "";
  flex: none;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--dot);
}
.lab[data-theme="palari-cosy"] .lab-chip-good,
.lab[data-theme="palari-cosy"] .game-status.is-met,
.lab[data-theme="palari-cosy"] .game-status.is-on-track,
.lab[data-theme="palari-cosy"] .game-stance.is-pleased {
  --dot: var(--lab-good-mark);
  background: transparent;
  color: var(--lab-good);
}
.lab[data-theme="palari-cosy"] .lab-chip-warn,
.lab[data-theme="palari-cosy"] .game-status.is-at-risk {
  --dot: var(--lab-warn-mark);
  background: transparent;
  color: var(--lab-warn);
}
.lab[data-theme="palari-cosy"] .lab-chip-bad,
.lab[data-theme="palari-cosy"] .game-status.is-failed,
.lab[data-theme="palari-cosy"] .game-stance.is-worried {
  --dot: var(--lab-alert);
  background: transparent;
  color: var(--lab-bad);
}
.lab[data-theme="palari-cosy"] .lab-chip-info,
.lab[data-theme="palari-cosy"] .game-stance {
  --dot: var(--lab-info-mark);
  background: transparent;
  color: var(--lab-info);
}
.lab[data-theme="palari-cosy"] .lab-chip-neutral {
  background: transparent;
  color: var(--lab-ink-2);
}
/* Callouts: a soft rounded warm fill, no left stripe. */
.lab[data-theme="palari-cosy"] .game-agenda,
.lab[data-theme="palari-cosy"] .game-fw-note,
.lab[data-theme="palari-cosy"] .game-lesson,
.lab[data-theme="palari-cosy"] .game-disclaimer,
.lab[data-theme="palari-cosy"] .game-title-points li {
  border: 0;
  border-radius: 1rem;
  background: #fbe7c8;
  padding-top: 0.55rem;
  padding-bottom: 0.55rem;
}
.lab[data-theme="palari-cosy"] .game-agenda.is-quiet {
  background: color-mix(in srgb, var(--lab-good-mark) 16%, #fff8ec);
}
.lab[data-theme="palari-cosy"] .game-fw-note {
  background: color-mix(in srgb, var(--lab-info-mark) 11%, #fff8ec);
}
.lab[data-theme="palari-cosy"] .game-fw-note.is-warn {
  background: #fbe7c8;
}
.lab[data-theme="palari-cosy"] .game-lesson,
.lab[data-theme="palari-cosy"] .game-disclaimer {
  background: #f6ecdb;
}
/* Advisor notes keep their colour as a top accent instead of a left stripe. */
.lab[data-theme="palari-cosy"] .game-advice,
.lab[data-theme="palari-cosy"] .game-reaction {
  border: 1px solid var(--lab-line);
  border-top: 4px solid var(--advisor, var(--lab-line-strong));
  border-radius: 1.1rem;
}
.lab[data-theme="palari-cosy"] .lab-scene-label {
  border-radius: 1rem;
  font-weight: 800;
}
`,
  scene: {
    sky: "#bfe6f3",
    water: "#4fb0c9",
    waterFar: "#6cc1d6",
    lagoon: "#8fd8e0",
    sand: "#f3d9a0",
    grass: "#8fd07a",
    hill: "#74bb69",
    leaf: "#4a9d58",
    plaza: "#fff0d0",
    roof: "#e0704f",
  },
};

export default theme;
