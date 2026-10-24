# Phase 12 — Dashboard

Objective: the home view becomes a business dashboard for the chosen month (current by default), compared with the month before, plus what needs attention day to day.
Branch: `feat/phase-12-dashboard` from main@56f767c. Delivery: single-pr (the user's choice for every phase). Runner: `pnpm test` (Vitest). Forecast: ~900 authored lines.

## Specs

- S1 Placement (2026-10-24, L2): "si dale, reemplacemos el resumen actual". The dashboard replaces the current Resumen at `/` (sidebar "Resumen"); the recipe spotlight, quick actions and recipe library of the old overview go away (recipes stay in Recetas). The upload hint for the first sign-in stays.
- S2 Business numbers: "Te propongo esto para el período elegido (por defecto, el mes actual): **Números del negocio** - Ventas: lo cobrado de los pedidos entregados. - Costo y **ganancia real**, con su margen en %. - Cantidad de pedidos. - **Saldo por cobrar:** lo que falta cobrar de pedidos ya señados." Assumptions: an order belongs to the month of its delivery date; cost and profit are those of the delivered orders (profit = what was collected − cost); the order count excludes cancelled orders; "Saldo por cobrar" is everything still owed today by non-cancelled orders that are señados or already delivered, not only that month.
- S3 Monthly comparison: "Sumado: el **resumen del mes comparado con el anterior**, con la variación de cada número. Por ejemplo, *"Ganancia $85.000 ▲ 12% vs septiembre"*." She can move to earlier and later months.
- S4 Day to day: "**Para el día a día** - Próximas entregas de los próximos 7 días. - Faltantes para los pedidos activos, con un acceso directo a la lista de compras. - Elaborados con más de X días, para que no se le pongan viejos." Assumptions: next 7 days include today and late orders show first, marked; X = 3 days.
- S5 Recipes: "**Para decidir** - Recetas más vendidas y las que más ganancia dejan, que no siempre son las mismas." Units of the month's delivered orders; profit per recipe estimated with its sale price (the suggested one when it has none) minus its unit cost. Top 5 each.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T12.1 | S2–S5 (dashboard math, pure) | inline | pending | |
| T12.2 | S1–S5 (dashboard view replacing the overview) | inline | pending | |
| T12.3 | docs | inline | pending | |

Route evidence: one sequential feature, T12.2 depends on T12.1: no writer trigger. No migration, no stored data change: no high-risk item, so no independent verifier. Replacing the old overview is requested (S1); its tests are rewritten for the dashboard.

## Log

- L1 (2026-10-24, user): "listo, ya mergee y deploye!" (start of phase 12 per the approved roadmap: "## Fase 12: Tablero").
- L2 (2026-10-24, user, on replacing the current Resumen or adding a separate Tablero view): "si dale, reemplacemos el resumen actual".
