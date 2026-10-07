# Phase 5 — Accessibility, polish and mobile

## Objective
Make the app usable with keyboard and screen readers, fix the broken mobile recipes view, remove duplicated recipe-item logic, avoid needless cost recalculation, and move to a current Vite toolchain.

## Problem / Why
- `/recetas` overflows at 390 px (page 439 px wide, horizontal scroll). Measured in Chrome: `.recipe-workspace` is a single `1fr` grid track under 680 px, and `1fr` = `minmax(auto, 1fr)` grows to the min-content of the horizontal recipe selector (`.selector-item` min-width 150 px), so the selector panel and the editor become 421 px wide. Other routes do not overflow (the ingredients table scrolls inside `.table-panel` by design).
- Inside the editor, `.used-row` (5 columns) and `.editor-top` (never wraps) have no mobile rules.
- ~12 labels without `htmlFor`, 6–8 controls without any label, icon-only buttons without accessible name (`ModalShell` close, `Sidebar` mobile-close, `Topbar` menu, trash buttons with only `title`).
- `ModalShell` is a plain div: no dialog role, no focus trap, no Escape, no focus restore.
- The mobile sidebar is only translated off-screen, so its links stay in the tab order; no Escape close, no `aria-expanded`.
- The toast live region mounts together with its text, so it may not be announced.
- Text at 9–10 px in `App.css`.
- `recipeTotals` does `ingredients.find` per item, is never memoized, and is used as a sort key.
- `updateItem` / `addItem` / `removeItem` and the item-row JSX are duplicated in `RecipeModal.jsx` and `RecipesView.jsx`.
- Vite 4 + `@vitejs/plugin-react` 3 are outdated; plugin-react 3 forces a separate Vitest config.

## Scope
- T5.1 Mobile layout: recipes workspace/editor/item rows fit at 360–390 px with no page-level horizontal scroll; minimum font size raised (no text below 11 px; table headers/labels readable).
- T5.2 Form accessibility: every input/select/textarea has a programmatic label; icon-only buttons have `aria-label`.
- T5.3 Modals: `ModalShell` on `@radix-ui/react-dialog` (focus trap, Escape, focus restore, title as accessible name), keeping current styling.
- T5.4 Mobile sidebar + toast: closed sidebar is not focusable (`inert` or `visibility: hidden`), Escape closes it and returns focus to the menu button, menu button has `aria-expanded`/`aria-controls`; toast container always mounted as a polite live region.
- T5.5 Recipe items + performance: shared pure helpers for item add/update/remove and one shared item-row component used by both views; `recipeTotals` uses an id → ingredient `Map`; totals memoized where computed per render / per sort.
- T5.6 Toolchain: upgrade Vite, `@vitejs/plugin-react` and Vitest to compatible current versions; drop the separate-config workaround if no longer needed; tests and build green.

## Constraints
- No behavior changes outside the scope; persisted data shape untouched.
- UI copy in Spanish matching the app; code, identifiers, comments and docs in English. Commits: Conventional, neutral Spanish, no AI attribution.
- Test-first where a deterministic test exists (labels via `getByLabelText`, dialog Escape/focus, sidebar focusability, toast region, item helpers, totals with Map). CSS layout has no runnable RED in jsdom: verified by measurement in Chrome at 390 px.
- Keep the current visual design on desktop.

## Tasks
- [x] T5.1 Mobile layout + font sizes — route: delegated
- [x] T5.2 Form labels + icon button names — route: delegated
- [x] T5.3 ModalShell → Radix Dialog — route: delegated
- [x] T5.4 Mobile sidebar + toast live region — route: delegated
- [x] T5.5 Shared recipe item logic + recipeTotals Map/memo — route: delegated
- [x] T5.6 Vite / plugin-react / Vitest upgrade — route: delegated

Route evidence: CSS plus several feature components, shared components and tests per task → writer trigger; one bounded writer, sequential, one commit per task.

## Acceptance criteria
- At 390 px every route has `scrollWidth === innerWidth`; recipe editor rows are readable and usable.
- No font-size below 11 px in `App.css`.
- Every form control is reachable by `getByLabelText`/accessible name in tests.
- Modals: focus moves inside, Tab stays inside, Escape closes, focus returns to the opener.
- Closed mobile sidebar has no focusable descendants; Escape closes the open one.
- Toast text is announced via an always-present `role="status"` region.
- Item editing behaves the same in both views, with one implementation.
- All tests pass; build passes on the upgraded toolchain.

