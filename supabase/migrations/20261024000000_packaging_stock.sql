-- Miga: packaging and stock. Run once in the Supabase SQL Editor, after
-- 20261023000000_init.sql and before deploying the version that uses it.
-- Only adds: existing rows keep their data and start with stock 0.

-- How much of each ingredient she has, in its base unit (g, ml, un).
alter table public.ingredients
  add column stock numeric not null default 0;

-- Bags, boxes and the like. Bought in packs (`pack_size` units for
-- `pack_cost`); `stock` is the units on hand. Not part of recipes: packaging
-- goes per order.
create table public.packaging (
  business_id uuid not null references public.businesses (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  pack_size numeric not null default 0,
  pack_cost numeric not null default 0,
  stock numeric not null default 0,
  position integer not null default 0,
  primary key (business_id, id)
);

alter table public.packaging enable row level security;

create policy "members manage packaging" on public.packaging
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

grant select, insert, update, delete on public.packaging to authenticated;

-- The first upload still only runs into a business without any data, now
-- packaging included. Same body as in the init migration otherwise.
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
