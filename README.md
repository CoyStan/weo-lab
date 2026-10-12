# WEO Scenario Lab

A policy game for economists, and for anyone curious. Run a stylised economy one quarter at a time, through six missions or in free play. Built with Next.js 16, React Three Fiber and a small quarterly open-economy model (`app/model/`). Calibrations are illustrative, not official IMF data.

## How it plays

- **Campaign.** Six short missions across four economies, each teaching one idea: monetary lags, how hard a policy rule should react, fiscal consolidation, the exchange rate as a shock absorber, an IMF programme behind a peg, and a sudden stop with every tool unlocked. Levers unlock as you go.
- **One quarter per turn.** You decide for the coming quarter, then press *End quarter* (or Enter). A newspaper-style recap shows what happened.
- **See before you commit.** Each goal card shows the outturn so far, the staff forecast under your current settings (dashed) and the forecast from before this quarter's changes (faint). Resting the pointer on a lever shows what nudging it would do to each goal.
- **Surprises.** Some shocks are announced, others arrive unannounced; the forecast only knows what you know. When one hits, a card offers two or three ready-made responses.
- **Political capital.** Two currencies: **Votes** (your electorate: growth and jobs earn them, recessions, layoffs, high inflation and austerity cost them) and **Trust** (markets and partners: inflation on target, falling debt and narrowing spreads earn it). Spend them on lasting reforms (central bank independence, a fiscal rule, tax administration, a swap line and more) that change how the model behaves. Starting an IMF programme costs votes; capital controls and devaluation cost trust. Elections need enough votes, and if trust falls to −3 markets turn on you. Goodwill builds slowly (at most one point a quarter) and drains fast.
- **Advisors.** A central bank governor, a finance minister and an IMF mission chief comment on the forecast in plain language, and react as you move levers. They disagree, which is the point.
- **Why did it move?** Inflation, activity and debt are decomposed each quarter into what pushed them (demand, expectations, the currency, oil, interest against growth, and so on).
- **Rewind and hints.** Step back a quarter at any time, or ask for a hint.
- **Music and sound.** Public-domain recordings of Satie and Debussy (Gymnopédie No. 1 by default), or a generated sea and music box that turns tense when a goal is at risk; interface sounds and stingers. Nothing plays before your first click.
- **Settings.** Choose and preview the music, set music and effects volumes, waves on or off, the visual design, island banners, reduced motion, tips, and reset progress. About has the disclaimer and credits.
- **History.** Five real crises rebuilt from IMF data: Thailand 1997, Korea 1997, Argentina 2001, Iceland 2008 and Greece 2010. You start just before things went wrong, with the shocks that actually hit, and try to beat what happened; the goal cards draw history as a grey line, and the debrief compares your path with the real one year by year, then tells the real story.
- **World today.** 21 countries, starting from their 2025 numbers in the IMF's World Economic Outlook, with the WEO projection as the line to beat and two seeded surprises per run.
- **Free play.** The full lab: every lever, assumption, shock and constraint, charts, the WEO table and scenario sharing.

**Live demo:** https://coystan.github.io/weo-lab/ (GitHub Pages, deployed from `main` by `.github/workflows/pages.yml`).

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. `npm run build` writes a static site to `out/`; `npm run preview` serves it.

## Checks

```bash
npm run check
```

Runs the TypeScript check, the model and campaign tests (`npm run test:model`) and a production build. The campaign tests check that every mission is lost by doing nothing and that every star can be earned, so a model change cannot silently break the balance.

## Layout

- `app/game/`: the campaign. `missions.ts` (goals, unlocks, shocks, outcomes), `advisors.ts`, `responses.ts`, `explain.ts`, the game store and `ui/`.
- `app/WeoLab.tsx`: the free-play lab; `app/page.tsx` renders the game shell at `/`, and `?mode=sandbox` opens free play directly.
- `app/model/`: economy simulation, shocks, presets, constraints, scoring and tests.
- `app/scene/`: the procedural hex island (React Three Fiber).
- `app/components/`: panels, charts and the top bar.
- `app/themes/`: the selectable visual themes; check one with `node app/themes/check-theme.ts <id>`.

## Real data and calibration

`scripts/fetch-weo.mjs` snapshots six WEO series (real GDP growth, inflation, general government gross debt and net lending, current account, unemployment) for 24 countries from the public IMF DataMapper API into `app/data/weo.json`, with the vintage and retrieval date. Each country borrows one of the four archetypes' structure and starts from its own numbers; policy rates, reserves and spreads are not in those series, so their starting values are model estimates.

`app/game/calibrate.ts` then finds per-quarter residual impulses (demand, prices, the primary balance, a permanent output shift and a stock-flow adjustment to debt) so the model reproduces each year's growth, inflation, budget balance and year-end debt under unchanged policy (today) or under the historical policy path (episodes). The player plays against the same residuals, so the results are illustrative counterfactuals, not forecasts. Tests check that the calibration reproduces the data, that repeating history or doing nothing loses, and that a known alternative wins and is affordable in Votes and Trust.

## Disclaimer

WEO Scenario Lab is an independent educational game. It is not affiliated with, endorsed by, or connected to the International Monetary Fund (IMF) or any government. The economies, model and advisors are stylised; where real data appear they come from public sources, which are cited, and every result is illustrative. Nothing here is a forecast or policy advice.

## Credits

Data: IMF, World Economic Outlook database (vintage and retrieval date in `app/data/weo.json`), via the IMF DataMapper API. Music: public-domain recordings from Wikimedia Commons, listed with sources in `public/music/CREDITS.md`. Interface sounds: [Interface Sounds](https://kenney.nl/assets/interface-sounds) by Kenney, CC0 (`public/audio/`). The ambience and stingers are synthesised in the browser (`app/game/audio.ts`). Advisor portraits come from the Palari art library.

## Origin

Moved out of the palari-web repository, where it was developed at `/weo-lab` on branch `claude/nifty-johnson-a3adl5` (commits `7c474d4` to `3bc83b5`).
