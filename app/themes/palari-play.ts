import type { LabTheme } from "./types.ts";

const T = `.lab[data-theme="palari-play"]`;

/** Palari playful: Palari's warmth, with Mini Metro's air: Lexend everywhere, flat fills instead of borders, dots instead of pills. */
const theme: LabTheme = {
  id: "palari-play",
  name: "Palari playful",
  description: "Clean and toy-like: Lexend throughout, lots of air, soft fills instead of borders, status dots and one chunky blue button.",
  scheme: "light",
  vars: {
    "--lab-bg": "#fbf8f3",
    "--lab-paper": "#fffdf9",
    "--lab-surface": "#f7f3ec",
    "--lab-line": "color-mix(in srgb, #2e2a7b 8%, transparent)",
    "--lab-line-strong": "color-mix(in srgb, #2e2a7b 20%, transparent)",
    "--lab-accent-from": "#2f6fe4",
    "--lab-accent-to": "#2f6fe4",
    "--lab-on-accent": "#ffffff",
    "--lab-focus": "#2f6fe4",
    "--lab-font-ui": "var(--font-lexend), ui-sans-serif, system-ui, sans-serif",
    "--lab-font-display": "var(--font-lexend), ui-sans-serif, system-ui, sans-serif",
    "--lab-radius-panel": "1.5rem",
    "--lab-radius-card": "1rem",
    "--lab-radius-control": "999px",
    "--lab-panel-shadow": "none",
  },
  css: `
${T} h1, ${T} h2, ${T} h3, ${T} h4, ${T} .font-display, ${T} .lab-font-display, ${T} .game-goal-value {
  font-family: var(--font-lexend), ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  letter-spacing: -0.01em;
}
${T} .game-goal-value { font-size: var(--t-xl); letter-spacing: -0.02em; }

/* Panels: air and a very light fill, no outline. */
${T} .lab-panel {
  border: 0;
  background: color-mix(in srgb, #2e2a7b 3.5%, #fffdf9);
  padding: 1.1rem 1.15rem;
}
${T} .lab-panel h2, ${T} .lab-panel h3 { margin-bottom: 0.6rem; }
${T} .game-goal {
  border: 0;
  background: #fffdf9;
  border-radius: 1.1rem;
  padding: 0.85rem 0.95rem 0.75rem;
}
${T} .game-goal.is-at-risk, ${T} .game-goal.is-failed { border: 0; }
${T} .game-goal { margin-bottom: 0.65rem; }
${T} .lab-tile, ${T} .lab-chart { border-color: transparent; }

/* Statuses: a dot and a word, no pill. */
${T} .game-status, ${T} .game-stance, ${T} .game-election, ${T} .game-fw-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  text-align: left;
  font-weight: 600;
}
${T} .game-status::before, ${T} .game-stance::before {
  content: "";
  flex: none;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: currentColor;
}
${T} .game-status.is-met, ${T} .game-status.is-on-track { color: var(--lab-good); background: none; }
${T} .game-status.is-at-risk { color: var(--lab-warn); background: none; }
${T} .game-status.is-failed { color: var(--lab-bad); background: none; }
${T} .game-status.is-at-risk::before { background: var(--lab-warn-mark); }
${T} .game-status.is-met::before, ${T} .game-status.is-on-track::before { background: var(--lab-good-mark); }
${T} .game-status.is-failed::before { background: var(--lab-alert); }
${T} .game-stance { color: var(--lab-ink-2); background: none; }
${T} .game-stance.is-worried { color: var(--lab-bad); background: none; }
${T} .game-stance.is-worried::before { background: var(--lab-alert); }
${T} .game-stance.is-pleased { color: var(--lab-good); background: none; }
${T} .game-stance.is-pleased::before { background: var(--lab-good-mark); }

/* Counters, move chips, probe chips: light fill only, smaller footprint. */
${T} .game-counter {
  border: 0;
  background: color-mix(in srgb, #2e2a7b 6%, transparent);
  color: var(--lab-ink);
}
${T} .game-move-chip, ${T} .game-probe-chip {
  border-radius: 0.6rem;
  background: color-mix(in srgb, #2e2a7b 6%, transparent);
}
${T} .game-move-chip.is-good { background: none; }
${T} .game-fw-open {
  border: 0;
  background: color-mix(in srgb, #2e2a7b 8%, transparent);
  color: var(--lab-ink);
}

/* Callouts: a soft rounded warm fill, no stripe. */
${T} .game-agenda, ${T} .game-agenda.is-quiet {
  border: 0;
  border-left: 0;
  border-radius: 1.1rem;
  background: #fdf0cf;
  padding: 0.75rem 0.95rem;
}
${T} .game-agenda.is-quiet { background: #e6f4e2; }
${T} .game-fw-note, ${T} .game-disclaimer, ${T} .game-lesson, ${T} .game-title-points li, ${T} .game-dc-key > .game-dc-note {
  border: 0;
  border-left: 0;
  border-radius: 1rem;
  background: #f6efe2;
  padding: 0.65rem 0.85rem;
}
${T} .game-lesson { padding: 0.8rem 1rem; font-family: var(--font-lexend), sans-serif; }
${T} .game-fw-note { background: color-mix(in srgb, #2e2a7b 5%, #fffdf9); }
${T} .game-title-points li { padding-left: 0.85rem; }

/* Advisors: soft cards with a round portrait, no outline or stripe. */
${T} .game-advice, ${T} .game-reaction {
  border: 0;
  border-left: 0;
  border-radius: 1.1rem;
  background: color-mix(in srgb, var(--advisor, #2e2a7b) 9%, #fffdf9);
  padding: 0.7rem 0.8rem;
  box-shadow: none;
}
${T} .game-advisors.is-compact .game-advice { background: transparent; }
${T} .game-portrait { border-radius: 50%; }
${T} .game-portrait.is-small { border-radius: 50%; }
${T} .game-reaction-mood { gap: 0.35rem; }

/* Lever groups and dividers: space, not rules. */
${T} .game-lever-group + .game-lever-group { border-top: 0; margin-top: 0.9rem; }
${T} .game-lever-group h3 { font-weight: 700; }

/* Buttons. The End button is a chunky flat blue key that presses down. */
${T} .game-end-btn {
  background: #2f6fe4;
  color: #ffffff;
  border-radius: 1.1rem;
  padding: 0.85rem 1.3rem 0.8rem;
  font-weight: 700;
  box-shadow: 0 5px 0 #1d4db0;
  filter: none;
  transition: transform 90ms var(--ease), box-shadow 90ms var(--ease), background-color 150ms var(--ease);
}
${T} .game-end-btn:not(:disabled):hover {
  background: #3b7aee;
  transform: translateY(-1px);
  box-shadow: 0 6px 0 #1d4db0;
}
${T} .game-end-btn:not(:disabled):active {
  transform: translateY(5px);
  box-shadow: 0 0 0 #1d4db0;
}
${T} .game-end-btn:disabled { box-shadow: 0 5px 0 color-mix(in srgb, #1d4db0 40%, transparent); }
${T} .game-end-btn kbd { background: rgb(255 255 255 / 0.2); border: 0; color: inherit; border-radius: 0.4rem; }
${T} .lab-btn-primary {
  background: #2f6fe4;
  color: #ffffff;
  box-shadow: 0 4px 0 #1d4db0;
  font-weight: 700;
}
${T} .lab-btn-primary:not(:disabled):hover { background: #3b7aee; transform: translateY(-1px); }
${T} .lab-btn-primary:not(:disabled):active { transform: translateY(4px); box-shadow: 0 0 0 #1d4db0; }
${T} .game-skip-btn, ${T} .lab-btn-ghost {
  border: 0;
  background: color-mix(in srgb, #2e2a7b 7%, transparent);
  border-radius: 1.1rem;
  font-weight: 600;
}
${T} .game-skip-btn:not(:disabled):hover, ${T} .lab-btn-ghost:not(:disabled):hover {
  background: color-mix(in srgb, #2e2a7b 12%, transparent);
}
${T} .game-skip-btn kbd { border: 0; background: color-mix(in srgb, #2e2a7b 10%, transparent); }
${T} .lab-btn-soft { background: color-mix(in srgb, #2e2a7b 7%, transparent); }

/* Pins on the island: friendly flat labels. */
${T} .lab-scene-label { border: 0; border-radius: 0.8rem; font-weight: 600; box-shadow: 0 2px 8px rgb(46 42 123 / 0.14); }

/* Table rules go very light. */
${T} .game-dc-table tr { border-color: transparent; }
`,
  scene: {},
};

export default theme;
