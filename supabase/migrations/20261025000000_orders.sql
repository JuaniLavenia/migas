-- Miga: orders. Run once in the Supabase SQL Editor, after
-- 20261024000000_packaging_stock.sql and before deploying the version that
-- uses it. Only adds: no existing row changes.

-- The orders she receives. `items` are the products ([{ recipeId, quantity }])
-- and `packaging_items` the packaging ([{ packagingId, quantity }]). `price`
-- is the agreed price and `paid` what she already collected (the deposit, or
-- everything): the payment status is derived from both. `due_time` is
-- "HH:MM", or empty when no time was agreed.
create table public.orders (
  business_id uuid not null references public.businesses (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  client text not null,
  contact text not null default '',
  due_date date not null,
  due_time text not null default ''
    check (due_time = '' or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  delivery text not null default 'pickup' check (delivery in ('pickup', 'delivery')),
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  packaging_items jsonb not null default '[]'::jsonb,
  price numeric not null default 0 check (price >= 0),
  paid numeric not null default 0 check (paid >= 0),
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
  ),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  position integer not null default 0,
  primary key (business_id, id)
);

alter table public.orders enable row level security;

create policy "members manage orders" on public.orders
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

grant select, insert, update, delete on public.orders to authenticated;

-- The first upload still only runs into a business without any data, now
-- orders included. Same body as in the packaging migration otherwise.
create or replace function public.upload_local_data(p_business uuid, p_data jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_business_member(p_business) then
    raise exception 'not a member of this business' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('upload_local_data:' || p_business::text));
  if exists (select 1 from public.recipes where business_id = p_business)
    or exists (select 1 from public.ingredients where business_id = p_business)
    or exists (select 1 from public.recipe_categories where business_id = p_business)
    or exists (select 1 from public.packaging where business_id = p_business)
    or exists (select 1 from public.orders where business_id = p_business)
  then
    raise exception 'business_not_empty' using errcode = 'P0001';
  end if;

  insert into public.recipe_categories (business_id, id, name, position)
  select p_business, c ->> 'id', c ->> 'name', (t.ord - 1)::integer
  from jsonb_array_elements(coalesce(p_data -> 'recipeCategories', '[]'::jsonb))
    with ordinality as t (c, ord);

  insert into public.ingredients
    (business_id, id, name, category, unit, pack_size, pack_cost, position)
  select
    p_business,
    i ->> 'id',
    i ->> 'name',
    coalesce(i ->> 'category', ''),
    coalesce(i ->> 'unit', 'g'),
    coalesce((i ->> 'packSize')::numeric, 0),
    coalesce((i ->> 'packCost')::numeric, 0),
    (t.ord - 1)::integer
  from jsonb_array_elements(coalesce(p_data -> 'ingredients', '[]'::jsonb))
    with ordinality as t (i, ord);

  insert into public.recipes
    (business_id, id, name, category_id, yield, margin, extras, sale_price,
     image_url, items, position, updated_at)
  select
    p_business,
    r ->> 'id',
    coalesce(r ->> 'name', ''),
    r ->> 'categoryId',
    coalesce((r ->> 'yield')::numeric, 1),
    coalesce((r ->> 'margin')::numeric, 0),
    coalesce((r ->> 'extras')::numeric, 0),
    (r ->> 'salePrice')::numeric,
    r ->> 'imageUrl',
    coalesce(r -> 'items', '[]'::jsonb),
    (t.ord - 1)::integer,
    coalesce(
      (r ->> 'updatedAt')::numeric::bigint,
      (extract(epoch from now()) * 1000)::bigint
    )
  from jsonb_array_elements(coalesce(p_data -> 'recipes', '[]'::jsonb))
    with ordinality as t (r, ord);
end;
$$;
