# Phase 11 — Automatic stock and shopping list

Objective: preparing an order deducts the stock by full batches (using finished goods first), never below zero; going back or cancelling returns it; she sees her finished goods and a shopping list grouped by aisle.
Branch: `feat/phase-11-auto-stock` from main@74d16d0. Delivery: single-pr (the user's choice for every phase). Runner: `pnpm test` (Vitest). Forecast: ~2000 authored lines.

## Specs

- S1 Deduct on preparation: "me dijo que prefiere stock, ella se encargara de poner cuanto tiene de cada cosa, y que se descuente al pasar a en preparación". Approved plan: "Al pasar a "En preparación": 1. Usa primero los **elaborados** que ya hay, empezando por los más viejos. 2. Para lo que falta, calcula **tandas completas** y descuenta insumos y packaging. 3. Lo que sobra queda como elaborado, con su fecha." Example: "Si quedan 5 cookies y el pedido es de 16, faltan 11. [...] 11 cookies son 1 tanda de 21, y se descuentan los insumos de esa tanda. [...] Lo que sobra entra al stock de elaborados: 21 − 11 = 10 cookies para el próximo pedido." The order keeps what it deducted ("Cada pedido guarda cuánto descontó, así la devolución es exacta aunque después se edite la receta"). Assumption: the deduction runs when an order moves from Pendiente, Confirmado or Cancelado to En preparación, Listo or Entregado (skipping a step still deducts); orders already in those states before this phase deduct nothing.
- S2 Never negative: "no me gustaria que quede negativo, sino que le avise que no tiene suficiente para preparar el pedido, o bien si se olvido de actualizar el stock que le diga que lo actualice." Approved: "Si no alcanza, **no cambia el estado** y muestra qué falta, por ejemplo: *"Faltan 300 g de manteca y 1 caja box x8"*. Desde ese aviso puede **actualizar el stock ahí mismo**, por si se olvidó de cargar una compra, y reintentar sin salir del pedido." Applies to the quick status change and to the order form.
- S3 Going back and cancelling: "Si el pedido se cancela o vuelve atrás, se devuelve exactamente lo que se había descontado." Refined 2026-10-23 (L2): going back (to Pendiente or Confirmado) undoes everything: ingredients, packaging and the finished goods it used come back, and the leftovers it created are removed. Cancelling after the deduction: "lo cocinado queda como elaborado": the order's units go back to finished goods (the ones it took keep their date, the cooked ones are dated today), its packaging comes back and the ingredients do not. Assumption: if part of the leftovers it created was already used by another order, going back keeps what was cooked as finished goods, like cancelling.
- S4 Finished goods: "me cierra llevar stock de elaborados con la fecha"; "se usan **primero los más viejos**, así lo que queda siempre es lo más fresco"; "ella puede ajustarlo o descartarlo a mano, y yo guardo la fecha en que se hizo cada tanda para mostrarle la antigüedad." An "Elaborados" view lists each batch with its recipe, units and age; she can change the units, discard a batch (with confirmation) and add one by hand (recipe, units, date).
- S5 Shopping list: "estaria bueno que le haga como un listado de los materiales que necesita, asi ella pueda ver que necesita comprar y que tiene." Approved: "**Lista de compras** con lo que necesita, lo que tiene y lo que le falta, agrupada por góndola." "La lista de compras hace la misma cuenta con todos los pedidos activos juntos. Si esta semana hay 30 cookies pedidas y 5 ya hechas, son 2 tandas." "Necesita" cuenta solo los pedidos activos que todavía no descontaron. Grouped by ingredient category (Secos, Lácteos, Frescos, Chocolates, Decoración, Otros), plus packaging.
- S6 Saved in the cloud and in backups: a `finished_goods` table per business with the same row level security and a `stock_move` column on `orders` (additive migration `supabase/migrations/20261026000000_auto_stock.sql`, run before deploying). Backups export and import finished goods and what each order deducted; older backups still import.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T11.1 | S6 (SQL, rows) | inline | pending | |
| T11.2 | S1, S3, S5 (stock planning, pure) | inline | pending | |
| T11.3 | S1–S3, S6 (store status change, backups) | inline | pending | |
| T11.4 | S2 (shortage dialog in list and form) | inline | pending | |
| T11.5 | S4 (Elaborados view) | inline | pending | |
| T11.6 | S5 (Compras view) | inline | pending | |
| T11.7 | docs | inline | pending | |

Route evidence: one sequential feature; T11.3–T11.6 depend on T11.1–T11.2 and share the store, so no parallel independent units and no writer trigger. T11.1 touches a migration (high-risk item 1) and T11.3 changes stored stock (item 1): own commits, independent verifier at the feature's end.

## Log

- L1 (2026-10-23, user): "listo! ya mergee y deploye, sigamos" (start of phase 11 per the approved roadmap: "## Fase 11: Stock automático y compras").
- L2 (2026-10-23, user, on a cancelled order that was already being prepared): "genial, si me gusta que lo cocinado queda como elaborado."
- L3 Design: the deduction is one store update (orders, ingredients, packaging and finished goods together) saved by cloudSync like every other change, not a Postgres function: the app has one user and every write already goes through cloudSync. Advisory: two devices preparing at the same moment could each deduct from the same stale stock; the database check (stock >= 0) then rejects the second save.
