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

describe("ingredient categories", () => {
  const ingredient = (id, extra = {}) => ({
    id,
    name: id,
    unit: "g",
    packSize: 1,
    packCost: 1,
    ...extra,
  });

  beforeEach(() => {
    useRecipeStore.setState({
      ingredientCategories: [
        { id: "secos", name: "Secos" },
        { id: "lacteos", name: "Lácteos" },
      ],
      ingredients: [
        ingredient("harina", { categoryId: "secos" }),
        ingredient("manteca", { categoryId: "lacteos" }),
        ingredient("azucar", { categoryId: "secos" }),
      ],
    });
  });

  it("adds a category and returns its id; a repeated name reuses it", () => {
    const id = store().addIngredientCategory("  Frutas ");
    expect(store().ingredientCategories.at(-1)).toEqual({ id, name: "Frutas" });
    expect(store().addIngredientCategory("lacteos")).toBe("lacteos");
    expect(store().addIngredientCategory("   ")).toBeNull();
    expect(store().ingredientCategories).toHaveLength(3);
  });

  it("renames a category, ignoring blank names", () => {
    store().renameIngredientCategory("secos", " Almacén ");
    store().renameIngredientCategory("lacteos", "  ");
    expect(store().ingredientCategories).toEqual([
      { id: "secos", name: "Almacén" },
      { id: "lacteos", name: "Lácteos" },
    ]);
  });

  it("deletes a category and leaves its ingredients without category", () => {
    const manteca = store().ingredients[1];
    store().deleteIngredientCategory("secos");
    expect(store().ingredientCategories).toEqual([{ id: "lacteos", name: "Lácteos" }]);
    expect(store().ingredients.map((item) => item.categoryId)).toEqual([
      undefined,
      "lacteos",
      undefined,
    ]);
    expect(store().ingredients[0]).not.toHaveProperty("categoryId");
    // Untouched ingredients keep their identity, so nothing else is saved.
    expect(store().ingredients[1]).toBe(manteca);
  });

  it("does not bring the ingredients back when the category is created again", () => {
    store().deleteIngredientCategory("secos");
    const id = store().addIngredientCategory("Secos");
    expect(id).not.toBe("secos");
    expect(store().ingredients.filter((item) => item.categoryId === id)).toEqual([]);
  });

  it("imports categories merged by name, moving the ingredients to the existing one", () => {
    store().importData({
      ingredientCategories: [
        { id: "otro-secos", name: "secos" },
        { id: "frutas", name: "Frutas" },
      ],
      ingredients: [
        ingredient("pasas", { categoryId: "otro-secos" }),
        ingredient("nueces", { categoryId: "frutas" }),
      ],
    });
    expect(store().ingredientCategories).toEqual([
      { id: "secos", name: "Secos" },
      { id: "lacteos", name: "Lácteos" },
      { id: "frutas", name: "Frutas" },
    ]);
    expect(store().ingredients.slice(3).map((item) => [item.id, item.categoryId])).toEqual([
      ["pasas", "secos"],
      ["nueces", "frutas"],
    ]);
  });

  it("imports an old backup's category names into categories", () => {
    store().importData({
      ingredients: [
        ingredient("pasas", { category: "lácteos" }),
        ingredient("chispas", { category: "Toppings" }),
        ingredient("granas", { category: "toppings" }),
        ingredient("sal"),
      ],
    });
    const toppings = store().ingredientCategories.find((item) => item.name === "Toppings");
    expect(store().ingredientCategories).toHaveLength(3);
    expect(store().ingredients.slice(3).map((item) => [item.id, item.categoryId])).toEqual([
      ["pasas", "lacteos"],
      ["chispas", toppings.id],
      ["granas", toppings.id],
      ["sal", undefined],
    ]);
    expect(store().ingredients.some((item) => "category" in item)).toBe(false);
  });
});
