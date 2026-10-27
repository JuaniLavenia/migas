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
  "20261025000000_orders.sql",
  "20261026000000_auto_stock.sql",
  "20261027000000_order_customization.sql",
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

  it("lets only the members rename their business", async () => {
    const anas = await businessOf(ANA);
    expect(await rows("select name from public.businesses where id = $1", [anas])).toEqual([
      { name: "Mi emprendimiento" },
    ]);
    await as(BETO);
    await rows("update public.businesses set name = 'hackeado' where id = $1", [anas]);
    await as(ANA);
    await rows("update public.businesses set name = 'Dulce Miga' where id = $1", [anas]);
    expect(await rows("select name from public.businesses where id = $1", [anas])).toEqual([
      { name: "Dulce Miga" },
    ]);
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

  it("keeps orders private to the business members", async () => {
    const anas = await businessOf(ANA);
    await rows(
      `insert into public.orders
         (business_id, id, client, due_date, due_time, items, packaging_items, price, paid, status)
       values ($1, 'o-1', 'Sofi', '2026-10-25', '17:30',
         '[{"recipeId":"cookies","quantity":16}]', '[{"packagingId":"bolsa","quantity":16}]',
         24000, 10000, 'confirmed')`,
      [anas],
    );
    expect(
      await rows(
        "select id, client, contact, due_date::text, due_time, delivery, notes, items, packaging_items, price, paid, status from public.orders",
      ),
    ).toEqual([
      {
        id: "o-1",
        client: "Sofi",
        contact: "",
        due_date: "2026-10-25",
        due_time: "17:30",
        delivery: "pickup",
        notes: "",
        items: [{ recipeId: "cookies", quantity: 16 }],
        packaging_items: [{ packagingId: "bolsa", quantity: 16 }],
        price: "24000",
        paid: "10000",
        status: "confirmed",
      },
    ]);

    await as(BETO);
    expect(await rows("select id from public.orders")).toEqual([]);
    await expect(
      db.query(
        "insert into public.orders (business_id, id, client, due_date) values ($1, 'x', 'X', '2026-10-25')",
        [anas],
      ),
    ).rejects.toThrow();
    await rows("update public.orders set client = 'hackeado' where business_id = $1", [anas]);
    await rows("delete from public.orders where business_id = $1", [anas]);
    await as(null);
    expect(await rows("select id from public.orders")).toEqual([]);

    await as(ANA);
    expect(await rows("select client from public.orders")).toEqual([{ client: "Sofi" }]);
  });

  it("only accepts known statuses, delivery modes, times and amounts for orders", async () => {
    const business = await businessOf(ANA);
    const insert = (columns, values) =>
      db.query(
        `insert into public.orders (business_id, id, client, due_date, ${columns})
         values ($1, gen_random_uuid()::text, 'X', '2026-10-25', ${values})`,
        [business],
      );
    await expect(insert("status", "'shipped'")).rejects.toThrow(/check/);
    await expect(insert("delivery", "'drone'")).rejects.toThrow(/check/);
    await expect(insert("due_time", "'25:00'")).rejects.toThrow(/check/);
    await expect(insert("price", "-1")).rejects.toThrow(/check/);
    await expect(insert("paid", "-1")).rejects.toThrow(/check/);
    expect(await rows("select id from public.orders")).toHaveLength(1);
  });

  it("never uploads into a business that only has orders", async () => {
    const business = await businessOf(BETO);
    await rows("delete from public.packaging where business_id = $1", [business]);
    await rows(
      "insert into public.orders (business_id, id, client, due_date) values ($1, 'o', 'Ana', '2026-10-25')",
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

  it("still uploads into an empty business after the orders migration", async () => {
    const business = await businessOf(BETO);
    await rows("delete from public.orders where business_id = $1", [business]);
    await rows("select public.upload_local_data($1, $2)", [
      business,
      { recipes: [{ id: "nueva", name: "Nueva", items: [] }] },
    ]);
    expect(await rows("select id from public.recipes")).toEqual([{ id: "nueva" }]);
    await rows("delete from public.recipes where business_id = $1", [business]);
  });

  it("keeps finished goods private to the business members, never negative", async () => {
    const anas = await businessOf(ANA);
    await rows(
      "insert into public.finished_goods (business_id, id, recipe_id, quantity, made_at) values ($1, 'lote', 'cookies', 10, '2026-10-22')",
      [anas],
    );
    expect(
      await rows("select id, recipe_id, quantity, made_at::text from public.finished_goods"),
    ).toEqual([{ id: "lote", recipe_id: "cookies", quantity: "10", made_at: "2026-10-22" }]);
    await expect(
      db.query("update public.finished_goods set quantity = -1 where business_id = $1", [anas]),
    ).rejects.toThrow(/check/);

    await as(BETO);
    expect(await rows("select id from public.finished_goods")).toEqual([]);
    await expect(
      db.query(
        "insert into public.finished_goods (business_id, id, recipe_id, quantity) values ($1, 'x', 'x', 1)",
        [anas],
      ),
    ).rejects.toThrow();
    await rows("update public.finished_goods set quantity = 99 where business_id = $1", [anas]);
    await rows("delete from public.finished_goods where business_id = $1", [anas]);
    await as(null);
    expect(await rows("select id from public.finished_goods")).toEqual([]);

    await as(ANA);
    expect(await rows("select quantity from public.finished_goods")).toEqual([{ quantity: "10" }]);
  });

  it("keeps what each order deducted, empty for the orders before", async () => {
    const business = await businessOf(ANA);
    expect(await rows("select stock_move from public.orders where id = 'o-1'")).toEqual([
      { stock_move: null },
    ]);
    await rows(
      "update public.orders set stock_move = $2 where business_id = $1 and id = 'o-1'",
      [business, { ingredients: [{ ingredientId: "harina", quantity: 2100 }] }],
    );
    expect(await rows("select stock_move from public.orders where id = 'o-1'")).toEqual([
      { stock_move: { ingredients: [{ ingredientId: "harina", quantity: 2100 }] } },
    ]);
  });

  it("keeps each order's customization, empty for the orders before", async () => {
    const business = await businessOf(ANA);
    expect(await rows("select customization from public.orders where id = 'o-1'")).toEqual([
      { customization: null },
    ]);
    const customization = {
      items: [{ ingredientId: "colorante", quantity: 2 }],
      feeType: "percent",
      fee: 30,
    };
    await rows(
      "update public.orders set customization = $2 where business_id = $1 and id = 'o-1'",
      [business, customization],
    );
    expect(await rows("select customization from public.orders where id = 'o-1'")).toEqual([
      { customization },
    ]);
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
