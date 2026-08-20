# Exploration: Cloud backend + auth (Node/Express/Mongoose/JWT + MongoDB Atlas)

> Materialized from Engram `sdd/cloud-backend-auth/explore` (the explore phase ran without Write access).
> Content is the durable exploration record; decisions taken after it are recorded in `proposal.md`.

## Context / Prior Decisions (input, not open questions)

- MongoDB Atlas App Services / Data API is discarded — EOL 2025-09-30, confirmed via web search, no longer exists.
- Supabase / other BaaS discarded — user wants to keep using their existing Atlas cluster.
- Chosen path: self-hosted backend, `server/` folder sibling to `src/`, Node + Express + Mongoose + JWT (bcryptjs), pnpm (not npm) for the backend too.
- Backend hosting (e.g. Render) account creation and env var config there is manual/out of scope for this change's implementation.
- Work happens on the existing `backend` branch, targeting a single PR to `main`.

## Current State

### Frontend data layer (`src/stores/useRecipeStore.js`)

- Single Zustand store wrapped in `persist` middleware, storage key `miga-recipe-storage`.
- State shape: `{ ingredients: Ingredient[], recipes: Recipe[] }`.
  - Ingredient: `{ id, name, category, unit, packSize, packCost }`. Demo ingredients use hand-written string ids, but `addIngredient` generates ids via `uuidv4()` (string).
  - Recipe: `{ id, name, yield, margin, extras, updated, items: [{ ingredientId, quantity }] }`. `items[].ingredientId` is a foreign-key-by-string-id reference into ingredients, resolved at read time in `src/lib/recipeMath.js::recipeTotals` (silently ignores an item if the referenced ingredient id is missing — no integrity error). `addRecipe` generates id via `uuidv4()`.
- Actions: `addIngredient`, `updateIngredient`, `deleteIngredient`, `addRecipe`, `updateRecipe` (stamps `updated: "Ahora"`), `getRecipe`, `importData({ ingredients, recipes })`.
- `importData` calls `mergeById(current, incoming)` for both collections independently: incoming items without an id get one generated (`uuidv4()`); items with a matching existing id get shallow-merged (incoming wins per-field); items with a new id are appended. This merge-by-id function is the only existing "reconciliation" logic in the codebase and is a strong candidate to reuse/mirror for local→cloud migration.
- No `deleteRecipe` action exists today — only add/update for recipes.

### Backup export/import (`src/features/settings/SettingsView.jsx`)

- Export: serializes `{ ingredients, recipes }` to a downloaded `.json` file — no version field, no auth/user metadata.
- Import: reads a `.json` file, validates shape weakly, calls `onImport(data)` -> `useRecipeStore.importData`. Errors swallowed into a generic toast, no detail surfaced.
- This import path is a ready-made migration mechanism: "sign up, then import your last backup" requires zero new UI beyond wiring `importData` to also call the new cloud API.

### App shell (`src/App.jsx`)

- Reads ingredients/recipes and all mutators directly from the Zustand store via selector hooks, prop-drills into `Overview`, `IngredientsView`, `RecipesView`, `SettingsView`.
- No routing today: `activeView` is local `useState`, not react-router-dom — despite react-router-dom being an installed, unused dependency.
- Hardcoded UI text "Guardado localmente" (topbar) and a static avatar "MP"/"Mi perfil"/"Emprendimiento" — placeholders needing real user identity once auth exists.
- No error boundary, no loading state anywhere.

### Installed-but-unused dependencies (`package.json`)

- `@tanstack/react-query@^5.100.11` — installed, zero imports found anywhere in `src/`. Natural fit for server-state fetching/caching once a backend exists.
- `react-router-dom@^7.15.1` — installed, zero usage. Would be needed for `/login`, `/signup`, route protection.
- `msw@^2.14.6` — installed, no config files found. No test runner configured at all, so dormant either way.
- Zustand (`^5.0.13`) can still hold client-side UI/session state (e.g. JWT, active view) even if ingredients/recipes move to react-query — decision for sdd-design.

### `.gitignore`

- Confirmed: `.env` and `.env.*` (with `!.env.example` exception) are listed without a leading `/` or path prefix, so they match at any directory depth, including `server/.env`. No change needed. Verified by reading the file directly.

## zustand persist storage shape (verified in `node_modules/zustand/middleware.js`)

Confirmed by reading middleware source directly:

```js
const setItem = () => {
  const state = options.partialize({ ...get() });
  return storage.setItem(options.name, { state, version: options.version });
};
```

`storage.setItem` then does `localStorage.setItem(name, JSON.stringify({ state, version }))`.

Consequence: `localStorage.getItem("miga-recipe-storage")` is NOT `{ ingredients, recipes }` directly — it is `JSON.stringify({ state: { ingredients, recipes }, version: <number> })`. Any client-side migration script reading raw localStorage to auto-offer "import your existing local data" on first signup MUST parse `JSON.parse(raw).state.ingredients` / `.state.recipes`, not root-level keys, or it silently finds `undefined` and skips migration. Genuine, easy-to-miss bug surface — worth an explicit task/test in sdd-tasks.

