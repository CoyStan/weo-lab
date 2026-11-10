# The "next" play screen

Open the game with `?ui=next`, or pick **New play screen (beta)** in the classic screen's menu. The menu's **Classic screen** switches back; both read the same game, so nothing is lost.

## The idea

The classic play screen shows everything at once. This one walks each quarter in beats, on the same rules, clock and scoring (it follows the game store's modal):

| Beat | Store state | What the player does |
| --- | --- | --- |
| News | `modal.kind === "shock"` | Reads what hit, calls what it will do, then sees the staff forecast |
| Decide | no modal | Backs an advisor's plan or moves a lever, and watches the forecast bend |
| Result | `modal.kind === "recap"` | Watches the quarter play out on the same charts |
| Debrief | `modal.kind === "debrief"` | Compares their path with doing nothing, history and each advisor |

## Reading the chart

- Thick solid line: what has happened.
- Dashed line: the staff forecast with the levers as they are.
- Dotted line and shaded wedge: the forecast before this quarter's move, and the gap the move opens. Where the wedge widens is when the move arrives.
- Green gate: a goal to land in at a date. Red hatched fence: a line to stay off every quarter.

## Files

- `logic.ts`: pure and tested (`logic.test.ts`). Advisor plans, the lever's journey, prediction questions, the advisor replays.
- `Chart.tsx`: the goal chart and the effect bars.
- `NextPlay.tsx`: the header and the four beats.
- `state.ts`: the screen switch and the prediction score.
- `next.css`: all styles, scoped under `.nx`, on the theme's tokens.

## How the advisors choose

Each quarter every advisor picks, from a menu of single moves and pairs on the unlocked levers, the one that scores best on the staff forecast. Each argues their own corner: their own goals count far more than anyone else's, they like some room to spare on them, and they prefer smaller moves. So their plans can break a goal that is not theirs (the plan card shows it with a ✕), and the player has to weigh them. They never back a plan that loses an election on the forecast. The mission chief also judges plans on the path where shocks that were only warned about do land, which is why that advice differs in calm quarters.

They are advisors, not oracles: the debrief replays the mission backing each one every quarter, and some of them lose.

## Prediction questions

- When a shock lands: where will the first goal be a year on, if nothing changes? The answer is the staff forecast on unchanged policy.
- When a lever first moves (at most twice a mission): when will the goal feel it most sharply? The answer is the quarter the gap between the two forecasts grows fastest. Stocks (debt, reserves) are never asked about, because they pile up for as long as a flow runs.

## Checking it

```bash
npm run build
```

```bash
node scripts/next-shots.mjs <out-dir> [mission-number]
```

The script plays three quarters and the debrief at laptop and phone size (set `TV=1` for 2560×1440) and saves a PNG of every beat.
