# Phase 3 — Sorting and pagination

## Objective
Let the user sort and page through ingredients and recipes, so the lists stay usable as they grow (the user already has 36 ingredients and 16 recipes).

## Problem / Why
- The ingredients table (`IngredientsView`) and the recipe library (`RecipesView` selector) render every item in insertion order.
- There is no way to find the most expensive ingredient or the most recently edited recipe without scanning the whole list.

## Scope
- T3.1 Pure list helpers: `sortBy` (stable, locale-aware for text with `es` collation, numeric for numbers, nulls last in both directions) and `paginate` (clamps the page, returns items + page info).
- T3.2 Ingredients: sort control (Nombre, Categoría, Precio del pack, Costo por unidad; asc/desc) + pagination (10 per page) combined with the existing search.
- T3.3 Recipes library: sort control (Nombre, Última actualización, Costo total, Precio sugerido; asc/desc) + pagination (8 per page). The open recipe stays selected regardless of the page.
- Sort, direction and page live in the URL query string (`?orden=…&dir=…&pagina=…`), so they survive reload and navigation back.

## Constraints
- Defaults keep today's feel: ingredients by name A→Z; recipes by last update, newest first.
- Changing search or sort resets to page 1; deleting items never leaves the user on an empty page beyond the last.
- Counts (sidebar badges, "N insumos", "N recetas") keep showing totals, not page sizes; search shows "N de M" where relevant.
- Ingredients with no unit price (invalid pack size, Phase 1) sort last for "Costo por unidad".
- The Overview list is out of scope.
- UI copy in Spanish matching the app; code, identifiers, comments and docs in English. Commits: Conventional, neutral Spanish, no AI attribution.
- Test-first: pure helpers RED→GREEN; UI behavior with Testing Library (RED→GREEN).
- Accessible controls: labelled `<select>`s, pagination as a `<nav aria-label>` with `aria-current="page"`, buttons disabled at the edges.

## Tasks
- [x] T3.1 Pure `sortBy` + `paginate` helpers — route: delegated
- [x] T3.2 Ingredients sort + pagination — route: delegated
- [x] T3.3 Recipes library sort + pagination — route: delegated

Route evidence: shared helpers + a shared pagination component + two feature views/containers + tests → writer trigger; one bounded writer, sequential.

## Acceptance criteria
- Each list can be sorted by every listed field in both directions; ties keep a stable order.
- Pagination shows page X of Y with previous/next; it hides when everything fits on one page.
- Sort/direction/page are restored from the URL after reload; invalid query values fall back to defaults.
- Search + sort + pagination work together; search or sort changes go back to page 1.
- Deleting the last item of the last page moves to the new last page.
- All tests pass; build passes.

## Checks
- `corepack pnpm test`
- `corepack pnpm build`
- Manual smoke in Chrome (read-only on the user's real data).

## Delivery
- Branch: `feat/phase-3-sort-pagination` from `main` @ b801d3e (not stacked).
- Forecast: ~450–600 authored changed lines. Strategy: `single-pr` (user's standing preference for phases).
- RDD: off (global) — ordinary checks only.

## Progress
- Branch created.
- T3.1 done: `src/lib/listing.js` (`sortBy`, `paginate`, `parseListingParams`) + `src/lib/listing.test.js` (14 tests). Base: b801d3e.
  - RED: `pnpm test src/lib/listing.test.js` failed to load `./listing` (module missing).
  - GREEN: 14/14; full suite 149/149 passed; `pnpm build` passed.

- T3.2 done (previous commit 1ccd459). Shared `useListingParams` hook (URL state, defaults omitted, `replace` history on every sort/dir/page change), `Pagination` (prev/next, "Página X de Y", numbered buttons with `aria-current` up to 7 pages) and `SortControl` (labelled select + direction toggle) in `src/shared`; sort options in `features/ingredients/ingredientListing.js` (name breaks ties). Search → sort → paginate in `IngredientsPage`; an out-of-range page is clamped and the URL corrected by an effect. `renderApp` gained a query-string probe (`currentSearchParams`). The App test that deleted "the first row" now searches "Harina" first (rows are sorted by name now).
  - RED: `pnpm test src/features/ingredients` → 8 failed, 1 passed (the "pagination hidden on one page" case passes vacuously before the feature).
  - GREEN: full suite 158/158 passed; `pnpm build` passed.

- T3.3 done (previous commit 01a8923). Sort options in `features/recipes/recipeListing.js` (cost/price via `recipeTotals`); `RecipesPage` sorts + paginates the library with the shared hook, keeps the query string when selecting, creating, deleting and on its own redirects (`/recetas?orden=…` → `/recetas/:id?orden=…`); the clamp effect is skipped while a redirect is pending. The library is now a `<section aria-label="Biblioteca de recetas">` with the sort control (shown when there are 2+ recipes), a `.selector-list` and a compact pagination (icon-only steps, status on its own line). Mobile: only `.selector-list` scrolls horizontally; sort and pagination sit above/below it. The open recipe is not forced onto the visible page.
  - RED: `pnpm test src/features/recipes` → 8/8 failed.
  - GREEN: full suite 166/166 passed; `pnpm build` passed.

- Parent re-ran: `corepack pnpm test` 166 passed (11 files); `corepack pnpm build` OK.
- Manual smoke in Chrome (2026-10-06, read-only on the user's real data: 36 ingredients, 16 recipes):
  - `/insumos?orden=costoUnidad&dir=desc&pagina=2` restores the sort select, shows "Página 2 de 4" and rows ordered by unit cost descending; "36 insumos" shows the total.
  - `/recetas` opens the first recipe; the library shows the sort control and "16 recetas".
  - `/recetas/cookies?orden=nombre&dir=asc&pagina=2` shows page 2 of 2 sorted by name while the open recipe (not on that page) stays in the editor.
  - No DOM churn on an idle page (0 mutations in 1.5 s, no history growth); stored data unchanged by navigation.
  - Not verified in the browser: the mobile layout (the window resize did not apply; viewport stayed 1366 px wide).

## Next step
Open the PR (single-pr).
