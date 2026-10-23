# Phase 7 — Clearer recipes, ingredients and prices

Objective: recipe categories with a grouped library, ingredient category as a fixed select, "Presentación de compra" wording, and a pricing card she can read without confusing cost and price, plus a manual "Precio de venta".
Branch: `feat/phase-7-recipes-pricing` from main@7daf30c. Delivery: single-pr (user preference). Runner: `pnpm test` (Vitest, node + jsdom projects).

## Specs

- S1 Recipe categories: "organizar recetas por categoria, por ejemplo, budines, cookies, trufas, etc. porque tiene varias recetas de lo mismo, y varian en los ingredientes. Actualmente se le hizo una lista muy larga de recetas, entonces se le haria mas comodo separarlo por categoria." Agreed design: she creates her own categories, each recipe has one (or none: "Sin categoría"), the library is grouped by category in collapsible sections with a category filter on top. Categories can be created from the recipe editor and the new-recipe modal, and renamed/deleted in Configuración (deleting moves its recipes to "Sin categoría" after confirming).
  - Decided (L3): collapsible sections replace the library pagination; Insumos keeps its pagination. Sorting and the custom order apply inside each category; custom order moves never cross categories. On mobile the horizontal scroller keeps working in group order and the filter narrows it. Collapsed groups are remembered per browser.
- S2 Ingredient category: "le resulta confuso la categoria en el ingrediente, a veces no sabe que poner. Se podria hacer un selector o sino sacarlo." Agreed: keep it (it will group the shopping list) as a select with "Secos, Lácteos, Frescos, Chocolates, Decoración, Otros" and "Otros" by default.
  - Assumption (non-destructive): an existing ingredient whose category is not in the list keeps it; the select shows that value as an extra option until she changes it. No stored data is rewritten.
- S3 Wording: "si habria que cambiar el actual asi no se confunda" — the ingredient purchase pack is called "Presentación de compra" in the UI (form, table, sort option, warnings).
- S4 Pricing: "le resulta confuso el tema de los precios, a veces no sabe a que precio vender los productos individuales, me dice que le confunde el precio sugerido con el costo unitario." Agreed layout:
  ```
  LO QUE TE CUESTA              A CUÁNTO VENDERLO (por unidad)
  Toda la tanda (21 u.) $8.400   Sugerido          $800
  Cada unidad           $400     Tu precio         $750  ⚠ 6% debajo
                                 Ganás por unidad  $350
  ```
  "Margen" becomes "Ganancia sobre el costo (%)" with the hint "100% = vendés al doble de lo que te cuesta" (editor and new-recipe modal).
- S5 Precio de venta: "bueno dale, sumale el precio de venta para que ella lo cargue manualmente". Optional per-recipe field "Precio de venta" (empty = not set). When set and below the suggested price, the card warns how many % below. "Ganás por unidad" uses her price when set, the suggested one otherwise.
- S6 Data: stored data moves to version 2 (new `recipeCategories`, optional `categoryId` and `salePrice` on recipes); v1 data migrates without loss; backup export/import carries categories and the new fields; old backups still import.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T7.1 | S6 (+S1 model, S5 field) | inline | done (RED 15 → GREEN) | 15b6236 |
| T7.2 | S1 | inline | done (RED 11 → GREEN; 1 pin) | 6f81fef |
| T7.3 | S2, S3 | inline | done (RED 4 → GREEN) | bf62e6d |
| T7.4 | S4, S5 | inline | done (RED 10 → GREEN) | 8d187dc |

Route evidence: tasks share `RecipesView.jsx`, `App.css` and the store, so they are not disjoint units; parent writes inline in order. Risk: T7.1 is a persisted format change (high-risk item 1) → own commit + independent verifier at the end.

## Log

- L1 (2026-10-23, user): "dale, ahi te paso lo que me dijo con algunos comentarios mios: - organizar recetas por categoria, [...] - le resulta confuso la categoria en el ingrediente, a veces no sabe que poner. Se podria hacer un selector o sino sacarlo. - le resulta confuso el tema de los precios, a veces no sabe a que precio vender los productos individuales, me dice que le confunde el precio sugerido con el costo unitario. Aqui habria que ver de organizarlo de mejor forma para que ella no se confunda." / "si, me cierran las tres, arma la propuesta" / "listo, mergeado y deployado, sigamos".
- L2 Map (explorer): persist `partialize` keeps only `ingredients`/`recipes`, `RECIPE_STORAGE_VERSION = 1` (`src/lib/recipeStorage.js:7`); `sanitizeRecipe` whitelists fields (`src/lib/backup.js:61-90`); export/import in `SettingsPage.jsx:40,77`; library is one flat dnd-kit `SortableContext` + pagination of 8 with `pageOfIndex` over the full array; ingredient category is a free-text input (`IngredientModal.jsx:39-45`), demo data uses "Repostería".
- L3 (2026-10-23, user, via question "En la fase 3 pediste paginar la biblioteca de recetas (8 por página). Con categorías, ¿cómo preferís la lista de recetas?"): "Plegables, sin páginas (Recommended)".
- L4 T7.1: storage v2 (`recipeCategories` persisted; v1 migrates unchanged). Store: `addRecipeCategory(name) → id` (trim, reuses an existing name ignoring case/accents, null for blank), `renameRecipeCategory`, `deleteRecipeCategory` (recipes lose `categoryId`, keep `updatedAt`), `importData` merges categories; `moveRecipe`/`reorderRecipes` stay inside the recipe's group (unknown category = "Sin categoría"). Backup: `recipeCategories`, `categoryId`, `salePrice` (≥ 0, optional) kept; old backups import with `recipeCategories: []`. Export includes categories.
- L5 T7.2: `lib/recipeGroups.js` groups the sorted list; RecipesView renders one SortableList per group, `LibraryGroup` toggle with `aria-expanded`/`aria-controls`, filter "Categoría" (Todas / each / Sin categoría). Without categories the list stays flat (no headers, no filter). `CategorySelect` (editor + new-recipe modal) creates a category in place ("+ Nueva categoría"). Configuración: "Categorías de recetas" panel (rename on Enter/blur, delete with confirm "N recetas quedan sin categoría."). Pagination tests for the library removed/adapted (behavior intentionally replaced).
- L6 T7.3: ingredient category select with the fixed list, "Otros" default; a legacy value (e.g. "Repostería") is shown as an extra option and kept on save. Demo chocolate → "Chocolates". Labels: "Presentación de compra", "Costo de la presentación", table header "Presentación de compra", sort "Costo de compra", warning "una presentación de compra inválida".
- L7 T7.4: `recipePricing(totals, salePrice)` (suggested, salePrice|null, unitProfit, belowSuggestedPercent rounded). PricingCard: groups "Lo que te cuesta" (Toda la tanda (N u.), Cada unidad) and "A cuánto venderlo (por unidad)" (Sugerido, Tu precio / "Sin cargar", "N% debajo del sugerido", Ganás por unidad). "Ganancia sobre el costo (%)" + hint "100% = vendés al doble de lo que te cuesta" (editor and modal). "Precio de venta" uses `NumericInput allowEmpty` (clearing commits null → field removed via `updateRecipe` undefined-removal). Overview: "Ganancia s/ costo", note "por unidad, con tu ganancia".
- L8 Checks: `pnpm test` 33 files / 347 tests; `pnpm build` ok. Visual check on a temporary `vite preview` at :4180 (separate origin, user's localhost data untouched; process killed): category creation from the editor, grouped library, pricing card; 390 px iframe: no page overflow on /recetas/cookies, /configuracion, /insumos, group toggles hidden on mobile, pricing card one column.
