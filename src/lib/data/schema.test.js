// Runs the Supabase migration on a real (in-memory) Postgres and checks the
// access rules: each user only sees and changes their own business, and the
// first upload is all-or-nothing into an empty business. Supabase's `auth`
// schema and roles are stubbed: auth.uid() reads the same setting PostgREST
// fills from the JWT.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// Every migration, in the order they are run in the SQL Editor.
const migrations = [
  "20261023000000_init.sql",
  "20261024000000_packaging_stock.sql",
].map((file) =>
  readFileSync(new URL(`../../../supabase/migrations/${file}`, import.meta.url), "utf8"),
);

const ANA = "00000000-0000-4000-8000-00000000000a";
const BETO = "00000000-0000-4000-8000-00000000000b";

let db;

async function as(user) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    user ?? "",
  ]);
  await db.exec(user ? "set role authenticated" : "set role anon");
}

async function rows(sql, params) {
  return (await db.query(sql, params)).rows;
}

async function businessOf(user) {
  await as(user);
  const [row] = await rows("select public.ensure_my_business() as id");
  return row.id;
}

const localData = {
  recipeCategories: [{ id: "budines", name: "Budines" }],
  ingredients: [
    { id: "harina", name: "Harina", category: "Secos", unit: "g", packSize: 1000, packCost: 1250 },
    { id: "huevos", name: "Huevos", category: "Frescos", unit: "un", packSize: 12, packCost: 2400 },
  ],
  recipes: [
    {
      id: "cookies",
      name: "Cookies",
      categoryId: "budines",
      yield: 18,
      margin: 65,
      extras: 180,
      salePrice: 900,
      updatedAt: 1767225600000,
      items: [{ ingredientId: "harina", quantity: 280 }],
    },
    { id: "brownie", name: "Brownie", yield: 12, margin: 60, extras: 0, items: [] },
  ],
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema auth to anon, authenticated;
    -- As on Supabase: every new table and function in public is open to both
    -- roles, so only row level security protects the data.
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${ANA}'), ('${BETO}');
  `);
  for (const migration of migrations) await db.exec(migration);
  // Starting Postgres (WASM) takes a few seconds, more with the whole suite
  // running in parallel.
}, 60000);

describe("Supabase schema", () => {
  it("creates one business per user on first sign-in, with them as owner", async () => {
    const first = await businessOf(ANA);
    expect(await businessOf(ANA)).toBe(first);
    await as(ANA);
    expect(await rows("select user_id, role from public.business_members")).toEqual([
      { user_id: ANA, role: "owner" },
    ]);
    expect(await businessOf(BETO)).not.toBe(first);
  });

  it("refuses signed-out callers", async () => {
    await as(null);
    await expect(db.query("select public.ensure_my_business()")).rejects.toThrow();
    // anon may query (Supabase grants it), but no policy lets it see a row.
    expect(await rows("select * from public.recipes")).toEqual([]);
    expect(await rows("select * from public.business_members")).toEqual([]);
    await expect(
      db.query("insert into public.recipes (business_id, id) values (gen_random_uuid(), 'x')"),
    ).rejects.toThrow();
  });

  it("uploads local data all at once into an empty business", async () => {
    const business = await businessOf(ANA);
    await rows("select public.upload_local_data($1, $2)", [business, localData]);
    const recipes = await rows(
      "select id, name, category_id, sale_price, items, position, updated_at from public.recipes order by position",
    );
    expect(recipes.map((recipe) => recipe.id)).toEqual(["cookies", "brownie"]);
    expect(recipes[0]).toMatchObject({
      category_id: "budines",
      items: [{ ingredientId: "harina", quantity: 280 }],
      position: 0,
    });
    expect(Number(recipes[0].sale_price)).toBe(900);
    expect(Number(recipes[0].updated_at)).toBe(1767225600000);
    expect(recipes[1].sale_price).toBeNull();
    expect(
      (await rows("select id from public.ingredients order by position")).map(
        (row) => row.id,
      ),
    ).toEqual(["harina", "huevos"]);
    expect(await rows("select id, name from public.recipe_categories")).toEqual([
      { id: "budines", name: "Budines" },
    ]);
  });

  it("never uploads into a business that already has data", async () => {
    const business = await businessOf(ANA);
    await expect(
      db.query("select public.upload_local_data($1, $2)", [
        business,
        { recipes: [{ id: "otra", name: "Otra" }] },
      ]),
    ).rejects.toThrow(/business_not_empty/);
    expect(await rows("select id from public.recipes where id = 'otra'")).toEqual([]);
  });

  it("rolls back a failed upload completely", async () => {
    const business = await businessOf(BETO);
    await expect(
      db.query("select public.upload_local_data($1, $2)", [
        business,
        {
          ingredients: [{ id: "a", name: "A", packSize: 1, packCost: 1 }],
          // Two recipes with the same id break the primary key midway.
          recipes: [
            { id: "dup", name: "Uno" },
            { id: "dup", name: "Dos" },
          ],
        },
      ]),
    ).rejects.toThrow();
    expect(await rows("select id from public.ingredients")).toEqual([]);
  });

  it("keeps each business private to its members", async () => {
    const anas = await businessOf(ANA);
    await as(BETO);
    expect(await rows("select id from public.recipes")).toEqual([]);
    expect(await rows("select id from public.businesses")).toHaveLength(1);
    expect(
      (await rows("select business_id from public.business_members")).every(
        (row) => row.business_id !== anas,
      ),
    ).toBe(true);
    // Writes into someone else's business are rejected or touch nothing.
    await expect(
      db.query("insert into public.recipes (business_id, id, name) values ($1, 'x', 'X')", [anas]),
    ).rejects.toThrow();
    await rows("update public.recipes set name = 'hackeado' where business_id = $1", [anas]);
    await rows("delete from public.recipes where business_id = $1", [anas]);
    await expect(
      db.query("select public.upload_local_data($1, $2)", [anas, {}]),
    ).rejects.toThrow(/not a member/);
    await expect(
      db.query(
        "insert into public.business_members (business_id, user_id) values ($1, $2)",
        [anas, BETO],
      ),
    ).rejects.toThrow();

    await as(ANA);
    expect(
      (await rows("select name from public.recipes order by position")).map(
        (row) => row.name,
      ),
    ).toEqual(["Cookies", "Brownie"]);
  });

  it("keeps the stock of each ingredient, 0 for the ones loaded before", async () => {
    const business = await businessOf(ANA);
    expect(
      await rows("select id, stock from public.ingredients order by position"),
    ).toEqual([
      { id: "harina", stock: "0" },
      { id: "huevos", stock: "0" },
    ]);
    await rows(
      "update public.ingredients set stock = 2500 where business_id = $1 and id = 'harina'",
      [business],
    );
    expect(await rows("select stock from public.ingredients where id = 'harina'")).toEqual([
      { stock: "2500" },
    ]);
    // Stock is never negative, not even written straight to the API.
    await expect(
      db.query("update public.ingredients set stock = -1 where business_id = $1", [business]),
    ).rejects.toThrow(/check/);
    await expect(
      db.query("insert into public.packaging (business_id, id, name, stock) values ($1, 'neg', 'N', -3)", [business]),
    ).rejects.toThrow(/check/);
  });

  it("keeps packaging private to the business members", async () => {
    const anas = await businessOf(ANA);
    await rows(
      "insert into public.packaging (business_id, id, name, pack_size, pack_cost, stock) values ($1, 'bolsa', 'Bolsa individual', 100, 5000, 40)",
      [anas],
    );
    expect(
      await rows("select id, name, pack_size, pack_cost, stock, position from public.packaging"),
    ).toEqual([
      { id: "bolsa", name: "Bolsa individual", pack_size: "100", pack_cost: "5000", stock: "40", position: 0 },
    ]);

    await as(BETO);
    expect(await rows("select id from public.packaging")).toEqual([]);
    await expect(
      db.query("insert into public.packaging (business_id, id, name) values ($1, 'x', 'X')", [anas]),
    ).rejects.toThrow();
    await rows("update public.packaging set name = 'hackeado' where business_id = $1", [anas]);
    await rows("delete from public.packaging where business_id = $1", [anas]);
    await as(null);
    expect(await rows("select id from public.packaging")).toEqual([]);

    await as(ANA);
    expect(await rows("select name from public.packaging")).toEqual([
      { name: "Bolsa individual" },
    ]);
  });

  it("never uploads into a business that only has packaging", async () => {
    const business = await businessOf(BETO);
    await rows(
      "insert into public.packaging (business_id, id, name) values ($1, 'box', 'Box x8')",
      [business],
    );
    await expect(
      db.query("select public.upload_local_data($1, $2)", [
        business,
        { recipes: [{ id: "otra", name: "Otra" }] },
      ]),
    ).rejects.toThrow(/business_not_empty/);
    expect(await rows("select id from public.recipes")).toEqual([]);
  });

  it("lets a member edit, reorder and delete their rows", async () => {
    await as(ANA);
    const business = await businessOf(ANA);
    await rows(
      "update public.recipes set name = 'Cookies XL', position = 5 where business_id = $1 and id = 'cookies'",
      [business],
    );
    await rows("delete from public.recipe_categories where business_id = $1", [business]);
    expect(
      await rows("select name, position from public.recipes where id = 'cookies'"),
    ).toEqual([{ name: "Cookies XL", position: 5 }]);
    expect(await rows("select id from public.recipe_categories")).toEqual([]);
  });
});
