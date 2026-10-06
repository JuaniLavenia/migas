# Phase 1 — Critical bugs

## Objective
Fix the bugs that lose data, crash the app, or show wrong numbers, before restructuring (Phase 2).

## Problem / Why
Exploration (2026-10-06) found:
- Recipe edits are written to `selectedRecipeId` (hardcoded `"cookies"`, `App.jsx:39`) while the editor shows the `recipes[0]` fallback (`App.jsx:54-55,102`), so edits are silently lost when that id no longer exists. Deleting the last recipe sets the selection to `undefined` (`App.jsx:121`).
- Backup import validates almost nothing (`SettingsView.jsx:37-42`, `useRecipeStore.js:128-138`). A recipe without `items` or `name` crashes rendering, and since it is persisted, the app crashes on every reload. There is no ErrorBoundary.
- The Overview spotlight shows `recipes[0]`'s name/yield/extras/margin next to the selected recipe's totals (`Overview.jsx:71-109`, `App.jsx:56`).
- Numeric inputs can't be cleared: `Number("") === 0` in `onChange` writes 0 back into the controlled input (`App.jsx:103`, `RecipesView.jsx:22`, `RecipeModal.jsx:20`). The live editor also accepts negative margin/extras and yield < 1.
- `packSize` 0 shows Infinity/NaN in the ingredient table (`IngredientsView.jsx:60`) while `ingredientCost` silently treats it as 1. Editing an ingredient with `packCost` 0 blanks the required field (`IngredientModal.jsx:9-10`).
- Deleting an ingredient used by recipes silently costs it $0, and the recipe line `<select>` shows the first option while the state keeps the deleted id (`RecipesView.jsx:185-196`, `RecipeModal.jsx:110-121`).

## Scope
- T1.1 Safe recipe selection.
- T1.2 Import validation + root ErrorBoundary + defensive totals.
- T1.3 Consistent Overview spotlight.
- T1.4 Clearable numeric inputs with min enforcement.
- T1.5 Consistent pack-size handling (invalid pack size shown as unavailable, not Infinity; free ingredients editable).
- T1.6 Orphaned ingredient lines: warning in the recipe, placeholder option in selects, warning when deleting an ingredient in use.

## Constraints
- No restructuring of `App.jsx` beyond what each fix needs (Phase 2 splits it).
- No persist `version`/`migrate` yet (Phase 2).
- UI copy stays in Spanish like the existing app; code, identifiers and comments in English.
- Commits: Conventional Commits, neutral Spanish, no AI attribution.
- Test-first for pure logic (Vitest, node env). UI wiring verified by build + manual reasoning; no jsdom/RTL in this phase.

## Tasks
- [x] T1.1 Safe recipe selection — route: delegated
  - `resolveSelectedRecipe(recipes, id)` in `src/lib/recipeSelection.js`; App initializes the selection from the first stored recipe and routes updates/deletes through the effective recipe's id. RecipesView shows an empty state ("Todavía no hay recetas.") with a create button. Overview empty state lands with T1.3 (it did not crash; it only showed mismatched data).
  - RED: `recipeSelection.test.js` failed to load (`Failed to load url ./recipeSelection`). GREEN: 21/21.
  - Verification: `corepack pnpm test`: 21 passed; `corepack pnpm build`: built OK.
- [x] T1.2 Import validation + ErrorBoundary + defensive totals — route: delegated (T1.1 commit: 78e85d3)
  - `sanitizeBackup(data)` in `src/lib/backup.js` rebuilds records from known fields only. Ingredients need a non-empty name, packSize > 0 and packCost >= 0 (numbers or numeric strings); unit defaults to "g", category to "". Recipes need a non-empty name and an `items` array; a recipe with any invalid line is skipped whole (a partial import would silently change its cost); yield/margin/extras fall back to 1/0/0. Non-object input or no collections throws → "no es un backup válido" toast. SettingsView toasts imported vs skipped counts and does not call the store when nothing is valid.
  - `recipeTotals` treats missing/non-array `items` as empty.
  - Root `ErrorBoundary` (`src/shared/ErrorBoundary.jsx`) wraps App: "Reintentar" reloads, "Descargar datos guardados" downloads the raw `miga-recipe-storage` value, "Restablecer datos" removes it only after an explicit click plus `window.confirm`.
  - RED: `backup.test.js` failed to load (`Failed to load url ./backup`); the 2 new recipeTotals cases failed with `TypeError: Cannot read properties of undefined (reading 'reduce')` / `recipe.items.reduce is not a function`. GREEN: 49/49.
  - Verification: `corepack pnpm test`: 49 passed; `corepack pnpm build`: built OK.
