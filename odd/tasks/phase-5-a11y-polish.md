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
- [ ] T5.2 Form labels + icon button names — route: delegated
- [ ] T5.3 ModalShell → Radix Dialog — route: delegated
- [ ] T5.4 Mobile sidebar + toast live region — route: delegated
- [ ] T5.5 Shared recipe item logic + recipeTotals Map/memo — route: delegated
- [ ] T5.6 Vite / plugin-react / Vitest upgrade — route: delegated

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
- T5.1 (`App.css` only): every flexible grid track that holds content now uses `minmax(0, …fr)` (`.recipe-workspace` desktop and mobile, `.stats-grid`, `.overview-grid`, `.cost-progress`, `.editor-grid`, `.editor-cost-card`, `.used-row`, `.form-grid`, `.modal-ingredient-row`); `.recipe-workspace > *` and `.stat-card > *` get `min-width: 0`. The ingredients table keeps its intentional `min-width` inside the `.table-panel` scroller. `.editor-top` gets a gap and its title block shrinks; under 680 px it wraps (name on its own line). Under 680 px `.used-row` becomes a two-line grid (ingredient + remove / quantity + cost) with 14 px inputs and larger touch targets, and `.editor-cost-card` gets 18 px wrapping amounts. All 9/10 px font sizes raised to 11 px (`.selector-item strong` 11 → 12 px to keep hierarchy; the mobile 9 px `.stat-card` override removed). RED exception: CSS layout has no runnable RED in jsdom; to be verified by measurement in Chrome at 360/390 px. GREEN: `corepack pnpm test` 279/279; `corepack pnpm build` OK.

## Next step
T5.2.
