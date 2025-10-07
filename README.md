# DoorDash Order Decider (PWA)

[![CI](https://github.com/josuejero/DoordashOrderDecider/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A fast, offline‑friendly calculator that decides **ACCEPT/REJECT** for DoorDash orders based on whether your **average $/hr after this order** meets your target. Built with **Vite 7 + React 19 + TypeScript + Tailwind 4** and a lightweight **PWA** service worker.

> ⚡️ Tip: Add it to iOS Home Screen, and create a Shortcut that opens the app with prefilled query params for one‑tap use while dashing.

## Demo

- Deployed URL: `https://doordash-order-decider-kymvlo9vh-josues-projects-43dae7c3.vercel.app/`  
- iOS: **Share → Add to Home Screen**

## Features

- ✅ Instant accept/reject decision using your target rate and current progress
- 🚗 Optional miles × cost/mi for **net** calculations
- 🕒 Handles midnight crossover, buffer minutes, and shows finish date when applicable
- 📱 Installable PWA, works offline once cached
- 🧪 Vitest unit tests for decision math

## Quick start

```bash
# install exact dependency versions from lockfile
npm ci

# local dev
npm run dev

# tests + coverage
npm run test -- --coverage

# production build & preview
npm run build && npm run preview
````

## URL parameters (for iOS Shortcuts)

Open the app with any of these query params to prefill fields:

* `payout` (number, dollars)
* `finish` (24h time `HH:MM`)
* `miles` (number)
* `cpm` (cost per mile)

**Example:**

````
https://doordash-order-decider-kymvlo9vh-josues-projects-43dae7c3.vercel.app/?payout=14&finish=19:25&miles=4.2&cpm=0.5

````

## Decision rule (in plain English)

> After this order finishes, will your **average $/hr** be at least your **target**?

We compute time from **shift start → projected finish** (+ optional buffer). From that duration we derive the dollars **required** to be on pace. We consider **net payout** when `miles` & `cpm` are provided. If `netPayout ≥ requiredDollars`, the badge says **ACCEPT**.

## Directory structure

`````
public/
  offline.html
  robots.txt
src/
  __tests__/decision.test.ts
  components/
    Card.tsx
    NumberField.tsx
    TimeField.tsx
  lib/
    decision.ts
    storage.ts
  styles.css
  App.tsx
  main.tsx
.editorconfig
.nvmrc
.eslint.config.js
.postcss.config.js
.tailwind.config.js
.tsconfig.json
.vite.config.ts
`````

> Housekeeping: remove any legacy template CSS files you don’t use (e.g. `src/App.css`, `src/index.css`).

## Troubleshooting

* **TS can’t find `virtual:pwa-register`** → Ensure `vite-plugin-pwa` is installed and enabled in `vite.config.ts`. The virtual module resolves **at build time**.
* **Tailwind classes not applying** → Confirm `src/styles.css` imports Tailwind and that `tailwind.config.js` has proper content globs (`./index.html`, `./src/**/*.{ts,tsx}`).

## License

MIT — see [LICENSE](./LICENSE).

