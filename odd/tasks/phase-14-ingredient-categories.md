# Phase 14 — Editable ingredient categories

Objective: ingredient categories become editable like the recipe ones (create, rename, delete), stored per business in Supabase; ingredients point to them by id.
Branch: `feat/phase-14-ingredient-categories` from main@2506be1. Delivery: single-pr (the user's choice for every phase). Runner: `pnpm test` (Vitest; on this machine `npx -y pnpm@12.9.1 test`). Forecast: ~900 authored lines.

## Specs

- S1 Editable like recipes (L1): "quiere que las categorias de los ingredientes sea editable como la de las recetas, asi ella pueda agregar, quitar y modificarlas a su antojo." Create inline from the ingredient form ("+ Nueva categoría", same as a recipe; a repeated name, ignoring case and accents, reuses the existing one); rename and delete in Configuración, in a panel like "Categorías de recetas", with the count of ingredients that lose it.
- S2 Delete (L2): "si que queden sin categoria al borrar y que en compras se agrupen en otros". The ingredients of a deleted category stay "Sin categoría"; the shopping list groups them (and ingredients whose category id is unknown) under "Otros", together with a category named "Otros" when there is one.
- S3 No automatic re-assignment (L3, L4): creating a category again does not bring its old ingredients back; she picks it again in each ingredient. The ingredient list sorts by category name, so the uncategorized ones are easy to find.
- S4 Shopping order: the shopping list groups follow the order of her ingredient categories ("Otros" last unless a category named "Otros" sits elsewhere), then packaging.
- S5 Persistence and existing data: new table `ingredient_categories` and column `ingredients.category_id` (additive migration). For every business that already has ingredients, the migration creates the six current categories (Secos, Lácteos, Frescos, Chocolates, Decoración, Otros, in that order) plus any other name its ingredients use, and points each ingredient to its category; an empty business starts without categories (as recipes do). The legacy `ingredients.category` text column stays untouched (the previous version keeps working). Backups export `ingredientCategories` and `categoryId`; old backups and the first upload of pre-cloud browser data (category as text) resolve names to categories (existing by name, or new). Assumption: new businesses start with no ingredient categories, like recipe categories.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T14.1 | S5 (migration, RPC, row mapping) | inline | done (schema 6 RED→GREEN against an empty migration, rows 3 RED→GREEN) | 100c520 |
| T14.2 | S1–S3, S5 (store actions, import, backup, local data) | inline | done (12 RED→GREEN; 1 store fixture moved to categoryId) | a13fa56 |
| T14.3 | S1–S4 (ingredient form, list, settings panel, shopping) | inline | done (15 RED→GREEN; backup round-trip and summary tests written after the code) | 8f6af4d |
| T14.4 | docs | inline | done | (this commit) |

Route evidence: one sequential feature (T14.3 depends on T14.1/T14.2): no writer trigger. Risk: item 1 (migration backfills `category_id` of existing ingredients) and item 3 (backup format and `upload_local_data` RPC): one independent verifier at the feature's end. RDD off (global): no native review.

## Log

- L1 (2026-10-27, user): "Mi novia me pidio otro cambio, quiere que las categorias de los ingredientes sea editable como la de las recetas, asi ella pueda agregar, quitar y modificarlas a su antojo. Podes analizar ese cambio?"
- L2 (2026-10-27, user): "genial, si que queden sin categoria al borrar y que en compras se agrupen en otros, total ella despues cuando le agregue otra categoria se volvera a poner todo verdad?"
- L3 (2026-10-27, assistant, verified in useRecipeStore.js): no — delete strips the id, create makes a new uuid; she re-picks the category per ingredient. Recommended against an automatic "remember" (surprising moves).
- L4 (2026-10-27, user): "claro a eso me referia, que ella tiene que entrar a cada insumo y elegirla de nuevo jaja. Si dale, arranca nomas"
- L5 Baseline: `npx -y pnpm@12.9.1 test` on main@2506be1: 45 files / 477 tests green.
- L6 Progress: T14.1–T14.4 done. Full suite 45 files / 506 tests green; `pnpm build` OK. Changed expectations on purpose: a new ingredient starts "Sin categoría" (was "Otros"; FormAccessibility), fixtures moved from `category` text to `categoryId` (demoData, Shopping, stockMoves, store). Moved `CategorySelect` to src/shared and generalized `RecipeCategoriesPanel` into `CategoriesPanel`; `shoppingList(data)` now reads `data.ingredientCategories` (the `categoryOrder` argument is gone). Known difference: the migration matches names ignoring case and spaces, the app also ignores accents ("Lacteos" stays apart in the migration).
- L8 Independent verifier (items 1, 3): S1–S5 PASS, no blockers; suite 506/506; PGlite probe confirmed backfill, untouched columns, RLS and every `business_not_empty` case. Advisories: accents not folded by the migration (and `lower()` may not fold `Á` under a C collation); an old client writing during the deploy window leaves new ingredients "Sin categoría"; a category named "otros" in lowercase gets its own group beside the fallback "Otros"; a new backup loaded into the old version loses the categories; the local-upload summary still counts only recipe categories. RDD off (global): no native review.
- L7 Deploy order: run `20261028000000_ingredient_categories.sql` in Supabase before publishing; `toRow` sends `category_id`, so saves fail without the column.
