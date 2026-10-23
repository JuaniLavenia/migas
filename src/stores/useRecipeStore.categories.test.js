// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import useRecipeStore from "./useRecipeStore";

const initialState = useRecipeStore.getState();
const ids = (list) => list.map((item) => item.id);
const recipe = (id, categoryId) => ({
  id,
  name: id,
  yield: 1,
  margin: 0,
  extras: 0,
  updatedAt: 1000,
  items: [],
  ...(categoryId ? { categoryId } : {}),
});
const store = () => useRecipeStore.getState();


beforeEach(() => {
  window.localStorage.clear();
  useRecipeStore.setState(
    {
      ...initialState,
      recipeCategories: [
        { id: "budines", name: "Budines" },
        { id: "cookies", name: "Cookies" },
      ],
      recipes: [
        recipe("b1", "budines"),
        recipe("c1", "cookies"),
        recipe("b2", "budines"),
        recipe("c2", "cookies"),
      ],
    },
    true,
  );
});

describe("recipe categories", () => {
  it("adds a category and returns its id; a repeated name reuses it", () => {
    const id = store().addRecipeCategory("  Trufas ");
    expect(store().recipeCategories.at(-1)).toEqual({ id, name: "Trufas" });
    expect(store().addRecipeCategory("trufas")).toBe(id);
    expect(store().addRecipeCategory("   ")).toBeNull();
    expect(store().recipeCategories).toHaveLength(3);
  });

  it("renames a category, ignoring blank names", () => {
    store().renameRecipeCategory("budines", "Budines y tortas");
    store().renameRecipeCategory("cookies", " ");
    expect(store().recipeCategories.map((category) => category.name)).toEqual([
      "Budines y tortas",
      "Cookies",
    ]);
  });

  it("deletes a category and leaves its recipes without category", () => {
    store().deleteRecipeCategory("budines");
    expect(ids(store().recipeCategories)).toEqual(["cookies"]);
    const b1 = store().getRecipe("b1");
    expect(b1).not.toHaveProperty("categoryId");
    // Not an edit of the recipe: its date stays.
    expect(b1.updatedAt).toBe(1000);
    expect(store().getRecipe("c1").categoryId).toBe("cookies");
  });

  it("imports categories merged by id", () => {
    store().importData({
      recipeCategories: [
        { id: "cookies", name: "Galletitas" },
        { id: "trufas", name: "Trufas" },
      ],
    });
    expect(store().recipeCategories).toEqual([
      { id: "budines", name: "Budines" },
      { id: "cookies", name: "Galletitas" },
      { id: "trufas", name: "Trufas" },
    ]);
  });
});

describe("importing categories", () => {
  it("reuses a category with the same name instead of duplicating it", () => {
    store().importData({
      recipeCategories: [
        { id: "otro-id", name: "budines" },
        { id: "trufas", name: "Trufas" },
      ],
      recipes: [recipe("b9", "otro-id"), recipe("t1", "trufas")],
    });
    expect(store().recipeCategories).toEqual([
      { id: "budines", name: "Budines" },
      { id: "cookies", name: "Cookies" },
      { id: "trufas", name: "Trufas" },
    ]);
    expect(store().getRecipe("b9").categoryId).toBe("budines");
    expect(store().getRecipe("t1").categoryId).toBe("trufas");
  });
});

describe("custom order inside a category", () => {
  it("moves a recipe past the next one of its own category", () => {
    store().moveRecipe("b1", 1);
    expect(ids(store().recipes)).toEqual(["b2", "c1", "b1", "c2"]);
    store().moveRecipe("c2", -1);
    expect(ids(store().recipes)).toEqual(["b2", "c2", "b1", "c1"]);
  });

  it("stays put at the edges of its category", () => {
    const before = store().recipes;
    store().moveRecipe("b1", -1);
    store().moveRecipe("c2", 1);
    expect(store().recipes).toBe(before);
  });

  it("drops a recipe on another of its category, never across categories", () => {
    const before = store().recipes;
    store().reorderRecipes("b1", "c2");
    expect(store().recipes).toBe(before);
    store().reorderRecipes("b2", "b1");
    expect(ids(store().recipes)).toEqual(["b2", "b1", "c1", "c2"]);
  });

  it("treats recipes without category (or an unknown one) as one group", () => {
    useRecipeStore.setState({
      recipes: [recipe("x"), recipe("b1", "budines"), recipe("y", "gone")],
    });
    store().moveRecipe("x", 1);
    expect(ids(store().recipes)).toEqual(["y", "b1", "x"]);
  });
});
