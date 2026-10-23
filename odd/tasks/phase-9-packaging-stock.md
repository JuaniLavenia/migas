# Phase 9 — Packaging list and stock

Objective: a packaging list (cost and how many she has) and a "Tengo" stock field on every ingredient, saved in Supabase like the rest, ready for orders (phase 10) and automatic stock (phase 11).
Branch: `feat/phase-9-packaging-stock` from main@2d3b0a8. Delivery: single-pr (the user's choice for every phase). Runner: `pnpm test` (Vitest). Forecast: ~900 authored lines.

## Specs

- S1 Packaging list: "agregarle un listado para el packaging, y que lo pueda agregar a las recetas." Refined later: "El packaging no va fijo por receta, sino por pedido, porque de una receta pueden salir por ejemplo 21 cookies, de las cuales ella puede embolsar individualmente o bien armar un box de 8 cookies, se entiende?" A "Packaging" view (sidebar, `/packaging`) lists packaging items with: name, "Presentación de compra" (units per purchase), "Costo de la presentación", "Tengo" (units on hand) and the derived cost per unit. Create, edit and delete (with confirmation), search, sort, pagination and custom order like Insumos. Packaging is NOT added to recipes (it goes per order, phase 10).
- S2 Ingredient stock: "me dijo que prefiere stock, ella se encargara de poner cuanto tiene de cada cosa". Each ingredient has "Tengo", in its base unit (g, ml, un), editable in the ingredient form and shown in the list. Never negative ("no me gustaria que quede negativo"); blank means 0. Assumption: no low-stock warnings in this phase (phase 11 handles shortages).
- S3 Saved in the cloud: packaging rows belong to the business with the same row level security as the other tables; the ingredient stock is a column of `ingredients`. Assumption: an additive migration (`supabase/migrations/20261024000000_packaging_stock.sql`) run in the SQL Editor before deploying; existing rows get stock 0 and keep everything else.
- S4 Backups: export includes packaging and stock; importing adds them. Backups without them (older ones) still import, and an import without stock does not reset the stock already loaded. The first manual upload only runs into a business without any data, packaging included.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T9.1 | S3, S4 (SQL) | inline | done (schema +3, rows +1; RLS mutation caught) | d8740a4 |
| T9.2 | S2, S4 | inline | done (stock UI 4 RED→GREEN, backup 1 RED→GREEN, store 2 pins) | 50ad575 |
| T9.3 | S1, S4 | inline | done (packaging 8, backup/settings/summary 5 RED→GREEN, sign-out clear 1 RED→GREEN, upload 1 mutation) | 6442df2 |
| T9.4 | docs | inline | done | (this commit) |

Route evidence: one sequential feature in one repo; no parallel independent units of several minutes each, so no writer trigger. T9.1 touches a migration (high-risk item 1): own commit, independent verifier at the feature's end.

## Log

- L1 (2026-10-23, user): "ahh bien, si ahi ya lo vi, aparece "Subir los datos de este dispositivo". No hace falta agregar el boton. Sigamos!" (start of phase 9 per the approved roadmap: "F9 Packaging + stock de insumos ("tengo")").
- L2 Original requests quoted in S1 and S2 come from the planning conversation (2026-10-23).
- L3 Progress: T9.1–T9.4 done. Suite 358 tests / 37 files green; build OK. The full suite hit 5 s timeouts on cold first renders under load (7, then 1, then 0 failures across reruns, no code change): environmental, recorded as advisory.
- L4 Found while wiring packaging: AuthGate cleared only ingredients/recipes/categories on sign-out, so packaging would have stayed in memory; emptyData now derives from COLLECTIONS (test RED→GREEN).
- L5 Packaging view tests were written before the code but first run after it; RED was then confirmed by removing the route (8/8 failed).
- L6 Visual check pending: the local preview needs a Google sign-in, so the layout (new Tengo column, 760/840 px table min-width on mobile) is to be checked on the Vercel preview.
- L7 Deploy order: run 20261024000000_packaging_stock.sql in the SQL Editor before merging (the new code fails to load without the table/column; the old code ignores them).
