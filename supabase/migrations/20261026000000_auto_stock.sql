-- Miga: automatic stock. Run once in the Supabase SQL Editor, after
-- 20261025000000_orders.sql and before deploying the version that uses it.
-- Only adds: no existing row changes.

-- Finished goods: what is left of each batch she cooked, by the day it was
-- made (the oldest ones are used first).
create table public.finished_goods (
  business_id uuid not null references public.businesses (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  recipe_id text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  made_at date not null default current_date,
  position integer not null default 0,
  primary key (business_id, id)
);

alter table public.finished_goods enable row level security;

create policy "members manage finished goods" on public.finished_goods
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

grant select, insert, update, delete on public.finished_goods to authenticated;

-- What an order deducted when it was prepared ({ ingredients, packaging,
-- taken, cooked, created }), so going back returns exactly that. Null: nothing
-- deducted (orders from before this migration included).
alter table public.orders add column stock_move jsonb;
