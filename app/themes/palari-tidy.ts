import type { LabTheme } from "./types.ts";

/** Palari tidy: the Palari desk with fewer AI tells. Figtree throughout, dot-and-word statuses, soft warm callouts, a tactile solid End button. */
const theme: LabTheme = {
  id: "palari-tidy",
  name: "Palari tidy",
  description: "Palari, cleaned up: warm cream paper and indigo ink, one friendly sans, dots instead of pills, soft warm callouts and a chunky solid End button.",
  scheme: "light",
  vars: {
    "--lab-font-ui": "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
    "--lab-font-display": "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
    // Flat accent: the gradient is gone
    "--lab-accent-from": "#2e2a7b",
    "--lab-accent-to": "#2e2a7b",
    "--lab-on-accent": "#ffffff",
  },
  css: `
/* Type: Figtree everywhere, Fraunces only for the big titles. */
.lab[data-theme="palari-tidy"] {
  font-feature-settings: normal;
  --pt-edge: color-mix(in srgb, var(--lab-ink) 62%, #000);
  --pt-warm: color-mix(in srgb, var(--lab-warn-mark) 13%, var(--lab-paper));
  --pt-warm-good: color-mix(in srgb, var(--lab-good-mark) 11%, var(--lab-paper));
  --pt-warm-info: color-mix(in srgb, var(--lab-info-mark) 9%, var(--lab-paper));
}
.lab[data-theme="palari-tidy"] .game-title,
.lab[data-theme="palari-tidy"] .game-mission-title,
.lab[data-theme="palari-tidy"] .game-headline {
  font-family: var(--font-fraunces), Georgia, serif;
  font-feature-settings: normal;
}
.lab[data-theme="palari-tidy"] .game-masthead {
  font-style: normal;
  font-weight: 600;
}

/* Statuses: a small dot and a coloured word, no pill. */
.lab[data-theme="palari-tidy"] .lab-chip,
.lab[data-theme="palari-tidy"] .game-status,
.lab[data-theme="palari-tidy"] .game-stance {
  gap: 0.4rem;
  min-width: 0;
  border-radius: 0;
  background: none;
  padding: 0;
  letter-spacing: 0;
  text-align: left;
  font-weight: 700;
}
.lab[data-theme="palari-tidy"] .game-status,
.lab[data-theme="palari-tidy"] .game-stance {
  display: inline-flex;
  align-items: center;
}
.lab[data-theme="palari-tidy"] .lab-chip::before,
.lab[data-theme="palari-tidy"] .game-status::before,
.lab[data-theme="palari-tidy"] .game-stance::before {
  content: "";
  flex: none;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--lab-info-mark);
}
.lab[data-theme="palari-tidy"] .lab-chip-neutral { background: none; color: var(--lab-ink-2); }
.lab[data-theme="palari-tidy"] .lab-chip-neutral::before { background: var(--lab-ink-2); opacity: 0.6; }
.lab[data-theme="palari-tidy"] .lab-chip-good, .lab[data-theme="palari-tidy"] .lab-chip-warn, .lab[data-theme="palari-tidy"] .lab-chip-bad, .lab[data-theme="palari-tidy"] .lab-chip-info { background: none; }
.lab[data-theme="palari-tidy"] .lab-chip-good::before, .lab[data-theme="palari-tidy"] .game-status.is-met::before, .lab[data-theme="palari-tidy"] .game-status.is-on-track::before, .lab[data-theme="palari-tidy"] .game-stance.is-pleased::before { background: var(--lab-good-mark); }
.lab[data-theme="palari-tidy"] .lab-chip-warn::before, .lab[data-theme="palari-tidy"] .game-status.is-at-risk::before { background: var(--lab-warn-mark); }
.lab[data-theme="palari-tidy"] .lab-chip-bad::before, .lab[data-theme="palari-tidy"] .game-status.is-failed::before, .lab[data-theme="palari-tidy"] .game-stance.is-worried::before { background: var(--lab-alert); }
.lab[data-theme="palari-tidy"] .lab-chip-info::before, .lab[data-theme="palari-tidy"] .game-stance::before { background: var(--lab-info-mark); }
.lab[data-theme="palari-tidy"] .game-status.is-met, .lab[data-theme="palari-tidy"] .game-status.is-on-track, .lab[data-theme="palari-tidy"] .game-status.is-at-risk, .lab[data-theme="palari-tidy"] .game-status.is-failed,
.lab[data-theme="palari-tidy"] .game-stance.is-worried, .lab[data-theme="palari-tidy"] .game-stance.is-pleased { background: none; }
.lab[data-theme="palari-tidy"] .game-stance { color: var(--lab-info); }
.lab[data-theme="palari-tidy"] .game-stance.is-worried { color: var(--lab-bad); }
.lab[data-theme="palari-tidy"] .game-stance.is-pleased { color: var(--lab-good); }

/* The move and probe readouts are plain text next to the helps / hurts marker. */
.lab[data-theme="palari-tidy"] .game-move-chip,
.lab[data-theme="palari-tidy"] .game-probe-chip,
.lab[data-theme="palari-tidy"] .game-move-chip.is-good,
.lab[data-theme="palari-tidy"] .game-move-chip.is-bad,
.lab[data-theme="palari-tidy"] .game-probe-chip.is-good,
.lab[data-theme="palari-tidy"] .game-probe-chip.is-bad {
  background: none;
  padding: 0.1rem 0;
  border-radius: 0;
}

/* Votes and Trust keep the one soft pill, a little rounder and calmer. */
.lab[data-theme="palari-tidy"] .game-counter {
  padding: 0.28rem 0.75rem;
  font-weight: 700;
}

/* Callouts: soft rounded warm fills, no coloured left stripe. */
.lab[data-theme="palari-tidy"] .game-agenda,
.lab[data-theme="palari-tidy"] .game-fw-note,
.lab[data-theme="palari-tidy"] .game-fw-note.is-warn,
.lab[data-theme="palari-tidy"] .game-agenda.is-quiet,
.lab[data-theme="palari-tidy"] .game-disclaimer {
  border: 0;
  border-radius: 0.9rem;
  background: var(--pt-warm);
  padding: 0.65rem 0.85rem;
}
.lab[data-theme="palari-tidy"] .game-agenda.is-quiet { background: var(--pt-warm-good); }
.lab[data-theme="palari-tidy"] .game-fw-note { background: var(--pt-warm-info); }
.lab[data-theme="palari-tidy"] .game-fw-note.is-warn { background: var(--pt-warm); }
.lab[data-theme="palari-tidy"] .game-lesson {
  border: 0;
  border-radius: 0.9rem;
  background: var(--pt-warm-info);
  padding: 0.6rem 0.85rem;
  font-family: var(--lab-font-ui);
}
.lab[data-theme="palari-tidy"] .game-title-points li {
  position: relative;
  border: 0;
  padding-left: 1.1rem;
}
.lab[data-theme="palari-tidy"] .game-title-points li::before {
  content: "";
  position: absolute;
  left: 0.15rem;
  top: 0.55em;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--lab-info-mark);
}
.lab[data-theme="palari-tidy"] .game-advice,
.lab[data-theme="palari-tidy"] .game-reaction {
  border: 1px solid var(--lab-line);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--advisor, var(--lab-ink-2)) 8%, var(--lab-paper));
  box-shadow: none;
}

/* Buttons: solid, tactile, darker bottom edge that presses down. */
.lab[data-theme="palari-tidy"] .game-end-btn,
.lab[data-theme="palari-tidy"] .lab-btn-primary {
  background: var(--lab-ink);
  color: var(--lab-on-accent);
  border-color: transparent;
  box-shadow: 0 4px 0 var(--pt-edge);
  filter: none;
  transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}
.lab[data-theme="palari-tidy"] .game-end-btn:not(:disabled):hover,
.lab[data-theme="palari-tidy"] .lab-btn-primary:not(:disabled):hover {
  background: color-mix(in srgb, var(--lab-ink) 90%, #fff);
  transform: translateY(-1px);
  box-shadow: 0 5px 0 var(--pt-edge);
}
.lab[data-theme="palari-tidy"] .game-end-btn:not(:disabled):active,
.lab[data-theme="palari-tidy"] .lab-btn-primary:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--pt-edge);
}
.lab[data-theme="palari-tidy"] .game-end-btn:disabled {
  filter: none;
  opacity: 0.5;
  box-shadow: 0 4px 0 color-mix(in srgb, var(--lab-ink) 40%, transparent);
}
.lab[data-theme="palari-tidy"] .game-end-btn {
  margin-bottom: 4px;
}
.lab[data-theme="palari-tidy"] .game-skip-btn,
.lab[data-theme="palari-tidy"] .lab-btn-ghost {
  border-bottom-width: 3px;
  border-bottom-color: var(--lab-line-strong);
}
.lab[data-theme="palari-tidy"] .game-skip-btn:not(:disabled):active,
.lab[data-theme="palari-tidy"] .lab-btn-ghost:not(:disabled):active {
  transform: translateY(2px);
  border-bottom-width: 1px;
}
`,
  scene: {},
};

export default theme;
