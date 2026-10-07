# Phase 2 — Structure

## Objective
Restructure the app so Phase 3 (sorting + pagination) and Phase 4 (recipe images) can be built on solid ground.

## Problem / Why
- `src/App.jsx` (315 lines) owns navigation, every modal, toasts and all store handlers: a god component that every feature has to touch.
- Recipe `updated` is a display string ("Hoy", "Ahora"), so recipes can't be sorted by date or shown with a real date.
- The persist config is just `{ name: "miga-recipe-storage" }`: no `version`/`migrate`, so any shape change (dates now, images in Phase 4) has no upgrade path. Write failures (quota) are ignored while the header always says "Guardado localmente".
- Navigation is `useState`: reloading always lands on the overview, and a recipe can't be linked to.
- UI wiring has no runnable tests, so a restructure has no safety net.

## Scope
- T2.0 UI test harness (jsdom + Testing Library) with characterization tests of the main flows, written BEFORE the restructure.
- T2.1 Persist `version` + pure `migrate` + `partialize` (data only); storage write failures surface in the UI instead of a hardcoded "Guardado localmente".
- T2.2 `updatedAt` timestamp replaces the `updated` string (migration, store actions, backup import of old and new shapes, relative date display).
- T2.3 Split `App.jsx` into a layout (sidebar, topbar, footer, toast) and feature containers that read the store themselves (container-presentational).
- T2.4 Routes with `react-router-dom` (already installed): `/`, `/insumos`, `/recetas`, `/recetas/:recipeId`, `/configuracion`; the selected recipe comes from the URL.

## Constraints
- Behavior stays the same except: real dates, save-failure feedback, URL navigation.
- `BrowserRouter` (no hosting config exists yet; whatever host is chosen will need an SPA fallback rewrite — noted in README).
- UI copy in Spanish matching the app; code, identifiers, comments and docs in English.
- Commits: Conventional Commits in neutral Spanish, no AI attribution.
- Test-first: pure logic RED→GREEN; T2.0 tests are characterization (pass before the refactor and must keep passing after T2.3/T2.4, adapted only for intended changes).

## Tasks
- [x] T2.0 UI test harness + characterization tests — route: delegated
  - jsdom 22 + Testing Library (react 16, dom 10, user-event 14, jest-dom 6). `vitest.config.js` is separate from `vite.config.js` because `@vitejs/plugin-react` 3 fails under Vitest ("can't detect preamble"); it uses esbuild's automatic JSX instead. `.test.jsx` files run in jsdom via `environmentMatchGlobs`; pure `.test.js` stay in node.
  - `src/test/renderApp.jsx` resets the store to demo data (optionally overridden) and clears localStorage per test.
  - `src/App.test.jsx`: sidebar navigation, clearable recipe numeric field, create ingredient, delete in-use ingredient (dialog text), empty recipes state.
  - RED exception: characterization tests of existing behavior, expected to pass on first run (they did).
  - Verification: `corepack pnpm test` 86 passed (5 files); `corepack pnpm build` OK. Base: 8d07bd6.
- [x] T2.1 Persist version/migrate/partialize + save-failure feedback — route: delegated
  - `src/lib/recipeStorage.js`: `RECIPE_STORAGE_KEY` (also used by the ErrorBoundary), `RECIPE_STORAGE_VERSION = 1`, pure `migrateRecipeState(persisted, fromVersion)` (keeps only array `ingredients`/`recipes`; anything else falls back to defaults), `createSafeStorage(getStorage, onWrite)` (never throws; reports each write).
  - Store: `version`, `migrate`, `partialize` (ingredients + recipes), `createJSONStorage` over the safe adapter. `src/stores/useSaveStatusStore.js` holds `saved`/`error`; the topbar shows "No se pudo guardar" (visible on mobile too, with a backup hint in `title`) and recovers on the next successful write.
  - RED: `recipeStorage.test.js` failed (module not found); App test "tells the user when saving to the browser fails" failed (`Unable to find ... No se pudo guardar`). GREEN after implementation. `useRecipeStore.test.js` (v0 rehydrate → v1, partialize) written after wiring as an integration check.
  - Test setup now restores spies after each test.
  - Verification: `corepack pnpm test` 101 passed (7 files); `corepack pnpm build` OK. Previous commit: 41c21d9.
