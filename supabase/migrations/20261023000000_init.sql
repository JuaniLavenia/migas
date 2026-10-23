-- Miga: initial schema. Run once in the Supabase SQL Editor (or with the
-- Supabase CLI). Every data row belongs to a business; only its members can
-- read or change it (row level security).

-- Businesses and who belongs to them ---------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi emprendimiento',
  created_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_members_user_id_idx on public.business_members (user_id);

-- Data ----------------------------------------------------------------------
-- Ids are text so the ids already used by the app (uuids, demo slugs such as
-- "cookies") are kept as they are. `position` is the custom order.
-- Constraints stay loose on purpose: any state the editor can be in while
-- typing (an empty name, a 0) must still save.

create table public.recipe_categories (
  business_id uuid not null references public.businesses (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  position integer not null default 0,
  primary key (business_id, id)
);

create table public.ingredients (
  business_id uuid not null references public.businesses (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  category text not null default '',
  unit text not null default 'g',
  pack_size numeric not null default 0,
  pack_cost numeric not null default 0,
  position integer not null default 0,
  primary key (business_id, id)
);

-- `items` is the recipe's ordered list of { ingredientId, quantity }, always
-- written as a whole. `category_id` is not a foreign key: a recipe saved a
-- moment before its new category must not fail, and an unknown category
-- shows as "Sin categoría". `updated_at` is milliseconds since the epoch, as
-- the app keeps it.
create table public.recipes (
  business_id uuid not null references public.businesses (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null default '',
  category_id text,
  yield numeric not null default 1,
  margin numeric not null default 0,
  extras numeric not null default 0,
  sale_price numeric,
  image_url text,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  position integer not null default 0,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (business_id, id)
);

-- Access rules ----------------------------------------------------------------

create function public.is_business_member(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business
      and m.user_id = (select auth.uid())
  );
$$;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.recipe_categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;

create policy "members read their business" on public.businesses
  for select to authenticated
  using (public.is_business_member(id));

create policy "members rename their business" on public.businesses
  for update to authenticated
  using (public.is_business_member(id))
  with check (public.is_business_member(id));

-- Memberships are only created by ensure_my_business (and, later, by an
-- invite flow); the app can read them but not change them.
create policy "members see the business members" on public.business_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_member(business_id));

create policy "members manage recipe categories" on public.recipe_categories
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members manage ingredients" on public.ingredients
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "members manage recipes" on public.recipes
  for all to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

grant select, update on public.businesses to authenticated;
grant select on public.business_members to authenticated;
grant select, insert, update, delete on public.recipe_categories to authenticated;
grant select, insert, update, delete on public.ingredients to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;

-- Functions -------------------------------------------------------------------

-- The signed-in user's business, created on their first sign-in with them as
-- owner. The lock keeps two tabs signing in at once from creating two.
create function public.ensure_my_business()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_business uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ensure_my_business:' || v_user::text));
  select m.business_id into v_business
  from public.business_members m
  where m.user_id = v_user
  order by m.created_at
  limit 1;
  if v_business is null then
    insert into public.businesses default values returning id into v_business;
    insert into public.business_members (business_id, user_id, role)
    values (v_business, v_user, 'owner');
  end if;
  return v_business;
end;
$$;

-- First upload of the data kept in a browser: all or nothing, and only into
-- an empty business, so an old device can never overwrite newer data.
-- `p_data` is { recipeCategories, ingredients, recipes } in the app's shape.
-- Runs with the caller's rights: the row level security above applies.
create function public.upload_local_data(p_business uuid, p_data jsonb)
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

revoke all on function public.is_business_member(uuid) from public, anon;
revoke all on function public.ensure_my_business() from public, anon;
revoke all on function public.upload_local_data(uuid, jsonb) from public, anon;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.ensure_my_business() to authenticated;
grant execute on function public.upload_local_data(uuid, jsonb) to authenticated;
