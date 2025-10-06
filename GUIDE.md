This is a single, end‑to‑end, **code‑free** plan that you can follow *in order*. It includes only shell commands and file responsibilities (no app code), and merges hardening items so nothing gets lost.

---

# Step 0 — Confirm Goal & Version Pins

**Outcome:** Shared understanding of what you’re building and the versions you’ll pin to.

* **Goal:** A fast, offline‑capable PWA that decides **Accept/Reject** for DoorDash orders based on whether your *average $/hr after the order* meets your target. iPhone Shortcut launches it; no servers.
* **Pins (Oct 6, 2025):** Node 20.19+ (or 22.12+), Vite 7.x, React 19.2, @vitejs/plugin‑react 5.x, TypeScript 5.9.x, Tailwind 4.x with @tailwindcss/postcss + postcss, vite‑plugin‑pwa ≥1.0.3, Vitest ≥3.2, jsdom 27.x.

---

# Step 1 — Prepare Your System

**Purpose:** Get a reproducible toolchain.
**Commands (macOS):**

* Install Homebrew (if missing):

  * `bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
* Install & init nvm:

  * `brew install nvm && mkdir -p ~/.nvm`
  * (Follow `brew info nvm` to add shell lines.)
* Install Node and lock npm behavior:

  * `nvm install 20.19.0 && nvm use 20.19.0` *(or `22.12.0`)*
  * `npm config set save-exact true`
  * `node -v && npm -v`

---

# Step 2 — Create & Initialize the Repository

**Purpose:** Start clean with reproducibility and hygiene baked in.
**Commands:**

* `mkdir DoordashOrderDecider && cd DoordashOrderDecider`
* `git init -b main`
* Pin Node for collaborators: `printf "20.19.0\n" > .nvmrc`
* **Hygiene files:**

  * `.gitignore` (Node/Vite): `curl -o .gitignore https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore`
  * `LICENSE` (choose your license): `printf "MIT\n" > LICENSE`
  * `.editorconfig`: `printf "root = true\n" > .editorconfig`
* Commit early: `git add -A && git commit -m "chore: repo skeleton"`

---

# Step 3 — Scaffold the App Skeleton

**Purpose:** Generate a minimal React+TS app and pin dependencies.
**Commands:**

* `npm create vite@latest . -- --template react-ts`
* Runtime deps (pin): `npm i -E react@19.2 react-dom@19.2`
* Build/test/style deps (pin):

  * `npm i -D -E vite@7 @vitejs/plugin-react@5 typescript@5.9`
  * `npm i -D -E vitest@3.2 jsdom@27`
  * `npm i -D -E tailwindcss@4 @tailwindcss/postcss postcss`
  * `npm i -D -E vite-plugin-pwa@1.0.3`
  * `npm i -D eslint prettier`
* Commit: `git add -A && git commit -m "chore: vite scaffold + pinned deps"`

---

# Step 4 — Create Baseline Files & Folders (Empty)

**Purpose:** Make all the files you’ll fill later (no app code yet).
**Commands:**

* `mkdir -p public src/lib src/components src/__tests__ tools`
* `touch tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html`
* `touch public/ios-icon-180.png public/maskable-512.png public/robots.txt`
* `touch src/main.tsx src/App.tsx src/styles.css`
* `touch src/lib/decision.ts src/lib/storage.ts`
* `touch src/components/NumberField.tsx src/components/TimeField.tsx src/components/Card.tsx`
* `touch src/__tests__/decision.test.ts`
* *(Optional)* `touch tools/doordash_decider.py`

**(Optional quick icon placeholders if you have ImageMagick):**

* `magick -size 180x180 canvas:white public/ios-icon-180.png`
* `magick -size 512x512 canvas:white public/maskable-512.png`

Commit: `git add -A && git commit -m "chore: baseline files & dirs (empty)"`

---

# Step 5 — Configure Tooling (Still Code‑Free Content)

**Purpose:** Wire up build tools without app logic.

1. **TypeScript (`tsconfig.json`)** — strict TS for React 19 + Vite 7; JSX automatic runtime; include test types.
2. **Vite (`vite.config.ts`)** — enable @vitejs/plugin‑react and vite‑plugin‑pwa with a minimal manifest (name, short_name, start_url, display, theme/background colors, icons) and auto‑update.
3. **Tailwind (`tailwind.config.js`)** — content globs (index.html + all TS/TSX under `src`) and any theme extension.
4. **PostCSS (`postcss.config.js`)** — use `@tailwindcss/postcss` with `postcss`.
5. **Package scripts (`package.json`)** — define `dev`, `build`, `preview`, `test`, plus `lint`, `format:check`, `format`.

Commit: `git add -A && git commit -m "chore: configure TS/Vite/Tailwind/PostCSS + scripts"`

---

# Step 6 — App Shell & Public Assets

**Purpose:** Prepare the outer shell and docs.

1. **`index.html`** — SPA mount point and icon/meta references (no app code).
2. **`public/`** — ensure icons exist and sizes match manifest; include `robots.txt`.
3. **`README.md`** — document the rule, how to install/run/test/build/deploy, iOS PWA install flow, limits (no push‑notification trigger), and pinned versions.

Commit: `git add -A && git commit -m "docs: index.html shell + public assets + README"`

---

# Step 7 — Source Structure (Responsibilities Only)

**Purpose:** Describe what each source file will do when you add app code later.

* **`src/main.tsx`** — bootstrap only (imports styles, renders root). No business logic.
* **`src/styles.css`** — Tailwind entry + minimal global resets.
* **`src/App.tsx`** — single‑screen calculator UI:

  * Inputs: Target $/hr, Shift start (HH:MM), Earned so far, Offered payout, Finish (HH:MM), optional Miles, Cost/mi, Buffer minutes.
  * Decision card: ACCEPT/REJECT, required ≥ $, offered/net $, projected averages, friendly finish ETA.
  * Actions: “I accepted” (adds net to earned; nudges default finish forward), “Reset offer”.
  * URL params: allow `payout`, `finish`, `miles`, `cpm` for Shortcut prefill.
  * Delegates math to `lib/decision`; persistence via `lib/storage`.
* **`src/lib/decision.ts`** — pure math engine (no UI/IO/storage):

  * Inputs (above); compute elapsed since start, now→finish (assume next day if finish ≤ now), required payout (clamped ≥ 0), net payout, accept boolean, projected averages (gross/net).
* **`src/lib/storage.ts`** — localStorage load/save of `{ targetRate, shiftStartHHMM, earnedSoFar, costPerMile }`, tolerant of empty/malformed data.
* **Components** — `Card.tsx` (layout), `NumberField.tsx` (labeled number input), `TimeField.tsx` (labeled time input HH:MM).
* **Tests** — `src/__tests__/decision.test.ts` to cover: behind‑pace, ahead‑of‑pace (required < 0 ⇒ treat as 0 in decision), midnight crossover, buffer impact, net vs gross acceptance flip.

Commit (structure notes / stubs only): `git add -A && git commit -m "docs: source responsibilities (no app code)"`

---

# Step 8 — Linting & Formatting

**Purpose:** Keep every commit clean and consistent.
**Commands:**

* `npm i -D eslint prettier`
* Add npm scripts for `lint`, `format:check`, `format`.
* Run checks:

  * `npx eslint . --ext .ts,.tsx`
  * `npx prettier --check .`
  * `npx prettier --write .`

Commit: `git add -A && git commit -m "chore: eslint + prettier setup"`

---

# Step 9 — PWA Completeness & Quality Gates

**Purpose:** Ensure installability, updates, and offline resilience.

* **Manifest extras:** add `id`, `scope`, `categories`, `shortcuts`, `screenshots`, `orientation`, and a fuller icon set (multiple sizes).
* **Service worker UX:** add an update flow ("update available → refresh"), an offline fallback, and a clear caching strategy (precache app shell; runtime cache icons/fonts).
* Keep plugin current: `npm i -D -E vite-plugin-pwa@1.0.3`
* Local prod preview: `npm run preview`
* Optional PWA audit: `npm i -D @lhci/cli && npx lhci autorun`

Commit: `git add -A && git commit -m "feat(pwa): manifest extras + sw ux + audits"`

---

# Step 10 — Validation, Time/Currency Rigor, and Guardrails

**Purpose:** Prevent bad inputs and keep math trustworthy.

* **Validation:** disallow negative miles; constrain buffer minutes; require key fields.
* **Errors:** friendly messages for unparsable finish time; provide a **Reset all** action.
* **Currency:** use integer cents internally; format with device locale for UI.
* **Time/DST:** rely on device local time; show **date** when finish crosses midnight.
* **12/24‑hour consistency:** document HH:MM everywhere (and in Shortcut prefill).

Commit: `git add -A && git commit -m "feat: input validation + time/currency rigor"`

---

# Step 11 — Local Dev, Tests, and Quality Loops

**Purpose:** Prove the app works the way you expect.
**Commands:**

* Start dev server: `npm run dev`
* Build for prod: `npm run build`
* Preview prod build: `npm run preview`
* Unit tests (watch): `npx vitest`
* Coverage run: `npx vitest run --coverage`

Commit after green runs: `git add -A && git commit -m "test: unit coverage pass"`

---

# Step 12 — GitHub Setup & First Push

**Purpose:** Move work to remote and keep it stable.
**Commands:**

* First full commit already done; push to a new repo:

  * With GitHub CLI: `gh repo create DoordashOrderDecider --public --source=. --remote=origin --push`
  * Or manual: `git remote add origin <url> && git push -u origin main`

---

# Step 13 — iPhone Integration

**Purpose:** Make it fast to trigger during a dash.

* **Install PWA on iOS:** Safari → open your deployed URL → **Share → Add to Home Screen**.
* **Shortcut (prefill & one‑tap):** create **Order Decider** that opens your deployed URL with `payout`, `finish`, `miles`, `cpm` query params. Map to **Back Tap**, **Action Button** (15 Pro/Max), or Apple Watch.
* **Automation:** Shortcuts → **Automation → App** → *When DoorDash is Opened* → **Run: Order Decider** (disable "Ask Before Running" if available).

---

# Step 14 — Deploy

**Purpose:** Share it publicly and test on real devices.
**Vercel Commands:**

* `npm i -g vercel`
* `vercel` (link project; follow prompts)
* `vercel deploy --prod`

**Netlify Commands:**

* `npm i -g netlify-cli`
* `ntl init`
* `ntl deploy --build` (preview)
* `ntl deploy --prod --dir=dist`

---

# Step 15 — Verify & QA

**Purpose:** Ensure a reliable, installable, offline experience.
**Commands:**

* `npm run preview` then open Chrome DevTools → **Application** → confirm **Manifest** and **Service Worker**.
* (Optional) `npx lhci autorun` against the preview server.

**Manual QA checklist:**

* Decision updates live as inputs change.
* “I accepted” updates earned‑so‑far and preserves defaults.
* Required can be negative when ahead; still yields **ACCEPT**.
* Finish earlier than now is treated as next day.
* PWA installs and works offline.
* Shortcut opens PWA with prefilled values.
* “App opened: DoorDash → run Shortcut” works; no push‑notification auto‑trigger expected.

---

# Step 16 — Dependency Guardrails & Maintenance

**Purpose:** Stay on safe major versions and keep CI reproducible.

* Confirm pins (Node 20/22, Vite 7, React 19.2, Tailwind 4, Vitest ≥3.2, jsdom 27).
* Commit and rely on the lockfile; in CI use `npm ci`.
* Add **Dependabot** or **Renovate** to keep within these major lines.
* (Optional) Add CI workflow that runs: setup‑node → `npm ci` → lint → test → build (and optionally Lighthouse CI).

---

# You’re Done

You now have a single ordered plan from blank folder → reproducible repo → scaffold → PWA‑complete app shell → validated inputs/time/currency rigor → tests → deploy → iPhone integration → audits → maintenance. No application code is included here; just file responsibilities and the shell commands to move through each phase.