- [x] T2.2 `updatedAt` timestamps — route: delegated
  - Store: demo recipes, `addRecipe` and `updateRecipe` set `updatedAt: Date.now()`; the `updated` label is gone.
  - Migration v0→v1 (same `RECIPE_STORAGE_VERSION = 1`, nothing shipped between T2.1 and T2.2): each recipe drops `updated` and gets `updatedAt` = migration time unless it already has a finite one. Legacy labels ("Hoy", "Ayer", "Ahora") were relative to when they were written, so they cannot be converted into real dates.
  - `sanitizeBackup(data, now)`: keeps a positive finite `updatedAt`; old backups (`updated` label) or invalid values get the import time.
  - `src/lib/dates.js`: `formatRelativeDate(timestamp, now)` (Intl.RelativeTimeFormat "es", numeric auto: "ahora", "hace 5 horas", "ayer", "anteayer", "hace 3 días", weeks/months/years; future → "ahora"; invalid → "") and `formatMonthYear(date)` ("Agosto 2026"). Overview's eyebrow now uses the current month instead of the hardcoded "Agosto 2026".
  - RED: `dates.test.js` (module not found), 6 backup tests, the migration label test, 2 store date tests, and the App relative-date test all failed before implementation; GREEN after. The "2 days" case returned "anteayer" (valid es output), so the test expectation was corrected to it and a 3-day case added.
  - Verification: `corepack pnpm test` 129 passed (8 files); `corepack pnpm build` OK. Previous commit: f8b3911.
- [x] T2.3 Split `App.jsx` (layout + containers) — route: delegated
  - `src/app/`: `AppLayout` (container: counts, mobile menu, closes it on navigation), presentational `Sidebar` + `Topbar` (reads save status), `ToastRegion`, `navigation.js` (view ids, labels, icons).
  - Toasts: `src/stores/useToastStore.js` (`showToast`; a new id per toast restarts the 2.5 s timer).
  - Containers: `OverviewPage`, `IngredientsPage`, `RecipesPage`, `SettingsPage` read the store and own their modals/confirmations; `useNewRecipeModal` is the shared "Nueva receta" flow (Overview + Recipes). Existing views stay presentational and unchanged.
  - `App.jsx` (315 → 42 lines) keeps only the active view and selected recipe id (replaced by the URL in T2.4).
  - RED exception: pure refactor; the T2.0/T2.1/T2.2 UI tests are the safety net and passed unmodified. Only `src/test/renderApp.jsx` changed: it also resets the new toast store so a toast cannot leak between tests.
  - Verification: `corepack pnpm test` 129 passed (8 files); `corepack pnpm build` OK. Previous commit: f082749.
- [ ] T2.4 Routes — route: delegated

Route evidence: 5 tasks touching App, store, every feature view, main.jsx and new layout/container files → writer trigger; one bounded writer, sequential.

## Acceptance criteria
- Existing persisted data (unversioned, with `updated` strings) loads without loss after upgrading.
- Recipes store `updatedAt` (ms); the UI shows a relative date ("hace 2 días").
- Importing an old backup (with `updated`) and a new one (with `updatedAt`) both work.
- If saving to localStorage fails, the header says so instead of "Guardado localmente".
- `App.jsx` only composes providers/layout/routes; no feature handler lives there.
- Each view has its own URL; reloading keeps the view; `/recetas/:recipeId` opens that recipe; an unknown id falls back safely.
- All tests (pure + UI) pass; build passes.

## Checks
- `corepack pnpm test`
- `corepack pnpm build`
- Manual smoke in Chrome after T2.4.

## Delivery
- Branch: `refactor/phase-2-structure` from `main` @ 8d07bd6 (not stacked).
- Forecast: ~700–900 authored changed lines (above the ~400 heuristic). Strategy: `single-pr` — user explicitly chose one branch / one PR, as in Phase 1.
- RDD: off (global) — ordinary checks only.

## Progress
- Branch created.

## Next step
Confirm delivery strategy, then delegate T2.0–T2.4 to one writer.
