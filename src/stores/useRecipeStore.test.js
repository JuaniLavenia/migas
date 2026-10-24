// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useRecipeStore from "./useRecipeStore";

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

describe("useRecipeStore ingredient stock", () => {
  beforeEach(() => {
    useRecipeStore.setState({
      ingredients: [{ ...ingredient, stock: 800 }],
      recipes: [],
      recipeCategories: [],
    });
  });

  it("keeps the stock when an import does not bring one", () => {
    useRecipeStore.getState().importData({
      ingredients: [{ ...ingredient, packCost: 950 }],
    });
    expect(useRecipeStore.getState().ingredients).toEqual([
      { ...ingredient, packCost: 950, stock: 800 },
    ]);
  });

  it("takes the stock an import brings", () => {
    useRecipeStore.getState().importData({
      ingredients: [{ ...ingredient, stock: 300 }],
    });
    expect(useRecipeStore.getState().ingredients[0].stock).toBe(300);
  });
});

describe("useRecipeStore orders", () => {
  const order = {
    client: "Sofi",
    contact: "",
    dueDate: "2026-10-25",
    dueTime: "",
    delivery: "pickup",
    notes: "",
    items: [{ recipeId: "flan", quantity: 2 }],
    packagingItems: [],
    price: 12000,
    paid: 0,
  };

  beforeEach(() => {
    useRecipeStore.setState({ orders: [] });
  });

  it("creates an order as Pendiente, with its creation date, and returns its id", () => {
    vi.spyOn(Date, "now").mockReturnValue(1767225600000);
    const id = useRecipeStore.getState().addOrder(order);
    vi.restoreAllMocks();
    expect(useRecipeStore.getState().orders).toEqual([
      { ...order, id, status: "pending", createdAt: 1767225600000 },
    ]);
  });

  it("edits, changes the status of and deletes an order", () => {
    const id = useRecipeStore.getState().addOrder(order);
    useRecipeStore.getState().updateOrder(id, { price: 13000, status: "ready" });
    expect(useRecipeStore.getState().orders[0]).toMatchObject({
      client: "Sofi",
      price: 13000,
      status: "ready",
    });
    useRecipeStore.getState().deleteOrder(id);
    expect(useRecipeStore.getState().orders).toEqual([]);
  });

  it("merges the orders an import brings", () => {
    useRecipeStore.setState({ orders: [{ ...order, id: "a", status: "confirmed" }] });
    useRecipeStore.getState().importData({
      orders: [
        { ...order, id: "a", status: "delivered" },
        { ...order, id: "b", status: "pending" },
      ],
    });
    expect(
      useRecipeStore.getState().orders.map(({ id, status }) => [id, status]),
    ).toEqual([
      ["a", "delivered"],
      ["b", "pending"],
    ]);
  });
});

describe("useRecipeStore automatic stock", () => {
  const harina = { id: "harina", name: "Harina", category: "Secos", unit: "g", packSize: 1000, packCost: 1000, stock: 1500 };
  const cookies = {
    id: "cookies",
    name: "Cookies",
    yield: 21,
    margin: 0,
    extras: 0,
    items: [{ ingredientId: "harina", quantity: 1000 }],
  };
  const box = { id: "box", name: "Box x8", packSize: 10, packCost: 9000, stock: 3 };
  const pedido = {
    id: "o",
    client: "Sofi",
    dueDate: "2026-10-25",
    items: [{ recipeId: "cookies", quantity: 16 }],
    packagingItems: [{ packagingId: "box", quantity: 2 }],
    price: 0,
    paid: 0,
    status: "confirmed",
  };
  const lote = { id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" };
  const change = (status, today = "2026-10-23") =>
    useRecipeStore.getState().changeOrderStatus("o", status, today);

  beforeEach(() => {
    useRecipeStore.setState({
      ingredients: [harina],
      recipes: [cookies],
      packaging: [box],
      finishedGoods: [lote],
      orders: [pedido],
    });
  });

  it("deducts by full batches when preparing and keeps what it deducted", () => {
    expect(change("preparing")).toEqual({ ok: true });
    const state = useRecipeStore.getState();
    expect(state.orders[0].status).toBe("preparing");
    expect(state.orders[0].stockMove).toMatchObject({
      ingredients: [{ ingredientId: "harina", quantity: 1000 }],
      packaging: [{ packagingId: "box", quantity: 2 }],
      taken: [{ lotId: "lote", quantity: 5 }],
    });
    expect(state.ingredients[0].stock).toBe(500);
    expect(state.packaging[0].stock).toBe(1);
    expect(state.finishedGoods).toEqual([
      expect.objectContaining({ recipeId: "cookies", quantity: 10, madeAt: "2026-10-23" }),
    ]);
    // Between prepared states nothing moves again.
    expect(change("ready")).toEqual({ ok: true });
    expect(useRecipeStore.getState().ingredients[0].stock).toBe(500);
  });

  it("does not change anything when the stock is not enough", () => {
    useRecipeStore.setState({ packaging: [{ ...box, stock: 1 }] });
    const before = useRecipeStore.getState();
    expect(change("preparing")).toEqual({
      ok: false,
      shortages: [{ kind: "packaging", id: "box", name: "Box x8", unit: "un", need: 2, have: 1, missing: 1 }],
      problems: [],
    });
    const after = useRecipeStore.getState();
    expect(after.orders).toBe(before.orders);
    expect(after.ingredients).toBe(before.ingredients);
    expect(after.finishedGoods).toBe(before.finishedGoods);
  });

  it("returns everything when the order goes back", () => {
    change("preparing");
    expect(change("confirmed")).toEqual({ ok: true });
    const state = useRecipeStore.getState();
    expect(state.orders[0].status).toBe("confirmed");
    expect(state.orders[0]).not.toHaveProperty("stockMove");
    expect(state.ingredients[0].stock).toBe(1500);
    expect(state.packaging[0].stock).toBe(3);
    expect(state.finishedGoods).toEqual([lote]);
  });

  it("keeps what was cooked as finished goods when the order is cancelled", () => {
    change("preparing");
    expect(change("cancelled", "2026-10-24")).toEqual({ ok: true });
    const state = useRecipeStore.getState();
    expect(state.orders[0]).not.toHaveProperty("stockMove");
    expect(state.ingredients[0].stock).toBe(500);
    expect(state.packaging[0].stock).toBe(3);
    expect(
      state.finishedGoods.map(({ quantity, madeAt }) => [quantity, madeAt]),
    ).toEqual([
      [10, "2026-10-23"],
      [5, "2026-10-20"],
      [11, "2026-10-24"],
    ]);
  });

  it("only changes the status when there is nothing to deduct or return", () => {
    expect(change("pending")).toEqual({ ok: true });
    expect(useRecipeStore.getState().orders[0].status).toBe("pending");
    expect(useRecipeStore.getState().ingredients[0].stock).toBe(1500);
  });

  it("adds, edits and discards finished goods by hand", () => {
    const id = useRecipeStore
      .getState()
      .addFinishedGood({ recipeId: "cookies", quantity: 8, madeAt: "2026-10-22" });
    useRecipeStore.getState().updateFinishedGood(id, { quantity: 6 });
    expect(useRecipeStore.getState().finishedGoods.at(-1)).toEqual({
      id,
      recipeId: "cookies",
      quantity: 6,
      madeAt: "2026-10-22",
    });
    useRecipeStore.getState().deleteFinishedGood("lote");
    expect(useRecipeStore.getState().finishedGoods.map((lot) => lot.id)).toEqual([id]);
  });
});
