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
| T14.1 | S5 (migration, RPC, row mapping) | inline | pending | |
| T14.2 | S1–S3, S5 (store actions, import, backup, local data) | inline | pending | |
| T14.3 | S1–S4 (ingredient form, list, settings panel, shopping) | inline | pending | |
| T14.4 | docs | inline | pending | |

Route evidence: one sequential feature (T14.3 depends on T14.1/T14.2): no writer trigger. Risk: item 1 (migration backfills `category_id` of existing ingredients) and item 3 (backup format and `upload_local_data` RPC): one independent verifier at the feature's end. RDD off (global): no native review.

## Log

- L1 (2026-10-27, user): "Mi novia me pidio otro cambio, quiere que las categorias de los ingredientes sea editable como la de las recetas, asi ella pueda agregar, quitar y modificarlas a su antojo. Podes analizar ese cambio?"
- L2 (2026-10-27, user): "genial, si que queden sin categoria al borrar y que en compras se agrupen en otros, total ella despues cuando le agregue otra categoria se volvera a poner todo verdad?"
- L3 (2026-10-27, assistant, verified in useRecipeStore.js): no — delete strips the id, create makes a new uuid; she re-picks the category per ingredient. Recommended against an automatic "remember" (surprising moves).
- L4 (2026-10-27, user): "claro a eso me referia, que ella tiene que entrar a cada insumo y elegirla de nuevo jaja. Si dale, arranca nomas"
- L5 Baseline: `npx -y pnpm@12.9.1 test` on main@2506be1: 45 files / 477 tests green.
