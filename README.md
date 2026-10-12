# WEO Scenario Lab

A 3D policy sandbox for macroeconomists, built with Next.js 16, React Three Fiber and a small quarterly open-economy model (`app/model/`). Calibrations are illustrative, not official IMF data.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run check
```

Runs the TypeScript check, the model tests (`npm run test:model`) and a production build.

## Layout

- `app/WeoLab.tsx`: the lab shell; `app/page.tsx` renders it at `/`.
- `app/model/`: economy simulation, shocks, presets, constraints, scoring and tests.
- `app/scene/`: the procedural hex island (React Three Fiber).
- `app/components/`: panels, charts and the top bar.
- `app/themes/`: the selectable visual themes; check one with `node app/themes/check-theme.ts <id>`.

## Origin

Moved out of the palari-web repository, where it was developed at `/weo-lab` on branch `claude/nifty-johnson-a3adl5` (commits `7c474d4` to `3bc83b5`).
