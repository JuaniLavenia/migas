# Phase 0 — Foundation

## Objective
Give the project a test runner and a clean dependency tree before fixing bugs (Phase 1) and restructuring (Phase 2).

## Problem / Why
- There is no test runner, so cost calculations (`src/lib/recipeMath.js`) — the core value of the app — have no safety net.
- Several dependencies are installed but never imported, which inflates install time and misleads readers about the stack.

## Scope
- Add Vitest with a `test` script.
- Characterization tests for `ingredientCost` and `recipeTotals` (current behavior, including fallbacks).
- Remove unused dependencies: `@tanstack/react-query`, `msw`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss`, `autoprefixer`, `postcss`.

## Constraints
- `react-router-dom` stays: Phase 2 introduces routes.
- No behavior changes in this phase.
- Use `corepack pnpm` (pnpm is not on PATH).
- Commit messages follow the existing history: Conventional Commits, neutral Spanish, no AI attribution.

## Tasks
- [x] T0.1 Add Vitest + `test` script — route: delegated (writer, with T0.2/T0.3)
- [x] T0.2 Characterization tests for `recipeMath` — route: delegated
- [x] T0.3 Remove unused dependencies — route: delegated

Route evidence: install + config + tests + lockfile span several files and need command execution; one bounded writer.

## Acceptance criteria
- `corepack pnpm test` runs and passes.
- `corepack pnpm build` passes after dependency removal.
- No unused dependency from the list above remains in `package.json`.

## Checks
- `corepack pnpm test`
- `corepack pnpm build`
- `rg` for removed package names in `src/`, `index.html`, `vite.config.js` returns nothing.

## Delivery
- Branch: `chore/phase-0-foundation` (from `main` @ 0c42add). Strategy: `ask-on-risk`.
- Forecast: ~120 authored changed lines (lockfile excluded). Single PR.
- RDD: off (global) — ordinary checks only.

## Progress
- Branch created.
- T0.1: `vitest@^0.34.6` added as devDependency (its `vite` dependency range `^3 || ^4 || ^5` matches Vite 4; verified with `npm view`). `"test": "vitest run"` script. No config file: Vitest's default `node` environment is enough for pure functions.
- T0.2: `src/lib/recipeMath.test.js`, 16 characterization tests. Test-first exception: they pin existing behavior, so there is no RED phase; all passed on first run (no behavior surprises).
  - Evidence: `corepack pnpm test` -> 1 file, 16 tests passed.
  - Commit: `8602cf4` `chore: agregar vitest y tests de caracterización de recipeMath`.
- T0.3: removed `@tanstack/react-query`, `msw`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss`, `autoprefixer`, `postcss`. No PostCSS/Tailwind config files existed and no CSS used `@tailwind`/`@apply`. `react-router-dom` kept.
  - Evidence: `rg` for the removed names in `src/`, `index.html`, `vite.config.js` -> no matches (before and after removal); `corepack pnpm build` -> built OK (only pre-existing Radix `"use client"` directive warnings); `corepack pnpm test` -> 16 passed.
  - Commit: `chore: eliminar dependencias sin uso` (the commit that contains this line; see `git log`).

## Next step
All Phase 0 tasks done. User decides push/PR; then Phase 1.
