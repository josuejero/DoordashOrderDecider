# Contributing


Thanks for helping improve DoorDash Order Decider!


## Setup


- Node version from `.nvmrc` (use `nvm use`)
- Install: `npm ci`
- Dev server: `npm run dev`
- Tests: `npm run test` (or `--coverage`)
- Build: `npm run build`


## Branches & commits


- Branch names: `feat/<short-name>`, `fix/<short-name>`
- Keep commits focused; prefer conventional messages (e.g., `feat: decision engine`)


## Pull requests


- Ensure CI is green (lint, test, build)
- Add/adjust tests for decision math when needed