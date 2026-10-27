import { describe, expect, it } from "vitest";
import { readLocalData } from "./localData";
import { RECIPE_STORAGE_KEY } from "./recipeStorage";

function storageWith(value) {
  const data = new Map(value === undefined ? [] : [[RECIPE_STORAGE_KEY, value]]);
  return { getItem: (key) => (data.has(key) ? data.get(key) : null) };
}

const ingredient = {
  id: "harina",
  name: "Harina",
  category: "Secos",
  unit: "g",
  packSize: 1000,
  packCost: 1250,
};
const recipe = (id, updatedAt, extra = {}) => ({
  id,
  name: id,
  yield: 10,
  margin: 50,
  extras: 0,
  updatedAt,
  items: [{ ingredientId: "harina", quantity: 100 }],
  ...extra,
});

describe("readLocalData", () => {
  it("reads what an earlier version kept in this browser, with a summary", () => {
    const local = readLocalData(
      storageWith(
        JSON.stringify({
          state: {
            ingredients: [ingredient],
            recipeCategories: [{ id: "budines", name: "Budines" }],
            recipes: [
              recipe("a", 1000, { imageId: "img-1", categoryId: "budines" }),
              recipe("b", 5000, { salePrice: 900 }),
            ],
          },
          version: 2,
        }),
      ),
    );
    expect(local.summary).toEqual({
      skipped: 0,
      recipes: 2,
      ingredients: 1,
      categories: 1,
      photos: 1,
      lastChange: 5000,
    });
    expect(local.data.recipes[0]).toMatchObject({ id: "a", categoryId: "budines" });
    expect(local.data.recipes[0]).not.toHaveProperty("imageId");
    expect(local.data.recipes[1].salePrice).toBe(900);
    // The category names of then become the six categories the app had,
    // plus any other name in use.
    const categories = local.data.ingredientCategories;
    expect(categories.map((category) => category.name)).toEqual([
      "Secos",
      "Lácteos",
      "Frescos",
      "Chocolates",
      "Decoración",
      "Otros",
    ]);
    const { category: _name, ...rest } = ingredient;
    expect(local.data.ingredients).toEqual([{ ...rest, categoryId: categories[0].id }]);
  });

  it("adds the other category names its ingredients use", () => {
    const local = readLocalData(
      storageWith(
        JSON.stringify({
          state: {
            ingredients: [
              { ...ingredient, id: "chispas", category: "Toppings" },
              { ...ingredient, id: "sal", category: "" },
            ],
          },
          version: 2,
        }),
      ),
    );
    const categories = local.data.ingredientCategories;
    expect(categories).toHaveLength(7);
    expect(categories.at(-1).name).toBe("Toppings");
    expect(local.data.ingredients.map((item) => item.categoryId)).toEqual([
      categories.at(-1).id,
      undefined,
    ]);
  });

  it("brings no ingredient categories without ingredients", () => {
    const local = readLocalData(
      storageWith(JSON.stringify({ state: { recipes: [recipe("a", 1000)] }, version: 2 })),
    );
    expect(local.data.ingredientCategories).toEqual([]);
  });

  it("keeps a record whose name was erased, and counts broken ones", () => {
    const local = readLocalData(
      storageWith(
        JSON.stringify({
          state: {
            ingredients: [ingredient],
            recipes: [recipe("a", 1000, { name: "  " }), { name: "Sin items" }],
          },
          version: 2,
        }),
      ),
    );
    expect(local.data.recipes.map((entry) => [entry.id, entry.name])).toEqual([
      ["a", "Sin nombre"],
    ]);
    expect(local.summary.skipped).toBe(1);
  });

  it("upgrades data from version 1 (no categories)", () => {
    const local = readLocalData(
      storageWith(
        JSON.stringify({
          state: { ingredients: [ingredient], recipes: [recipe("a", 1000)] },
          version: 1,
        }),
      ),
    );
    expect(local.data.recipeCategories).toEqual([]);
    expect(local.summary.recipes).toBe(1);
  });

  it.each([
    ["nothing stored", undefined],
    ["broken JSON", "{nope"],
    ["empty collections", JSON.stringify({ state: { ingredients: [], recipes: [] }, version: 2 })],
    ["not an object", JSON.stringify(42)],
  ])("returns null for %s", (_label, value) => {
    expect(readLocalData(storageWith(value))).toBeNull();
  });

  it("returns null when storage cannot be read", () => {
    expect(
      readLocalData({
        getItem() {
          throw new DOMException("blocked", "SecurityError");
        },
      }),
    ).toBeNull();
  });
});
