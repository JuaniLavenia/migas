-- Miga: editable ingredient categories. Run once in the Supabase SQL Editor,
-- after 20261027000000_order_customization.sql and before deploying the
-- version that uses it. Adds a table and a column, then fills them from the
-- category names the ingredients already have: no existing value changes.

-- Ingredient categories, like the recipe ones. `position` is their order,
-- which is also the order of the shopping list.
create table public.ingredient_categories (
  business_id uuid not null references public.businesses (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  position integer not null default 0,
  primary key (business_id, id)
);

alter table public.ingredient_categories enable row level security;

create policy "members manage ingredient categories" on public.ingredient_categories
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

grant select, insert, update, delete on public.ingredient_categories to authenticated;

-- Not a foreign key, as recipes.category_id: an ingredient saved a moment
-- before its new category must not fail, and an unknown category shows as
-- "Sin categoría". The old `category` text column is kept as it was, so the
-- previous version of the app still works; this version no longer writes it.
alter table public.ingredients add column category_id text;

-- Every business with ingredients gets the categories the app had as a fixed
-- list, in that order, then any other name its ingredients use (compared
-- ignoring case and surrounding spaces), in the order they first appear.
insert into public.ingredient_categories (business_id, name, position)
select b.business_id, d.name, (d.ord - 1)::integer
from (select distinct business_id from public.ingredients) as b
cross join unnest(
  array['Secos', 'Lácteos', 'Frescos', 'Chocolates', 'Decoración', 'Otros']
) with ordinality as d (name, ord);

insert into public.ingredient_categories (business_id, name, position)
select
  l.business_id,
  l.name,
  (5 + row_number() over (partition by l.business_id order by l.first_position, l.name))::integer
from (
  select
    i.business_id,
    min(trim(i.category)) as name,
    min(i.position) as first_position
  from public.ingredients i
  where trim(i.category) <> ''
    and not exists (
      select 1
      from public.ingredient_categories c
      where c.business_id = i.business_id
        and lower(c.name) = lower(trim(i.category))
    )
  group by i.business_id, lower(trim(i.category))
) as l;

update public.ingredients i
set category_id = c.id
from public.ingredient_categories c
where c.business_id = i.business_id
  and lower(c.name) = lower(trim(i.category));

-- The first upload now also brings the ingredient categories, and only runs
-- into a business without any of them either. Same body as in the orders
-- migration otherwise.
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
    or exists (select 1 from public.ingredient_categories where business_id = p_business)
    or exists (select 1 from public.packaging where business_id = p_business)
    or exists (select 1 from public.orders where business_id = p_business)
  then
    raise exception 'business_not_empty' using errcode = 'P0001';
  end if;

  insert into public.recipe_categories (business_id, id, name, position)
  select p_business, c ->> 'id', c ->> 'name', (t.ord - 1)::integer
  from jsonb_array_elements(coalesce(p_data -> 'recipeCategories', '[]'::jsonb))
    with ordinality as t (c, ord);

  insert into public.ingredient_categories (business_id, id, name, position)
  select p_business, c ->> 'id', c ->> 'name', (t.ord - 1)::integer
  from jsonb_array_elements(coalesce(p_data -> 'ingredientCategories', '[]'::jsonb))
    with ordinality as t (c, ord);

  insert into public.ingredients
    (business_id, id, name, category, category_id, unit, pack_size, pack_cost, position)
  select
    p_business,
    i ->> 'id',
    i ->> 'name',
    coalesce(i ->> 'category', ''),
    i ->> 'categoryId',
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
