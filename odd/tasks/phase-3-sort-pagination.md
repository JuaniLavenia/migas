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
- T3.4 (added 2026-10-06 at the user's request) Custom order for both lists: a "Personalizado" sort option, which becomes the default for both lists. The stored array order IS the custom order (no new field, no migration; backups keep it). Reordering by drag and drop with `@dnd-kit` (pointer + keyboard) through a drag handle, plus "Subir"/"Bajar" buttons that move an item one position in the full list (so items can cross page boundaries). Reordering is only available with "Personalizado" selected and no active search.

## Constraints
- Defaults (T3.2/T3.3): ingredients by name A→Z; recipes by last update, newest first. Superseded by T3.4: "Personalizado" is the default for both lists; the other options keep their direction defaults.
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
- [x] T3.4a Store reorder actions + pure `moveItem` + "Personalizado" sort option as default — route: delegated
- [x] T3.4b Drag and drop (`@dnd-kit`) + "Subir"/"Bajar" buttons in both lists — route: delegated

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

- T3.4a done (previous commit 3e0dd0d). Pure `moveItem` (clamped target, same array on a no-op) and `sortListing` (no value reader → keep order) plus `CUSTOM_SORT` in `src/lib/listing.js`. Store actions `reorderIngredients/reorderRecipes(activeId, overId)` and `moveIngredient/moveRecipe(id, delta)` share two private helpers (`reorderById`, `moveById`) over the full stored array; unknown ids and edge moves return the same array; recipe `updatedAt` is untouched; persist version unchanged. "Personalizado" (`personalizado`) is the first option and the default of both lists (omitted from the URL).
  - Design: the custom order has no direction. Its option is `directional: false` and `SortControl` hides the asc/desc toggle for it; a `dir` in the URL is ignored while it is selected (and still applies when switching to another option). Rationale: "reversed custom order" adds a mode nobody asked for and would make Subir/Bajar read backwards.
  - Tests adapted for the intended default change: ingredients "lists by name A→Z…" → "lists ten per page with the total count" (no default-sort assertion) + "falls back to the defaults" now expects `personalizado` and no toggle; recipes "lists the newest first…" → custom order by default, "pages through" (page 2 starts at Receta 9), "keeps the open recipe open…" (now opens Receta 20, which is off page 1 in the custom order), "falls back to the defaults" (`personalizado`, Receta 1). New: custom order by default (ingredients, recipes), default sort kept out of the URL, recipes "sorts by last update, newest first".
  - RED: `pnpm test src/lib/listing.test.js src/stores/useRecipeStore.test.js` → 7 failed, 18 passed (moveItem/store actions missing); `pnpm test src/features` → 8 failed, 12 passed.
  - GREEN: full suite 177/177 passed; `pnpm build` passed.

- T3.4b done (previous commit 280b8cd). Dependencies: `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2 (React ≥16.8). Shared `src/shared/SortableList.jsx` (`SortableList`: DndContext + SortableContext, PointerSensor with a 5 px activation distance, KeyboardSensor with `sortableKeyboardCoordinates`, Spanish announcements and screen reader instructions; `SortableItem`: render prop that hands the handle props) and `src/shared/ReorderControls.jsx` (handle "Reordenar <nombre>", "Subir <nombre>", "Bajar <nombre>"; GripVertical/ChevronUp/ChevronDown icons). A drop calls `reorder*(activeId, overId)` on the full list (the visible page is a slice of it). Pure `pageOfIndex` in `src/lib/listing.js`.
  - Containers build a `reorder` prop (`onReorder`, `onMove`, global `firstId`/`lastId`) only for "Personalizado" without a search (ingredients) / with "Personalizado" (recipes); otherwise `null` and the controls are not rendered. Subir/Bajar are disabled at the global first/last position.
  - Page follow: when Subir/Bajar moves an item off the visible page, the container moves to the page where it now is (`pageOfIndex`), so the item stays in view and repeated presses keep working. The keyboard focus stays on the moved item's button (or its sibling when the button ended up disabled); the focus request survives up to 3 renders because the URL page change renders after the store change.
  - Layout: ingredients get a leading "Orden" column (`.table-panel.reorderable`, 750 px min width in the mobile horizontal table scroll); recipe items are wrapped in `.selector-row` (item + compact controls), which becomes the horizontal scroller's child on mobile. Recipes use `rectSortingStrategy` (works for the desktop column and the mobile row). A recipe click still navigates (the pointer listeners are only on the handle).
  - Test adapted: `App.test.jsx` "opens a recipe from the overview and the recipe selector" now clicks `/^C Cookies de chocolate/` (the library item), because "Subir/Bajar/Reordenar Cookies de chocolate" also matched `/Cookies de chocolate/`.
  - Drag in jsdom: keyboard drag is tested for real (handle focus → space → ArrowDown → space reorders the store; escape cancels with the Spanish announcement) by stubbing `getBoundingClientRect` with stacked row rects in that describe block. Pointer drag is not tested (jsdom has no layout/pointer capture).
  - RED: `pnpm test src/features` → 7 failed, 21 passed (the "recipe click still navigates" case passes vacuously before the feature). The keyboard-drag tests and `pageOfIndex` test were written after the shared components existed (no RED observed for them).
  - GREEN: full suite 188/188 passed; `pnpm build` passed (JS 328 kB, +51 kB from dnd-kit).
  - Not verified: manual smoke of drag and drop and the mobile layout in a real browser.

- Parent re-ran after T3.4: `corepack pnpm test` 188 passed (11 files); `corepack pnpm build` OK.
- Manual smoke of T3.4 in Chrome (2026-10-06, user's real data backed up to a separate key, restored byte-identical afterwards, backup key removed):
  - `/insumos` defaults to "Personalizado" and shows the stored order with handle + Subir/Bajar per row.
  - "Bajar Leche" moved Leche from 2nd to 3rd in the stored array.
  - Pointer drag with intermediate pointer moves (dispatched step by step) moved Huevos from 4th to 1st. The browser tool's single-jump drag did not trigger dnd-kit (no intermediate moves) — tool limitation, not an app bug.
  - `/recetas` library shows Personalizado with handle + Subir/Bajar.
  - Observation (not fixed): in the desktop recipe library column the extra controls squeeze long names onto 3 lines.
  - Not verified in the browser: keyboard drag (covered by tests), crossing pages with Subir/Bajar (covered by tests), mobile width (window resize does not apply).

- Layout fix (user-approved, route: inline — 3 small, already-understood edits): the recipe library stacks "Subir"/"Bajar" next to the handle (`ReorderControls stacked`) and drops the redundant `>` chevron from each card. Verification: `corepack pnpm test` 188 passed; `corepack pnpm build` OK; Chrome (read-only): long names now wrap to 2 lines instead of 3.

## Next step
Open the PR (single-pr).
