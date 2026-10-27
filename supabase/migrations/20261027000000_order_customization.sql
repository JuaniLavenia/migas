-- Miga: order customization. Run once in the Supabase SQL Editor, after
-- 20261026000000_auto_stock.sql and before deploying the version that uses it.
-- Only adds: no existing row changes.

-- A themed order's decoration and design fee ({ items: [{ ingredientId,
-- quantity }], feeType: "percent" | "amount", fee }). Null: not customized
-- (orders from before this migration included).
alter table public.orders add column customization jsonb;
