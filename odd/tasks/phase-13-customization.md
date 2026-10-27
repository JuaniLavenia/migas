# Phase 13 — Order customization

Objective: an order can carry a themed customization (Halloween, Día de la madre…): decoration supplies that add their cost and take stock, plus a design fee, so the proposed price includes them without manual math.
Branch: `feat/phase-13-customization` from main@eb7dc19. Delivery: single-pr (the user's choice for every phase). Runner: `pnpm test` (Vitest). Forecast: ~450 authored lines.

## Specs

- S1 Section in the order (L1, L2): "Una sección **"Personalización"** dentro del pedido que tenga:" Optional; an order without it behaves exactly as before.
- S2 Decoration supplies (L1): "**Insumos de decoración** con su cantidad. Suman al costo y descuentan stock, igual que el packaging." They are ingredients (colorantes, fondant, toppers) in the ingredient's unit; cost = quantity × unit price, added at cost to the proposed price, the suggested price and the cost. Stock: deducted when the order is prepared, returned when it goes back, not returned when cancelled (it was used), and counted in the shopping list of pending/confirmed orders. A deleted ingredient or one without unit price counts as missing.
- S3 Design fee (L1): "**Un recargo por diseño**, en % o como monto fijo, para cobrar el trabajo de la temática y no solo el material." Assumption: the % applies to the products' price (proposed for the proposed price, suggested for the suggested one), not to packaging or decoration; the fee adds to price, not to cost, so it is profit.
- S4 Outcome (L1): "Así el precio propuesto ya viene con todo incluido." The order summary shows the customization amount.
- S5 Persistence: stored in Supabase (additive migration, one nullable column), in local data and in backups; old orders load without customization.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T13.1 | S2–S4 (pricing and stock math, pure) | inline | done (8 RED→GREEN) | b9d8222 |
| T13.2 | S5 (migration, row mapping, backup) | inline | done (3 RED→GREEN) | ef48c28 |
| T13.3 | S1–S4 (order modal section, card label) | inline | done (2 RED→GREEN; shortage text test updated) | 5736b85 |
| T13.4 | docs | inline | done | a4acdfe |
| T13.5 | verifier advisory: drop an empty customization from backups | inline | done | (this commit) |

Route evidence: one sequential feature (T13.3 depends on T13.1/T13.2): no writer trigger. Risk: item 1 (migration adding a column to `orders`, persisted format change): one independent verifier at the feature's end.

## Log

- L1 (2026-10-26, assistant proposal the user accepted): "Una sección **"Personalización"** dentro del pedido que tenga: - **Insumos de decoración** con su cantidad. Suman al costo y descuentan stock, igual que el packaging. - **Un recargo por diseño**, en % o como monto fijo, para cobrar el trabajo de la temática y no solo el material. Así el precio propuesto ya viene con todo incluido."
- L2 (2026-10-26, user): "mm ok, si cambia según cada pedido, ahora hizo este para halloween, hace poco hizo para el dia de la madre, y asi.. hacé lo de personalización."
- L3 Progress: T13.1–T13.4 done. `pnpm vitest run --maxWorkers=2`: 471 tests / 45 files green; build OK. The default full parallel run times out random unrelated UI tests at 5 s on this machine (different ones each run); not compared against main. No `lint` script exists.
- L4 Independent verifier (item 1): S1–S5 PASS, no blockers. Advisories: an empty customization from a hand-edited backup showed "Personalizado" (fixed in T13.5); editing decoration of an already prepared order does not re-deduct stock, and an undo after its batches were used ends like a cancel (both existing rules for products/ingredients). RDD off (global): no native review.
- L5 Deploy order: run `20261027000000_order_customization.sql` in Supabase before publishing; `toRow` always sends `customization`, so saves fail without the column.
