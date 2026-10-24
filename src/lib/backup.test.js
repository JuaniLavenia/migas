import { describe, expect, it } from "vitest";
import { sanitizeBackup } from "./backup";

const validIngredient = {
  id: "harina",
  name: "Harina 0000",
  category: "Secos",
  unit: "g",
  packSize: 1000,
  packCost: 1250,
};

const validRecipe = {
  id: "cookies",
  name: "Cookies",
  yield: 18,
  margin: 65,
  extras: 180,
  updatedAt: 1767225600000,
  items: [{ ingredientId: "harina", quantity: 280 }],
};

const NOW = 1790000000000;

describe("sanitizeBackup", () => {
  it.each([
    ["null", null],
    ["a string", "hola"],
    ["a number", 42],
    ["an array", [validIngredient]],
    ["an object without collections", { foo: 1 }],
  ])("rejects %s", (_label, data) => {
    expect(() => sanitizeBackup(data)).toThrow();
  });

  it("keeps valid records unchanged in meaning", () => {
    const result = sanitizeBackup({
      ingredients: [validIngredient],
      recipes: [validRecipe],
    });
    expect(result.skipped).toBe(0);
    expect(result.ingredients).toEqual([validIngredient]);
    expect(result.recipes).toEqual([validRecipe]);
  });

  it("accepts a backup with only one collection", () => {
    const result = sanitizeBackup({ recipes: [validRecipe] });
    expect(result.ingredients).toEqual([]);
    expect(result.recipes).toHaveLength(1);
  });

  it.each([
    ["missing name", { ...validIngredient, name: undefined }],
    ["blank name", { ...validIngredient, name: "   " }],
    ["packSize 0", { ...validIngredient, packSize: 0 }],
    ["negative packSize", { ...validIngredient, packSize: -1 }],
    ["non-numeric packSize", { ...validIngredient, packSize: "mucho" }],
    ["missing packCost", { ...validIngredient, packCost: undefined }],
    ["negative packCost", { ...validIngredient, packCost: -5 }],
    ["not an object", "harina"],
  ])("skips an ingredient with %s", (_label, ingredient) => {
    const result = sanitizeBackup({ ingredients: [ingredient] });
    expect(result.ingredients).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it("coerces numeric strings and defaults unit and category", () => {
    const result = sanitizeBackup({
      ingredients: [{ name: "Sal", packSize: "500", packCost: "0" }],
    });
    expect(result.ingredients).toEqual([
      { name: "Sal", category: "", unit: "g", packSize: 500, packCost: 0 },
    ]);
  });

  it("drops unknown fields from records", () => {
    const result = sanitizeBackup({
      ingredients: [{ ...validIngredient, evil: "<script>" }],
    });
    expect(result.ingredients[0]).not.toHaveProperty("evil");
  });

  it.each([
    ["missing name", { ...validRecipe, name: "" }],
    ["missing items", { ...validRecipe, items: undefined }],
    ["items not an array", { ...validRecipe, items: "harina" }],
    [
      "an item without ingredientId",
      { ...validRecipe, items: [{ quantity: 2 }] },
    ],
    [
      "an item with negative quantity",
      { ...validRecipe, items: [{ ingredientId: "harina", quantity: -1 }] },
    ],
    [
      "an item with non-numeric quantity",
      { ...validRecipe, items: [{ ingredientId: "harina", quantity: "x" }] },
    ],
    ["not an object", null],
  ])("skips a recipe with %s", (_label, recipe) => {
    const result = sanitizeBackup({ recipes: [recipe] });
    expect(result.recipes).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it("coerces recipe numbers and applies safe defaults", () => {
    const result = sanitizeBackup({
      recipes: [
        {
          name: "Budín",
          yield: "0",
          margin: -10,
          extras: "abc",
          items: [{ ingredientId: "harina", quantity: "250" }],
        },
      ],
    }, NOW);
    expect(result.recipes).toEqual([
      {
        name: "Budín",
        yield: 1,
        margin: 0,
        extras: 0,
        updatedAt: NOW,
        items: [{ ingredientId: "harina", quantity: 250 }],
      },
    ]);
  });

  it("accepts an old backup whose recipes have an `updated` label", () => {
    const { updatedAt, ...withoutDate } = validRecipe;
    const result = sanitizeBackup(
      { recipes: [{ ...withoutDate, updated: "Hoy" }] },
      NOW,
    );
    // A label like "Hoy" is not a reliable date: the import time is used.
    expect(result.recipes).toEqual([{ ...withoutDate, updatedAt: NOW }]);
  });

  it.each([
    ["a string", "2026-01-01"],
    ["zero", 0],
    ["NaN", NaN],
  ])("replaces an updatedAt that is %s with the import time", (_label, value) => {
    const result = sanitizeBackup(
      { recipes: [{ ...validRecipe, updatedAt: value }] },
      NOW,
    );
    expect(result.recipes[0].updatedAt).toBe(NOW);
  });

  it("keeps a web photo link and drops anything else, including old imageIds", () => {
    const photo = "https://res.cloudinary.com/miga/image/upload/v1/a.jpg";
    const result = sanitizeBackup({
      recipes: [
        { ...validRecipe, id: "a", imageUrl: ` ${photo} ` },
        { ...validRecipe, id: "b", imageUrl: "javascript:alert(1)" },
        { ...validRecipe, id: "c", imageId: "img-1" },
      ],
    });
    expect(result.recipes[0].imageUrl).toBe(photo);
    expect(result.recipes[1]).not.toHaveProperty("imageUrl");
    expect(result.recipes[2]).not.toHaveProperty("imageId");
    expect(result.recipes[2]).not.toHaveProperty("imageUrl");
  });

  it("keeps recipe categories and the new recipe fields", () => {
    const result = sanitizeBackup({
      recipeCategories: [
        { id: "budines", name: " Budines " },
        { id: "x", name: "" },
        "cookies",
      ],
      recipes: [
        { ...validRecipe, id: "a", categoryId: "budines", salePrice: "1500" },
        { ...validRecipe, id: "b", categoryId: 7, salePrice: -1 },
        { ...validRecipe, id: "c", salePrice: null },
      ],
    });
    expect(result.recipeCategories).toEqual([
      { id: "budines", name: "Budines" },
    ]);
    expect(result.recipes[0]).toMatchObject({
      categoryId: "budines",
      salePrice: 1500,
    });
    expect(result.recipes[1]).not.toHaveProperty("categoryId");
    expect(result.recipes[1]).not.toHaveProperty("salePrice");
    expect(result.recipes[2]).not.toHaveProperty("salePrice");
    expect(result.skipped).toBe(2);
  });

  it("accepts an old backup without categories", () => {
    const result = sanitizeBackup({ recipes: [validRecipe] });
    expect(result.recipeCategories).toEqual([]);
    expect(result.recipes).toEqual([validRecipe]);
  });

  it("keeps a valid ingredient stock and leaves out a missing or invalid one", () => {
    const result = sanitizeBackup({
      ingredients: [
        { ...validIngredient, id: "a", stock: 2500 },
        { ...validIngredient, id: "b", stock: "30" },
        { ...validIngredient, id: "c" },
        { ...validIngredient, id: "d", stock: -5 },
        { ...validIngredient, id: "e", stock: "mucho" },
      ],
    });
    expect(result.ingredients.map((item) => item.stock)).toEqual([
      2500,
      30,
      undefined,
      undefined,
      undefined,
    ]);
    expect(result.ingredients[2]).not.toHaveProperty("stock");
    expect(result.skipped).toBe(0);
  });

  it("keeps valid packaging and skips broken items", () => {
    const result = sanitizeBackup({
      ingredients: [],
      packaging: [
        { id: "bolsa", name: "Bolsa", packSize: "100", packCost: 5000, stock: 40, evil: 1 },
        { id: "box", name: "Box", packSize: 10, packCost: 9000 },
        { id: "x", name: "", packSize: 1, packCost: 1 },
        { id: "y", name: "Sin presentación", packSize: 0, packCost: 1 },
        "caja",
      ],
    });
    expect(result.packaging).toEqual([
      { id: "bolsa", name: "Bolsa", packSize: 100, packCost: 5000, stock: 40 },
      { id: "box", name: "Box", packSize: 10, packCost: 9000 },
    ]);
    expect(result.skipped).toBe(3);
  });

  it("accepts an old backup without packaging", () => {
    expect(sanitizeBackup({ recipes: [validRecipe] }).packaging).toEqual([]);
    expect(sanitizeBackup({ packaging: [] }).packaging).toEqual([]);
  });

  it("keeps valid orders and skips broken ones", () => {
    const base = {
      id: "o-1",
      client: "Sofi",
      dueDate: "2026-10-25",
      items: [{ recipeId: "cookies", quantity: "16" }],
      price: 24000,
    };
    const result = sanitizeBackup({
      orders: [
        {
          ...base,
          contact: "@sofi",
          dueTime: "17:30",
          delivery: "delivery",
          notes: "Sin TACC",
          packagingItems: [{ packagingId: "box", quantity: 2 }],
          paid: 10000,
          status: "confirmed",
          createdAt: 1767225600000,
          evil: 1,
        },
        // Unknown or missing optional values fall back to their defaults.
        { ...base, id: "o-2", dueTime: "tarde", delivery: "drone", status: "shipped", paid: -5 },
        { ...base, id: "x", client: "" },
        { ...base, id: "y", dueDate: "25/10" },
        // Not a calendar day: Postgres would reject it on every save.
        { ...base, id: "v", dueDate: "2026-02-30" },
        { ...base, id: "z", price: -1 },
        { ...base, id: "w", items: [{ recipeId: "cookies", quantity: 0 }] },
        "pedido",
      ],
    }, 99);
    expect(result.orders).toEqual([
      {
        id: "o-1",
        client: "Sofi",
        contact: "@sofi",
        dueDate: "2026-10-25",
        dueTime: "17:30",
        delivery: "delivery",
        notes: "Sin TACC",
        items: [{ recipeId: "cookies", quantity: 16 }],
        packagingItems: [{ packagingId: "box", quantity: 2 }],
        price: 24000,
        paid: 10000,
        status: "confirmed",
        createdAt: 1767225600000,
      },
      {
        id: "o-2",
        client: "Sofi",
        contact: "",
        dueDate: "2026-10-25",
        dueTime: "",
        delivery: "pickup",
        notes: "",
        items: [{ recipeId: "cookies", quantity: 16 }],
        packagingItems: [],
        price: 24000,
        paid: 0,
        status: "pending",
        createdAt: 99,
      },
    ]);
    expect(result.skipped).toBe(6);
  });

  it("accepts an old backup without orders, and one that only brings orders", () => {
    expect(sanitizeBackup({ recipes: [validRecipe] }).orders).toEqual([]);
    expect(sanitizeBackup({ orders: [] }).orders).toEqual([]);
  });

  it("counts skipped records across both collections", () => {
    const result = sanitizeBackup({
      ingredients: [validIngredient, { name: "" }],
      recipes: [validRecipe, { name: "Sin items" }, 7],
    });
    expect(result.ingredients).toHaveLength(1);
    expect(result.recipes).toHaveLength(1);
    expect(result.skipped).toBe(3);
  });
});
