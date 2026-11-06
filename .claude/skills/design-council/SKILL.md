---
name: design-council
description: Improve the game's UI by hill climbing against a council of AI design reviewers. Use when asked to polish, redesign or "make the design better", or to run the design council.
---

# Design council

Design by hill climbing: screenshot the app, have several strong models review it
independently against one rubric, fix what they agree on, and repeat until every
reviewer scores it at the target. Reviewers never edit code; one agent (you)
implements.

## Loop

1. **Shoot.** `npm run build && node scripts/design-shots.mjs <scratch>/roundN`
   captures the title, mission list, briefing, shock card, play screen, recap,
   macro framework, decomposition and sector accounts at 1440x900 and 390x844.
2. **Convene.** Spawn 3 reviewer agents in parallel, each on a different model
   (for example opus, sonnet and fable), read-only. Give each the screenshot
   paths, `app/game/game.css`, `app/weo-lab.css` and the active theme file, the
   rubric below and the previous round's scores. Ask for JSON only.
3. **Benchmark.** Tell reviewers to judge against the best of the genre, not
   against the last round: Mini Metro, Frostpunk and Democracy 4 for game UI,
   the Financial Times and Our World in Data for charts, Linear for product
   polish. "Better than the last round" is not the bar; "would sit next to
   these" is.
4. **Fix.** Merge the findings. Fix first what two or more reviewers raise,
   then the highest-severity single findings. Keep fixes systemic (tokens,
   type scale, spacing scale, radii) rather than one-off.
5. **Check.** `npm run check` must pass and the screenshots must have no
   overflow or console errors before the next round.
6. **Repeat** until every reviewer gives at least the target overall score
   (default 8.5/10), or three rounds pass without a reviewer's score moving.
   Report the score table per round honestly, including disagreements.

## Rubric (score each 1–10, with one line of evidence)

- Typography: scale, hierarchy, weights, line length, numerals.
- Colour and contrast: palette harmony, WCAG AA text contrast, status colours.
- Layout and spacing: grid, alignment, rhythm, density, use of the screen.
- Information hierarchy: what the eye lands on first; is the decision obvious?
- Data visualisation: chart clarity, labelling, legends, honest scales.
- Components and polish: buttons, cards, radii, borders, shadows, consistency.
- Game feel: does it feel like a game people want to keep playing?
- Mobile: the phone screenshots.

Return: `{ "reviewer": "...", "scores": { ...8 categories }, "overall": n,
"top_fixes": [{ "severity": "high|medium|low", "screen": "...", "problem":
"...", "fix": "concrete change, naming selectors or tokens" }] }` with at most
ten fixes.

## History

Run 1 (November 2026), reviewers opus, sonnet and fable, target 8.5:

| Round | opus | sonnet | fable |
|---|---|---|---|
| 1 | 6.0 | 6.0 | 5.0 |
| 2 | 6.5 | 7.0 | 6.0 |
| 3 | 7.0 | 7.5 | 6.5 |

Run 2, same reviewers continuing, target 8.5, max 8 rounds:

| Round | opus | sonnet | fable |
|---|---|---|---|
| 4 | 7.5 | 8.0 | 7.5 |
| 5 | 8.0 | 8.3 | 8.0 |
| 6 | 8.0 | 8.5 | 8.4 |
| 7 | 8.3 | 8.5 | 8.5 |
| 8 | 8.5 | 8.5 | 8.6 |

Target met at round 8. Calibration: a fresh opus reviewer with no memory of
earlier rounds scored round 8 at 7.2-7.8 (two passes), so reviewers who
watch the work improve do grade more generously. Next time, bring in fresh
reviewers for the final round and treat their score as the honest one.

Open items every fresh pass raises: the island should carry persistent state
that builds up from policy (smoke, cranes, empty lots), the recap numbers
should animate in, goal charts need to be larger for a shared screen, phones
should show a compact goal strip while deciding, and the decomposition legend
should show "now" and "by the end" side by side.
