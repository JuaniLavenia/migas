import { describe, expect, it } from "vitest";
import { fromRow, toRow } from "./rows";

const BUSINESS = "b-1";

describe("rows", () => {
  it("maps a recipe to its row and back without losing fields", () => {
    const recipe = {
      id: "cookies",
      name: "Cookies",
      categoryId: "budines",
      yield: 18,
      margin: 65,
      extras: 180,
      salePrice: 900,
      imageUrl: "https://res.cloudinary.com/demo/image/upload/cookies.jpg",
      updatedAt: 1767225600000,
      items: [{ ingredientId: "harina", quantity: 280 }],
    };
    const row = toRow("recipes", recipe, BUSINESS, 3);
    expect(row).toEqual({
      business_id: BUSINESS,
      id: "cookies",
      name: "Cookies",
      category_id: "budines",
      yield: 18,
      margin: 65,
      extras: 180,
      sale_price: 900,
      image_url: "https://res.cloudinary.com/demo/image/upload/cookies.jpg",
      items: [{ ingredientId: "harina", quantity: 280 }],
      position: 3,
      updated_at: 1767225600000,
    });
    expect(fromRow("recipes", row)).toEqual(recipe);
  });

  it("writes unset optional recipe fields as null and reads them back as absent", () => {
    const row = toRow(
      "recipes",
      { id: "r", name: "R", yield: 1, margin: 0, extras: 0, updatedAt: 1, items: [] },
      BUSINESS,
      0,
    );
    expect(row).toMatchObject({ category_id: null, sale_price: null, image_url: null });
    const recipe = fromRow("recipes", row);
    expect(recipe).not.toHaveProperty("categoryId");
    expect(recipe).not.toHaveProperty("salePrice");
    expect(recipe).not.toHaveProperty("imageUrl");
  });

  it("reads Postgres numerics (strings) as numbers", () => {
    const recipe = fromRow("recipes", {
      id: "r",
      name: "R",
      category_id: null,
      yield: "12",
      margin: "60.5",
      extras: "0",
      sale_price: "1500",
      image_url: null,
      items: [],
      position: 0,
      updated_at: "1767225600000",
    });
    expect(recipe).toMatchObject({
      yield: 12,
      margin: 60.5,
      extras: 0,
      salePrice: 1500,
      updatedAt: 1767225600000,
    });
    expect(
      fromRow("ingredients", {
        id: "h",
        name: "Harina",
        category: "Secos",
        category_id: "secos",
        unit: "g",
        pack_size: "1000",
        pack_cost: "1250.5",
        stock: "2500",
        position: 0,
      }),
    ).toEqual({
      id: "h",
      name: "Harina",
      categoryId: "secos",
      unit: "g",
      packSize: 1000,
      packCost: 1250.5,
      stock: 2500,
    });
  });

  it("maps ingredients and categories", () => {
    const ingredient = {
      id: "h",
      name: "Harina",
      categoryId: "secos",
      unit: "g",
      packSize: 1000,
      packCost: 1250,
      stock: 500,
    };
    const row = toRow("ingredients", ingredient, BUSINESS, 1);
    // The legacy `category` text column is left as it is (not written).
    expect(row).toEqual({
      business_id: BUSINESS,
      id: "h",
      name: "Harina",
      category_id: "secos",
      unit: "g",
      pack_size: 1000,
      pack_cost: 1250,
      stock: 500,
      position: 1,
    });
    expect(fromRow("ingredients", row)).toEqual(ingredient);
    expect(
      toRow("ingredientCategories", { id: "s", name: "Secos" }, BUSINESS, 2),
    ).toEqual({ business_id: BUSINESS, id: "s", name: "Secos", position: 2 });
    expect(
      fromRow("ingredientCategories", { business_id: BUSINESS, id: "s", name: "Secos", position: 2 }),
    ).toEqual({ id: "s", name: "Secos" });
    expect(
      toRow("recipeCategories", { id: "c", name: "Cookies" }, BUSINESS, 0),
    ).toEqual({ business_id: BUSINESS, id: "c", name: "Cookies", position: 0 });
    expect(
      fromRow("recipeCategories", { business_id: BUSINESS, id: "c", name: "Cookies", position: 0 }),
    ).toEqual({ id: "c", name: "Cookies" });
  });

  it("writes an ingredient without category as null and reads it back as absent", () => {
    const row = toRow(
      "ingredients",
      { id: "h", name: "Harina", unit: "g", packSize: 1, packCost: 1 },
      BUSINESS,
      0,
    );
    expect(row.category_id).toBeNull();
    expect(fromRow("ingredients", row)).not.toHaveProperty("categoryId");
    expect(fromRow("ingredients", row)).not.toHaveProperty("category");
  });

  it("stores a number the editor left invalid as 0", () => {
    // NumericInput only commits valid numbers, but a NaN must never reach
    // Postgres as "NaN" text.
    const row = toRow(
      "ingredients",
      { id: "h", name: "", category: "", unit: "g", packSize: NaN, packCost: undefined },
      BUSINESS,
      0,
    );
    expect(row).toMatchObject({ pack_size: 0, pack_cost: 0, stock: 0 });
  });

  it("maps packaging, with a missing stock read as 0", () => {
    const packaging = {
      id: "bolsa",
      name: "Bolsa individual",
      packSize: 100,
      packCost: 5000,
      stock: 40,
    };
    const row = toRow("packaging", packaging, BUSINESS, 2);
    expect(row).toEqual({
      business_id: BUSINESS,
      id: "bolsa",
      name: "Bolsa individual",
      pack_size: 100,
      pack_cost: 5000,
      stock: 40,
      position: 2,
    });
    expect(fromRow("packaging", row)).toEqual(packaging);
    expect(
      fromRow("packaging", { id: "b", name: "Box", pack_size: "1", pack_cost: "900", stock: null }),
    ).toEqual({ id: "b", name: "Box", packSize: 1, packCost: 900, stock: 0 });
    expect(toRow("packaging", { id: "b", name: "Box" }, BUSINESS, 0)).toMatchObject({
      pack_size: 0,
      pack_cost: 0,
      stock: 0,
    });
  });

  it("maps an order to its row and back without losing fields", () => {
    const order = {
      id: "o-1",
      client: "Sofi",
      contact: "@sofi.ok",
      dueDate: "2026-10-25",
      dueTime: "17:30",
      delivery: "delivery",
      notes: "Que diga Feliz cumple Sofi",
      items: [{ recipeId: "cookies", quantity: 16 }],
      packagingItems: [{ packagingId: "box", quantity: 2 }],
      price: 24000,
      paid: 10000,
      status: "confirmed",
      createdAt: 1767225600000,
    };
    const row = toRow("orders", order, BUSINESS, 4);
    expect(row).toEqual({
      business_id: BUSINESS,
      id: "o-1",
      client: "Sofi",
      contact: "@sofi.ok",
      due_date: "2026-10-25",
      due_time: "17:30",
      delivery: "delivery",
      notes: "Que diga Feliz cumple Sofi",
      items: [{ recipeId: "cookies", quantity: 16 }],
      packaging_items: [{ packagingId: "box", quantity: 2 }],
      price: 24000,
      paid: 10000,
      status: "confirmed",
      created_at: 1767225600000,
      stock_move: null,
      customization: null,
      position: 4,
    });
    expect(fromRow("orders", row)).toEqual(order);
  });

  it("keeps what an order deducted from the stock", () => {
    const stockMove = {
      ingredients: [{ ingredientId: "harina", quantity: 2100 }],
      packaging: [{ packagingId: "box", quantity: 2 }],
      taken: [{ lotId: "lote-1", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" }],
      created: [{ lotId: "lote-2", recipeId: "cookies", quantity: 10 }],
    };
    const order = { id: "o", client: "Sofi", dueDate: "2026-10-25", stockMove };
    const row = toRow("orders", order, BUSINESS, 0);
    expect(row.stock_move).toEqual(stockMove);
    expect(fromRow("orders", row).stockMove).toEqual(stockMove);
  });

  it("keeps an order's customization", () => {
    const customization = {
      items: [{ ingredientId: "colorante", quantity: 2 }],
      feeType: "amount",
      fee: 1500,
    };
    const order = { id: "o", client: "Sofi", dueDate: "2026-10-25", customization };
    const row = toRow("orders", order, BUSINESS, 0);
    expect(row.customization).toEqual(customization);
    expect(fromRow("orders", row).customization).toEqual(customization);
  });

  it("maps a batch of finished goods", () => {
    const lot = { id: "lote-1", recipeId: "cookies", quantity: 10, madeAt: "2026-10-22" };
    const row = toRow("finishedGoods", lot, BUSINESS, 1);
    expect(row).toEqual({
      business_id: BUSINESS,
      id: "lote-1",
      recipe_id: "cookies",
      quantity: 10,
      made_at: "2026-10-22",
      position: 1,
    });
    expect(fromRow("finishedGoods", { ...row, quantity: "10" })).toEqual(lot);
  });

  it("fills the optional order fields with their defaults", () => {
    expect(
      fromRow("orders", {
        id: "o-2",
        client: "Ana",
        contact: null,
        due_date: "2026-10-26",
        due_time: null,
        delivery: null,
        notes: null,
        items: null,
        packaging_items: null,
        price: "1500.5",
        paid: null,
        status: null,
        created_at: "1767225600000",
      }),
    ).toEqual({
      id: "o-2",
      client: "Ana",
      contact: "",
      dueDate: "2026-10-26",
      dueTime: "",
      delivery: "pickup",
      notes: "",
      items: [],
      packagingItems: [],
      price: 1500.5,
      paid: 0,
      status: "pending",
      createdAt: 1767225600000,
    });
  });
});