- [x] T1.3 Overview spotlight consistency — route: delegated (T1.2 commit: eaa19dc)
  - Overview receives the effective `selectedRecipe`; name, yield, extras, margin and totals all come from it. Eyebrow changed from "Última receta editada" (it was never the last edited) to "Receta seleccionada". "Ver detalle" only renders with a recipe; with none, the spotlight shows the empty state with "Crear receta". Removed the unused `totalValue` prop and its computation in App.
  - RED/GREEN exception: UI wiring only, no pure logic and no jsdom in scope; verified by build and reading.
  - Verification: `corepack pnpm test`: 49 passed; `corepack pnpm build`: built OK.
- [x] T1.4 Clearable numeric inputs — route: delegated (T1.3 commit: 3545835)
  - `src/lib/numericDraft.js` (`parseDraft`, `formatNumber`, `draftAfterValueChange`, `draftOnBlur`) + `src/shared/NumericInput.jsx` holding a local string draft. Used for editor yield (min 1), margin (min 0), extras (min 0) and line quantity in RecipesView and RecipeModal. `step="any"` kept.
  - Empty-draft decision: an empty, non-numeric or below-min draft commits nothing; on blur it is restored to the last committed value (no fallback value is invented). A valid draft is normalized on blur ("007" → "7"). The draft resyncs only when the committed value changes to something the draft does not already represent. The recipe editor is keyed by recipe id so switching recipes always remounts the inputs.
  - IngredientModal unchanged (stores strings, coerces on save; already clearable).
  - RED: `numericDraft.test.js` failed to load (`Failed to load url ./numericDraft`). GREEN: 67/67. Component wiring has no runnable test (no jsdom); verified by build and reading.
  - Verification: `corepack pnpm test`: 67 passed; `corepack pnpm build`: built OK.
- [x] T1.5 Pack-size handling — route: delegated (T1.4 commit: 7da715c)
  - `unitPrice(ingredient)` in `recipeMath.js` returns null when packSize is not a positive finite number. `ingredientCost` uses it (null → 0). IngredientsView shows "—" instead of Infinity/NaN. IngredientModal uses `??` so a stored 0 cost (or pack size) stays visible; packSize keeps `min="0.01"` + `step="any"`, which already rejects 0 in HTML5 validation.
  - Intentional behavior change: the characterization tests that pinned "packSize 0/missing falls back to 1" were replaced by "costs 0 when packSize is 0/missing/negative" (header comment in `recipeMath.test.js` records it).
  - RED: 10 failures — `costs 0 when packSize is 0/missing/negative` (`expected 300 to be +0`, `expected -30 to be +0`) and `unitPrice is not a function` for the new unitPrice cases. GREEN: 75/75.
  - Verification: `corepack pnpm test`: 75 passed; `corepack pnpm build`: built OK.
- [ ] T1.6 Orphaned ingredient lines — route: delegated

Route evidence: 6 tasks across ~8 non-trivial files (App, store, recipeMath, views, modals) → writer trigger; one bounded writer, sequential.

## Acceptance criteria
- Editing always targets the recipe shown; with no recipes, the editor shows an empty state instead of crashing.
- Importing malformed JSON or malformed records never persists invalid data; the user sees how many records were imported and skipped.
- A render error shows a recovery screen instead of a white page.
- The spotlight's name, inputs and totals all belong to the same recipe.
- Every numeric input can be cleared and retyped; negative margin/extras and yield < 1 are not committed.
- Pack size 0 never shows Infinity/NaN; an ingredient with cost 0 can be edited.
- A recipe with lines pointing to deleted ingredients shows a visible warning; deleting an ingredient in use warns how many recipes use it.

## Checks
- `corepack pnpm test` (existing 16 + new tests)
- `corepack pnpm build`

## Delivery
- Branch: `fix/phase-1-critical-bugs` (from `chore/phase-0-foundation` @ 5e13275).
- Strategy: `single-pr` — user explicitly accepted the risk of exceeding ~400 lines (forecast 450–600).
- RDD: off (global) — ordinary checks only.

## Progress
- Branch created. Writer pending.

## Next step
Delegate T1.1–T1.6 to one writer.
