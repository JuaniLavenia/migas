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
  updated: "Hoy",
  items: [{ ingredientId: "harina", quantity: 280 }],
};

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
    });
    expect(result.recipes).toEqual([
      {
        name: "Budín",
        yield: 1,
        margin: 0,
        extras: 0,
        updated: "Importada",
        items: [{ ingredientId: "harina", quantity: 250 }],
      },
    ]);
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
