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

describe("useRecipeStore custom order", () => {
  const ids = (list) => list.map((item) => item.id);
  const recipe = (id, updatedAt) => ({
    id,
    name: id,
    yield: 1,
    margin: 0,
    extras: 0,
    updatedAt,
    items: [],
  });

  beforeEach(() => {
    window.localStorage.clear();
    useRecipeStore.setState({
      ingredients: ["a", "b", "c", "d"].map((id) => ({ ...ingredient, id })),
      recipes: [recipe("r1", 1), recipe("r2", 2), recipe("r3", 3)],
    });
  });

  it("reorders ingredients by dropping one onto another's position", () => {
    useRecipeStore.getState().reorderIngredients("a", "c");
    expect(ids(useRecipeStore.getState().ingredients)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    useRecipeStore.getState().reorderIngredients("d", "b");
    expect(ids(useRecipeStore.getState().ingredients)).toEqual([
      "d",
      "b",
      "c",
      "a",
    ]);
    expect(ids(stored().state.ingredients)).toEqual(["d", "b", "c", "a"]);
  });

  it("moves an ingredient one position, staying put at the edges", () => {
    const { moveIngredient } = useRecipeStore.getState();
    moveIngredient("b", -1);
    expect(ids(useRecipeStore.getState().ingredients)).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
    const before = useRecipeStore.getState().ingredients;
    moveIngredient("b", -1);
    moveIngredient("unknown", 1);
    expect(useRecipeStore.getState().ingredients).toBe(before);
  });

  it("ignores reorders with unknown ids", () => {
    const before = useRecipeStore.getState().ingredients;
    useRecipeStore.getState().reorderIngredients("a", "zzz");
    useRecipeStore.getState().reorderIngredients("zzz", "a");
    expect(useRecipeStore.getState().ingredients).toBe(before);
  });

  it("reorders and moves recipes without touching updatedAt", () => {
    useRecipeStore.getState().reorderRecipes("r3", "r1");
    expect(ids(useRecipeStore.getState().recipes)).toEqual(["r3", "r1", "r2"]);
    useRecipeStore.getState().moveRecipe("r1", 1);
    const { recipes } = useRecipeStore.getState();
    expect(ids(recipes)).toEqual(["r3", "r2", "r1"]);
    expect(recipes.map((entry) => entry.updatedAt)).toEqual([3, 2, 1]);
  });
});

describe("useRecipeStore recipe images", () => {
  const NOW = new Date(2026, 9, 6, 12, 0, 0).getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("sets and clears a recipe image as an edit (updatedAt changes)", () => {
    const id = useRecipeStore
      .getState()
      .addRecipe({ name: "Tarta", yield: 8, margin: 50, extras: 0, items: [] });
    vi.setSystemTime(NOW + 1000);
    useRecipeStore.getState().setRecipeImage(id, "img-1");
    let recipe = useRecipeStore.getState().getRecipe(id);
    expect(recipe.imageId).toBe("img-1");
    expect(recipe.updatedAt).toBe(NOW + 1000);
    expect(stored().state.recipes.at(-1).imageId).toBe("img-1");

    vi.setSystemTime(NOW + 2000);
    useRecipeStore.getState().setRecipeImage(id, null);
    recipe = useRecipeStore.getState().getRecipe(id);
    expect(recipe).not.toHaveProperty("imageId");
    expect(recipe.updatedAt).toBe(NOW + 2000);
  });
});