## What the project does NOT have today (confirmed)

- No test runner (`openspec/config.yaml` states `testing.test_runner: none`; no vitest/jest/playwright in `package.json`).
- No CI configuration (no `.github/workflows/`, none found).
- No backend of any kind — no `server/` directory exists yet (confirmed via glob, zero matches).
- No routing, no error boundaries, no loading-state pattern established.

## Affected Areas

- `src/stores/useRecipeStore.js` — replaced or retained as local cache alongside react-query; `importData`/`mergeById` reusable for migration.
- `src/features/settings/SettingsView.jsx` — natural home for "migrate local backup to your account"; local export as manual backup escape hatch likely still wanted.
- `src/App.jsx` — needs auth-aware UI, JWT attachment to API calls, loading/error states (first time in this codebase).
- `package.json` — `server/` needs its own `package.json`; pnpm workspace vs. two independent projects is an OPEN DESIGN QUESTION at explore time.
- `.gitignore` — no change required.
- New: `server/` (Express app, Mongoose models for User/Ingredient/Recipe, JWT auth middleware, bcryptjs hashing) — entirely new, no existing pattern to follow.

## Approaches

1. **Full replace**: server owns all state, client fetches via react-query, Zustand retired for domain data.
   - Pros: clean single source of truth; matches "cloud storage" intent; uses already-installed react-query as designed.
   - Cons: no offline/optimistic UX unless deliberately configured; requires network for every read; loses current instant no-backend feel.
   - Effort: Medium-High.
2. **Hybrid**: server is source of truth, Zustand persist stays as offline-first local cache synced on login/logout.
   - Pros: preserves snappy UX; local export still meaningful as offline fallback; reuses `importData`/`mergeById` as sync-merge primitive.
   - Cons: two sources of truth to reconcile; more moving parts with zero test runner in place; larger effort.
   - Effort: High.
3. **Minimal**: auth gate only, data stays 100% local per-device, no real cloud sync yet (deferred follow-up).
   - Pros: smaller first PR, fits the 400-line review budget more easily, decouples JWT/auth review from data-sync complexity.
   - Cons: does not deliver cloud storage on Atlas — contradicts the stated goal unless framed as an accepted phase.
   - Effort: Low for this slice.

## Recommendation (explore phase)

Approach 1 (full replace, server as source of truth via react-query) combined with a mandatory login gate, since the stated goal is cross-device cloud storage. Reuse `mergeById` semantics as the exact algorithm for the one-time "import local backup into new account" migration. Treat react-router-dom for `/login`, `/signup` and route protection as in-scope. Decide `server/` packaging explicitly before sdd-tasks.

> **Superseded**: after this exploration the user explicitly chose the **hybrid, optional-login** model (Approach 2 shape, no mandatory gate). See `proposal.md` for the accepted direction and the concrete resolution of every open question below.

## Risks

- Local data migration is the highest-risk unknown: the user has real recipes/ingredients saved locally. A destructive migration (overwrite instead of merge) would be a serious regression. `importData`/`mergeById` already solves this correctly for the JSON-backup case, but raw-localStorage-read migration must account for the `{state, version}` wrapper documented above.
- Login-mandatory vs. no-account mode was not decided at explore time — must be an explicit user decision, not a silent assumption.
- JWT client storage location unresolved: localStorage (simple, XSS-exposed) vs memory-only (safer, needs refresh flow) vs httpOnly cookie (safest against XSS, needs CORS/SameSite/CSRF handling across different hosts).
- No rate-limiting on login exists by default — self-hosted Express with no BaaS protection means brute-force exposure unless `express-rate-limit` (or equivalent) is added as an explicit task.
- No test runner and no CI today. Introducing auth (security-sensitive) with zero automated tests is a real risk; decide explicitly whether to add minimal backend tests or consciously defer.
- `server/` packaging/monorepo decision unresolved — pnpm workspace vs. sibling projects with separate lockfiles changes install commands, CI shape, and deploy story (e.g. Render build/start command scoped to `server/`).
- No `deleteRecipe` action exists in the current store — if the new API should reach parity plus deletion, call it out explicitly rather than inventing it during apply.
- `recipes[].items[].ingredientId` is a soft reference with silent-ignore-on-missing behavior today. A Mongo schema should decide explicitly whether to enforce a real foreign key (Mongoose ref + population, delete protection/cascade) or preserve today's lenient behavior.

## Ready for Proposal

Yes. The proposal must explicitly resolve (not silently assume): mandatory-login vs. optional-account mode, JWT storage location, `server/` packaging strategy, and whether login rate-limiting and minimal backend tests are in scope.
