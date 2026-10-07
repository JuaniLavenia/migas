// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(state.recipes[0]).not.toHaveProperty("updated");
    expect(Number.isFinite(state.recipes[0].updatedAt)).toBe(true);
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

describe("useRecipeStore recipe dates", () => {
  const NOW = new Date(2026, 9, 6, 12, 0, 0).getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("stamps a new recipe with updatedAt", () => {
    const id = useRecipeStore
      .getState()
      .addRecipe({ name: "Tarta", yield: 8, margin: 50, extras: 0, items: [] });
    expect(useRecipeStore.getState().getRecipe(id).updatedAt).toBe(NOW);
  });

  it("refreshes updatedAt when a recipe changes", () => {
    const id = useRecipeStore
      .getState()
      .addRecipe({ name: "Tarta", yield: 8, margin: 50, extras: 0, items: [] });
    vi.setSystemTime(NOW + 5000);
    useRecipeStore.getState().updateRecipe(id, { margin: 60 });
    const recipe = useRecipeStore.getState().getRecipe(id);
    expect(recipe.updatedAt).toBe(NOW + 5000);
    expect(recipe).not.toHaveProperty("updated");
  });
});