## Checks
- `corepack pnpm test`
- `corepack pnpm build`
- Overflow measurement at 390 px on every route in Chrome; manual smoke (user's real data backed up first and restored).

## Delivery
- Branch: `feat/phase-5-a11y-polish` from `main` @ 1de960b.
- Forecast: ~800–1100 authored changed lines. Strategy: `single-pr` (user's standing preference).
- RDD: off (global) — ordinary checks only.

## Progress
- Branch created. Mobile overflow diagnosed in Chrome (see Problem). Code mapped by an explorer.
- T5.1 (`App.css` only): every flexible grid track that holds content now uses `minmax(0, …fr)` (`.recipe-workspace` desktop and mobile, `.stats-grid`, `.overview-grid`, `.cost-progress`, `.editor-grid`, `.editor-cost-card`, `.used-row`, `.form-grid`, `.modal-ingredient-row`); `.recipe-workspace > *` and `.stat-card > *` get `min-width: 0`. The ingredients table keeps its intentional `min-width` inside the `.table-panel` scroller. `.editor-top` gets a gap and its title block shrinks; under 680 px it wraps (name on its own line). Under 680 px `.used-row` becomes a two-line grid (ingredient + remove / quantity + cost) with 14 px inputs and larger touch targets, and `.editor-cost-card` gets 18 px wrapping amounts. All 9/10 px font sizes raised to 11 px (`.selector-item strong` 11 → 12 px to keep hierarchy; the mobile 9 px `.stat-card` override removed). RED exception: CSS layout has no runnable RED in jsdom; to be verified by measurement in Chrome at 360/390 px. GREEN: `corepack pnpm test` 279/279; `corepack pnpm build` OK. Commit c3574cb.
- T5.2: labels linked with `htmlFor` + `useId` ids in `RecipeModal`, `RecipesView` editor and `IngredientModal`; `aria-label` on compact controls (recipe name input "Nombre de la receta", item select "Insumo", item quantity "Cantidad", ingredient search "Buscar insumo o categoría"); explicit `aria-label` on icon-only buttons (`ModalShell` "Cerrar", sidebar "Cerrar menú", topbar "Abrir menú", avatar "Mi perfil", "Quitar insumo", "Eliminar receta", ingredient row "Editar"/"Eliminar" — same names the `title` already gave, so existing tests keep their queries). `RecipeImageField` already labels its file input by wrapping it in the button label; `SortControl` already used `htmlFor`. New `src/FormAccessibility.test.jsx` (5 tests). RED: 5/5 failed ("Unable to find an accessible element with the role textbox and name Nombre de la receta", "… Nombre del insumo", "… Buscar insumo o categoría", "… button and name Abrir menú"). GREEN: 284/284; build OK. Commit 6c882b3.
- T5.3: `ModalShell` on `@radix-ui/react-dialog` 1.2.0 (same public props `title`/`children`/`onClose`; always `open` because callers mount it only while open). `Dialog.Title` names the dialog; `Dialog.Close` is the "Cerrar" button; Escape closes through `onOpenChange`; initial focus goes to the first form field; outside clicks are ignored as before; `aria-describedby={undefined}` since there is no description. Radix only returns focus to a `Dialog.Trigger`, so `ModalShell` remembers the element focused at mount and refocuses it in `onCloseAutoFocus`. CSS: new `.modal-dialog` with its own fixed centering/z-index (Content is a sibling of the Overlay, like `.confirm-dialog`). `@radix-ui/react-alert-dialog` bumped 1.1.23 → 1.1.24 so both share one `react-dialog`/`dismissable-layer`/`focus-scope` copy (with two copies the bundle grew 21 kB and layer stacks would not coordinate; deduped it grows 1.7 kB). New `src/Modals.test.jsx` (5 tests). RED: 5/5 failed (no `dialog` role with name "Nuevo insumo"/"Nueva receta"/"Editar insumo"); after the first implementation only the focus-return test failed, fixed by `onCloseAutoFocus`. GREEN: 289/289; build OK. Commit c88953d.
- T5.4: new `src/shared/useMediaQuery.js` (`useSyncExternalStore` over `matchMedia`, false where unavailable). `AppLayout` tracks `(max-width: 680px)`; the `Sidebar` (now `forwardRef`, `id="app-sidebar"`) gets `inert=""` while it is a closed mobile drawer (string form, as React 18 requires), never on desktop. Opening moves focus to the drawer's first control; Escape (document listener while open) and the "Cerrar menú" button close it and return focus to the menu button; navigating still just closes it. The menu button has `aria-expanded` and `aria-controls="app-sidebar"`. CSS fallback under 680 px: the closed drawer is `visibility: hidden` after the slide-out (delayed `visibility` transition), visible immediately on open. `ToastRegion` always renders a `role="status"` / `aria-live="polite"` container named "Notificaciones" and inserts the toast inside it. New `src/app/AppShell.test.jsx` (5 tests, `matchMedia` emulated). RED: 5/5 failed (no `inert`/`id` on the sidebar, no "Notificaciones" status region). GREEN: 294/294; build OK. Commit 33445cb.
- T5.5: new pure `src/lib/recipeItems.js` (`updateItemAt`, `addNextItem`, `removeItemAt`; `addNextItem` returns the same array when there are no ingredients so callers skip the write) used by `RecipeModal` (through `setForm`) and `RecipesView` (through `updateRecipe("items", …)`). New shared `src/features/recipes/RecipeItemRow.jsx` with the select (disabled "Insumo eliminado" option), quantity, unit and remove button and the T5.2 names ("Insumo", "Cantidad", "Quitar insumo"); `variant="editor"` keeps the `.used-row` markup (dot, `.used-quantity` with the unit label, `.used-cost`) for the T5.1 mobile grid, `variant="modal"` keeps `.modal-ingredient-row` (raw unit, "Cantidad" placeholder). `recipeMath.indexIngredients` builds an id → ingredient `Map` (first ingredient wins on a repeated id, as `Array#find`); `recipeTotals(recipe, ingredients, byId = indexIngredients(ingredients))` uses it. Both views look up row ingredients through a memoized index. Totals memoized with `useMemo` in `RecipesPage` (moved above the redirect early return, as hooks must be) and `OverviewPage`; `Overview` computes the list costs once per data change with one shared index. `sortBy` already read each value once per item (decorate-sort-undecorate), so the sort did not compute totals per comparison; `recipeSortValue` now builds the index once per reader and `RecipesPage` memoizes the sorted list. Tests: new `src/lib/recipeItems.test.js` (7), 3 new in `recipeMath.test.js` (prebuilt index gives identical totals; index content; first-wins on duplicates), 1 in `listing.test.js` (value reader called once per item), new `src/features/recipes/RecipeItemRow.test.jsx` (4). RED: `recipeItems.test.js` failed to load ("Failed to load url ./recipeItems … Does the file exist?") and the 3 `indexIngredients` tests failed ("indexIngredients is not a function"). The `listing.test.js` and `RecipeItemRow.test.jsx` tests are characterization tests: the first passed on the existing `sortBy`, the second was written after the extraction (no RED). GREEN: 309/309; build OK. Commit c54cf64.
- T5.6 (commit 4bcd8c1): Node is v24.21.0. Upgraded to the latest majors, whose ranges all accept it and each other: `vite` ^4.2.0 → ^8.3.3 (engines `^20.19.0 || >=22.12.0`), `@vitejs/plugin-react` ^3.1.0 → ^6.1.2 (peer `vite ^8.0.0`), `vitest` ^0.34.6 → ^5.0.3 (peer `vite ^6.4.0 || ^7.0.0 || ^8.0.0`, `jsdom *`; engines `^22.12.0 || ^24.0.0 || >=26.0.0`). `jsdom` (22) and the Testing Library packages unchanged: the new Vitest accepts any jsdom and the suite passes on 22. No new build-script approvals were needed (Vite 8 bundles with Rolldown, whose native binding ships as an optional dependency; esbuild is no longer installed, so `allowBuilds: esbuild` is now unused but harmless). `vitest.config.js` removed: the test settings moved into `vite.config.js` with plugin-react, which no longer breaks Vitest. `environmentMatchGlobs` (removed in newer Vitest) replaced by `test.projects` with `extends: true`: project `node` runs `src/**/*.test.js` (17 files, 230 tests), project `jsdom` runs `src/**/*.test.jsx` (10 files, 79 tests); `setupFiles` shared. RED/GREEN exception: a toolchain upgrade has no behavior to drive with a new failing test; the existing suite is the regression check. GREEN: 309/309 with no test changes and no warnings; build OK on Vite 8 (JS 348.00 → 339.43 kB, CSS 22.28 → 22.02 kB from the new minifiers).
- Parent re-ran after T5.6: `corepack pnpm test` 309 passed; `corepack pnpm build` OK (Vite 8.3.3). Earlier, after T5.4, measured on the user's dev server in Chrome at 360 and 390 px: `/`, `/insumos`, `/recetas` (editor), `/configuracion` have no horizontal overflow and no text below 11 px.
- Manual smoke in Chrome on the user's dev server restarted on Vite 8.3.3 (2026-10-07; user's real data backed up to a separate key, restored byte-identical, backup key removed; IndexedDB photos untouched):
  - Dev server starts and serves the app on Vite 8.
  - Recipe editor: "Agregar insumo" adds a row, changing quantity and ingredient recomputes the cost card, "Quitar insumo" removes it and the total returns to the original value.
  - "Nueva receta" modal: `role="dialog"` named "Nueva receta", centered in the viewport, focus starts on the name field, add/remove item rows work, Escape closes it and focus returns to the "Nueva receta" button.
  - Mobile (390 px iframe): closed sidebar is `inert` and `visibility: hidden`; the menu button opens it (`aria-expanded="true"`, focus moves inside); Escape closes it, re-applies `inert` and returns focus to the menu button; no horizontal overflow.
  - Not exercised: visual screenshot of the mobile editor (screen capture timed out; layout covered by the overflow measurements), ingredient modal (same `ModalShell`, covered by `Modals.test.jsx`).

## Next step
Open the PR (`single-pr`).
