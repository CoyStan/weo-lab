# WEO Scenario Lab

A policy game for economists, and for anyone curious. Run a stylised economy one quarter at a time, through six missions or in free play. Built with Next.js 16, React Three Fiber and a small quarterly open-economy model (`app/model/`). Calibrations are illustrative, not official IMF data.

## How it plays

- **Campaign.** Six short missions across four economies, each teaching one idea: monetary lags, how hard a policy rule should react, fiscal consolidation, the exchange rate as a shock absorber, an IMF programme behind a peg, and a sudden stop with every tool unlocked. Levers unlock as you go.
- **One quarter per turn.** You decide for the coming quarter, then press *End quarter* (or Enter). A newspaper-style recap shows what happened.
- **See before you commit.** Each goal card shows the outturn so far, the staff forecast under your current settings (dashed) and the forecast from before this quarter's changes (faint). Resting the pointer on a lever shows what nudging it would do to each goal.
- **Surprises.** Some shocks are announced, others arrive unannounced; the forecast only knows what you know. When one hits, a card offers two or three ready-made responses.
- **Advisors.** A central bank governor, a finance minister and an IMF mission chief comment on the forecast in plain language, and react as you move levers. They disagree, which is the point.
- **Why did it move?** Inflation, activity and debt are decomposed each quarter into what pushed them (demand, expectations, the currency, oil, interest against growth, and so on).
- **Rewind and hints.** Step back a quarter at any time, or ask for a hint.
- **Music and sound.** Public-domain recordings of Satie and Debussy (Gymnopédie No. 1 by default), or a generated sea and music box that turns tense when a goal is at risk; interface sounds and stingers. Nothing plays before your first click.
- **Settings.** Choose and preview the music, set music and effects volumes, waves on or off, the visual design, island banners, reduced motion, tips, and reset progress. About has the disclaimer and credits.
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

## Disclaimer

WEO Scenario Lab is an independent educational game. It is not affiliated with, endorsed by, or connected to the International Monetary Fund (IMF) or any government. The economies, model and advisors are stylised; where real data appear they come from public sources, which are cited, and every result is illustrative. Nothing here is a forecast or policy advice.

## Credits

Music: public-domain recordings from Wikimedia Commons, listed with sources in `public/music/CREDITS.md`. Interface sounds: [Interface Sounds](https://kenney.nl/assets/interface-sounds) by Kenney, CC0 (`public/audio/`). The ambience and stingers are synthesised in the browser (`app/game/audio.ts`). Advisor portraits come from the Palari art library.

## Origin

Moved out of the palari-web repository, where it was developed at `/weo-lab` on branch `claude/nifty-johnson-a3adl5` (commits `7c474d4` to `3bc83b5`).
