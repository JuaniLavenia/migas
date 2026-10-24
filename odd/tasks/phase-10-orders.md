# Phase 10 — Orders

Objective: she creates the orders she receives and manages them (status, payment, price and real profit) in a list grouped by delivery date, saved in Supabase like the rest. Stock is not touched yet (phase 11).
Branch: `feat/phase-10-orders` from main@b9fa9fa. Delivery: single-pr (the user's choice for every phase). Runner: `pnpm test` (Vitest). Forecast: ~1400 authored lines.

## Specs

- S1 Order data: "agregarle un sistema de pedidos, donde ella pueda crear los pedidos que le van llegando y manejarlos, es mas que nada un manejo interno, para que no se pierda." Approved base: "Cliente: nombre y contacto (WhatsApp o Instagram). Fecha y hora de entrega. Qué pidió: receta × cantidad, por ejemplo 2 tortas de chocolate y 24 alfajores. Notas: "que diga Feliz cumple Sofi", "sin TACC". Precio acordado y seña cobrada. Si lo retiran o hay que llevarlo." Plus packaging lines: "Packaging: ítem × cantidad, por ejemplo *2 box x8*." Create, edit and delete (with confirmation). Client name and delivery date are required; time is optional.
- S2 Status and payment: "agregale el estado del pedido". "`Pendiente` → `Confirmado` → `En preparación` → `Listo` → `Entregado`, más `Cancelado`, al que se puede pasar desde cualquier estado." Payment is separate and derived: "tres valores, que se calculan solos a partir de la seña y el precio: `Sin pagar`, `Señado` y `Pagado`." A new order starts as Pendiente.
- S3 Price: "Precio propuesto desde el precio de venta, editable, con el sugerido como referencia y la **ganancia real**." Proposed = units × the recipe's sale price (the suggested price when it has none). The order stores the agreed price, so later price changes do not change it. Real profit = agreed price − cost (units × unit cost + packaging units × packaging unit cost). Assumption: packaging is charged at cost inside the proposed and suggested prices.
- S4 List: "Te propongo una lista agrupada por fecha de entrega: **Atrasados** (en rojo): la fecha ya pasó y no están entregados. **Hoy**, **Mañana**, **Esta semana** y **Más adelante**. Filtros por estado y una búsqueda por cliente. Los entregados y cancelados se ocultan por defecto, pero se pueden ver. En cada tarjeta: cliente, hora, qué lleva, estado y pago. El estado se cambia con un toque, sin entrar al pedido." No calendar. Assumption: the week ends on Sunday; delivered or cancelled orders with a past date go in "Anteriores".
- S5 Saved in the cloud and in backups: an `orders` table per business with the same row level security (additive migration `supabase/migrations/20261025000000_orders.sql`, run before deploying). Backups export and import orders; older backups still import. The first manual upload only runs into a business without any data, orders included.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T10.1 | S5 (SQL, rows) | inline | done (schema +4, rows +2 RED→GREEN) | 0dbeb45 |
| T10.2 | S2, S3, S4 (order math, grouping) | inline | done (9 RED→GREEN) | b80ef32 |
| T10.3 | S1, S5 (store, backups, settings) | inline | done (8 RED→GREEN; existing summary strings pinned) | ceb88eb |
| T10.4 | S1–S4 (orders view and form) | inline | done (10 tests; RED confirmed without the route, 10/10 failed) | 67faaa6 |
| T10.5 | docs | inline | done | (this commit) |

Route evidence: one sequential feature in one repo; T10.3/T10.4 depend on T10.1/T10.2, so there are no parallel independent units and no writer trigger. T10.1 touches a migration (high-risk item 1): own commit, independent verifier at the feature's end.

## Log

- L1 (2026-10-23, user): "listo, ya mergeé y deploye, sigamos" (start of phase 10 per the approved roadmap: "## Fase 10: Pedidos").
- L2 Requests quoted in S1–S4 come from the planning conversation (2026-10-23).
- L3 Progress: T10.1–T10.5 done. Suite 391 tests / 39 files green; build OK.
- L4 Decisions within the specs: the agreed price is stored on save (a new order follows the proposed price until she types one; blank uses the proposed one); "Cobrado" holds the deposit or the full payment, so the payment status is derived; lines of deleted recipes or packaging keep their quantity and show as deleted; cost uses the per-unit cost (full batches are phase 11).
- L5 Visual check pending on the Vercel preview (local needs a Google sign-in).
- L6 Deploy order: run 20261025000000_orders.sql in the SQL Editor before merging (the new code fails to load without the table; the old code ignores it).
- L7 Advisory: cloudSync renumbers every record of a collection when one is inserted, so each new order re-saves all orders (shared behavior, unchanged).
- L8 Independent verifier: no blockers; S1–S5 PASS (data hash unchanged across the migration, RLS/upsert/anon probes on orders, rejected uploads leave data unchanged, upload_local_data body differs only by the orders check, sanitizeBackup/importSummary identical to baseline for backups without orders, baseline code works on the migrated DB). Advisories 1 and 2 applied with tests: impossible calendar dates in a backup are skipped; a client of only spaces is not saved. Kept: Anteriores reverses within a day; price 0 with paid > 0 reads Pagado.
