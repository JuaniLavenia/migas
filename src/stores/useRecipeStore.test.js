// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import useRecipeStore from "./useRecipeStore";
import { RECIPE_STORAGE_KEY } from "../lib/recipeStorage";

const ingredient = {
  id: "leche",
  name: "Leche",
  category: "Lácteos",
  unit: "ml",
  packSize: 1000,
  packCost: 900,
};

const legacyRecipe = {
  id: "flan",
  name: "Flan",
  yield: 8,
  margin: 50,
  extras: 100,
  updated: "Ayer",
  items: [{ ingredientId: "leche", quantity: 500 }],
};

function stored() {
  return JSON.parse(window.localStorage.getItem(RECIPE_STORAGE_KEY));
}

describe("useRecipeStore persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("loads unversioned (v0) data and stores it back as the current version", async () => {
    window.localStorage.setItem(
      RECIPE_STORAGE_KEY,
      JSON.stringify({
        state: { ingredients: [ingredient], recipes: [legacyRecipe] },
        version: 0,
      }),
    );
    await useRecipeStore.persist.rehydrate();

    const state = useRecipeStore.getState();
    expect(state.ingredients).toEqual([ingredient]);
    expect(state.recipes.map((recipe) => recipe.name)).toEqual(["Flan"]);
    expect(stored().version).toBe(1);
  });

  it("persists only ingredients and recipes", () => {
    useRecipeStore.getState().addIngredient({ ...ingredient, id: undefined });
    expect(Object.keys(stored().state).sort()).toEqual([
      "ingredients",
      "recipes",
    ]);
  });
});
