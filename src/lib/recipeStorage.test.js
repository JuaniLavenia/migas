import { describe, expect, it } from "vitest";
import {
  RECIPE_STORAGE_VERSION,
  migrateRecipeState,
} from "./recipeStorage";

const ingredient = {
  id: "harina",
  name: "Harina 0000",
  category: "Secos",
  unit: "g",
  packSize: 1000,
  packCost: 1250,
};

const legacyRecipe = {
  id: "cookies",
  name: "Cookies",
  yield: 18,
  margin: 65,
  extras: 180,
  updated: "Hoy",
  items: [{ ingredientId: "harina", quantity: 280 }],
};

const NOW = 1790000000000;

describe("migrateRecipeState", () => {
  it("targets version 2", () => {
    expect(RECIPE_STORAGE_VERSION).toBe(2);
  });

  it("keeps v1 data as is: v2 only adds optional fields and categories", () => {
    const current = { ingredients: [ingredient], recipes: [legacyRecipe] };
    expect(migrateRecipeState(current, 1, NOW)).toEqual(current);
  });

  it("keeps the recipe categories and the new recipe fields at version 2", () => {
    const recipe = { ...legacyRecipe, categoryId: "budines", salePrice: 900 };
    const categories = [{ id: "budines", name: "Budines" }];
    expect(
      migrateRecipeState(
        { recipeCategories: categories, recipes: [recipe] },
        2,
        NOW,
      ),
    ).toEqual({ recipeCategories: categories, recipes: [recipe] });
    expect(
      migrateRecipeState({ recipeCategories: "broken" }, 2, NOW),
    ).toEqual({});
  });

  it("keeps every unversioned (v0) ingredient and recipe", () => {
    const result = migrateRecipeState(
      { ingredients: [ingredient], recipes: [legacyRecipe] },
      0,
      NOW,
    );
    expect(result.ingredients).toEqual([ingredient]);
    expect(result.recipes).toHaveLength(1);
    expect(result.recipes[0]).toMatchObject({
      id: "cookies",
      name: "Cookies",
      yield: 18,
      margin: 65,
      extras: 180,
      items: legacyRecipe.items,
    });
  });

  it("replaces the v0 `updated` label with the migration time", () => {
    // Labels like "Hoy" or "Ayer" are relative to when they were written,
    // so they cannot be turned into a real date.
    const [recipe] = migrateRecipeState(
      { recipes: [legacyRecipe] },
      0,
      NOW,
    ).recipes;
    expect(recipe.updatedAt).toBe(NOW);
    expect(recipe).not.toHaveProperty("updated");
  });

  it("keeps a valid updatedAt and leaves non-object recipes alone", () => {
    const { updated, ...dated } = { ...legacyRecipe, updatedAt: 1000 };
    const result = migrateRecipeState({ recipes: [dated, null] }, 0, NOW);
    expect(result.recipes).toEqual([dated, null]);
  });

  it("does not touch data already at version 1", () => {
    const current = { ingredients: [ingredient], recipes: [legacyRecipe] };
    expect(migrateRecipeState(current, 1, NOW)).toEqual(current);
  });

  it("keeps only the data collections", () => {
    const result = migrateRecipeState(
      { ingredients: [], recipes: [], selectedId: "x", stale: true },
      0,
    );
    expect(result).toEqual({ ingredients: [], recipes: [] });
  });

  it("leaves a collection out when it is missing or not an array", () => {
    expect(migrateRecipeState({ ingredients: "broken" }, 0)).toEqual({});
  });

  it.each([null, undefined, "text", 42, []])(
    "returns no data for %s, so the defaults are kept",
    (persisted) => {
      expect(migrateRecipeState(persisted, 0)).toEqual({});
    },
  );

  it("keeps the recipe fields of the current version", () => {
    const recipe = { ...legacyRecipe, updatedAt: NOW, imageId: "img-1" };
    delete recipe.updated;
    const result = migrateRecipeState({ recipes: [recipe] }, 1, NOW);
    expect(result.recipes[0].imageId).toBe("img-1");
  });
});

