import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { moveItem } from "../lib/listing";
import { todayKey } from "../lib/orders";
import {
  applyMove,
  cancelMove,
  planPreparation,
  stockTransition,
  undoMove,
} from "../lib/stockMoves";

// The business data in memory. It starts empty: after sign-in the session
// (src/app/session) loads it from the cloud and cloudSync saves every change
// back, so these actions stay plain state updates.

function mergeById(current, incoming) {
  const merged = [...current];
  incoming.forEach((item) => {
    const index = merged.findIndex((existing) => existing.id === item.id);
    if (index === -1) merged.push(item);
    else merged[index] = { ...merged[index], ...item };
  });
  return merged;
}

// The stored array order is the user's custom order. These return the same
// array when nothing moves (unknown ids, edges), so no update is persisted.
function reorderById(list, activeId, overId) {
  const fromIndex = list.findIndex((item) => item.id === activeId);
  const toIndex = list.findIndex((item) => item.id === overId);
  if (toIndex === -1) return list;
  return moveItem(list, fromIndex, toIndex);
}

// Custom order of recipes lives inside each category: moves and drops only
// swap places with recipes of the same group. A missing or unknown categoryId
// is the "no category" group.
function groupOf(recipe, categories) {
  return categories.some((category) => category.id === recipe.categoryId)
    ? recipe.categoryId
    : "";
}

function reorderWithinGroup(recipes, categories, activeId, overId) {
  const active = recipes.find((recipe) => recipe.id === activeId);
  const over = recipes.find((recipe) => recipe.id === overId);
  if (!active || !over) return recipes;
  if (groupOf(active, categories) !== groupOf(over, categories)) return recipes;
  return reorderById(recipes, activeId, overId);
}

function moveWithinGroup(recipes, categories, id, delta) {
  const fromIndex = recipes.findIndex((recipe) => recipe.id === id);
  if (fromIndex === -1) return recipes;
  const group = groupOf(recipes[fromIndex], categories);
  let toIndex = fromIndex + delta;
  while (
    toIndex >= 0 &&
    toIndex < recipes.length &&
    groupOf(recipes[toIndex], categories) !== group
  ) {
    toIndex += delta;
  }
  if (toIndex < 0 || toIndex >= recipes.length) return recipes;
  // Swap, so recipes of other categories keep their positions.
  const next = [...recipes];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

function sameName(a, b) {
  return a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
}

function moveById(list, id, delta) {
  const fromIndex = list.findIndex((item) => item.id === id);
  const toIndex = fromIndex + delta;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= list.length) return list;
  return moveItem(list, fromIndex, toIndex);
}

const useRecipeStore = create()((set, get) => ({
  ingredients: [],
  recipes: [],
  recipeCategories: [],
  packaging: [],
  orders: [],
  finishedGoods: [],
  addIngredient: (ingredient) =>
    set((state) => ({
      ingredients: [...state.ingredients, { ...ingredient, id: uuidv4() }],
    })),
  updateIngredient: (id, ingredient) =>
    set((state) => ({
      ingredients: state.ingredients.map((item) =>
        item.id === id ? { ...item, ...ingredient } : item,
      ),
    })),
  deleteIngredient: (id) =>
    set((state) => ({
      ingredients: state.ingredients.filter((item) => item.id !== id),
    })),
  addPackaging: (item) =>
    set((state) => ({
      packaging: [...state.packaging, { ...item, id: uuidv4() }],
    })),
  updatePackaging: (id, changes) =>
    set((state) => ({
      packaging: state.packaging.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    })),
  deletePackaging: (id) =>
    set((state) => ({
      packaging: state.packaging.filter((item) => item.id !== id),
    })),
  reorderPackaging: (activeId, overId) =>
    set((state) => ({
      packaging: reorderById(state.packaging, activeId, overId),
    })),
  movePackaging: (id, delta) =>
    set((state) => ({
      packaging: moveById(state.packaging, id, delta),
    })),
  // New orders start as Pendiente. Returns the new id.
  addOrder: (order) => {
    const nextOrder = {
      ...order,
      id: uuidv4(),
      status: "pending",
      createdAt: Date.now(),
    };
    set((state) => ({ orders: [...state.orders, nextOrder] }));
    return nextOrder.id;
  },
  updateOrder: (id, changes) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === id ? { ...order, ...changes } : order,
      ),
    })),
  deleteOrder: (id) =>
    set((state) => ({
      orders: state.orders.filter((order) => order.id !== id),
    })),
  // Changes an order's status and, in the same update, its effect on the
  // stock (lib/stockMoves.js): preparing deducts, going back returns it,
  // cancelling keeps what was cooked as finished goods. Returns { ok: true },
  // or { ok: false, shortages, problems } and changes nothing when the
  // stock is not enough or a line's recipe or packaging was deleted.
  changeOrderStatus: (id, status, today = todayKey()) => {
    const state = get();
    const order = state.orders.find((entry) => entry.id === id);
    if (!order || order.status === status) return { ok: true };
    const data = {
      recipes: state.recipes,
      ingredients: state.ingredients,
      packaging: state.packaging,
      finishedGoods: state.finishedGoods,
    };
    const transition = stockTransition(order.status, status, Boolean(order.stockMove));
    let stock = {};
    let stockMove = order.stockMove;
    if (transition === "deduct") {
      const plan = planPreparation(order, data, today, uuidv4);
      if (plan.shortages.length || plan.problems.length) {
        return { ok: false, shortages: plan.shortages, problems: plan.problems };
      }
      stock = applyMove(data, plan.move);
      stockMove = plan.move;
    } else if (transition === "undo" || transition === "cancel") {
      const revert = transition === "undo" ? undoMove : cancelMove;
      stock = revert(data, order.stockMove, today, uuidv4);
      stockMove = undefined;
    }
    set({
      ...stock,
      orders: state.orders.map((entry) => {
        if (entry.id !== id) return entry;
        const { stockMove: _previous, ...rest } = entry;
        return stockMove ? { ...rest, status, stockMove } : { ...rest, status };
      }),
    });
    return { ok: true };
  },
  // A batch she cooked outside an order, or a correction. Returns its id.
  addFinishedGood: (lot) => {
    const id = uuidv4();
    set((state) => ({ finishedGoods: [...state.finishedGoods, { ...lot, id }] }));
    return id;
  },
  updateFinishedGood: (id, changes) =>
    set((state) => ({
      finishedGoods: state.finishedGoods.map((lot) =>
        lot.id === id ? { ...lot, ...changes } : lot,
      ),
    })),
  deleteFinishedGood: (id) =>
    set((state) => ({
      finishedGoods: state.finishedGoods.filter((lot) => lot.id !== id),
    })),
  addRecipe: (recipe) => {
    const nextRecipe = { ...recipe, id: uuidv4(), updatedAt: Date.now() };
    set((state) => ({ recipes: [...state.recipes, nextRecipe] }));
    return nextRecipe.id;
  },
  // A change to undefined removes that field (e.g. an unset sale price).
  updateRecipe: (id, changes) =>
    set((state) => ({
      recipes: state.recipes.map((recipe) => {
        if (recipe.id !== id) return recipe;
        const next = { ...recipe, ...changes, updatedAt: Date.now() };
        Object.keys(changes).forEach((key) => {
          if (changes[key] === undefined) delete next[key];
        });
        return next;
      }),
    })),
  deleteRecipe: (id) =>
    set((state) => ({
      recipes: state.recipes.filter((recipe) => recipe.id !== id),
    })),
  // Reordering is not an edit: recipes keep their updatedAt.
  reorderIngredients: (activeId, overId) =>
    set((state) => ({
      ingredients: reorderById(state.ingredients, activeId, overId),
    })),
  moveIngredient: (id, delta) =>
    set((state) => ({
      ingredients: moveById(state.ingredients, id, delta),
    })),
  reorderRecipes: (activeId, overId) =>
    set((state) => ({
      recipes: reorderWithinGroup(
        state.recipes,
        state.recipeCategories,
        activeId,
        overId,
      ),
    })),
  moveRecipe: (id, delta) =>
    set((state) => ({
      recipes: moveWithinGroup(
        state.recipes,
        state.recipeCategories,
        id,
        delta,
      ),
    })),
  // Returns the id of the category with that name (an existing one when
  // the name repeats, ignoring case and accents), or null for a blank name.
  addRecipeCategory: (name) => {
    const clean = String(name ?? "").trim();
    if (!clean) return null;
    const existing = get().recipeCategories.find((category) =>
      sameName(category.name, clean),
    );
    if (existing) return existing.id;
    const id = uuidv4();
    set((state) => ({
      recipeCategories: [...state.recipeCategories, { id, name: clean }],
    }));
    return id;
  },
  renameRecipeCategory: (id, name) => {
    const clean = String(name ?? "").trim();
    if (!clean) return;
    set((state) => ({
      recipeCategories: state.recipeCategories.map((category) =>
        category.id === id ? { ...category, name: clean } : category,
      ),
    }));
  },
  // Its recipes stay, without category. Not an edit: they keep updatedAt.
  deleteRecipeCategory: (id) =>
    set((state) => ({
      recipeCategories: state.recipeCategories.filter(
        (category) => category.id !== id,
      ),
      recipes: state.recipes.map((recipe) => {
        if (recipe.categoryId !== id) return recipe;
        const { categoryId: _removed, ...rest } = recipe;
        return rest;
      }),
    })),
  getRecipe: (id) => get().recipes.find((recipe) => recipe.id === id),
  // Merges by id. A category whose name already exists (from another device,
  // with another id) is not duplicated: its recipes move to the existing one.
  importData: ({
    ingredients = [],
    recipes = [],
    recipeCategories = [],
    packaging = [],
    orders = [],
    finishedGoods = [],
  }) =>
    set((state) => {
      const renamed = new Map();
      const newCategories = [];
      recipeCategories.forEach((item) => {
        const id = item.id || uuidv4();
        const sameId = state.recipeCategories.some((category) => category.id === id);
        const sameNamed = state.recipeCategories.find((category) =>
          sameName(category.name, item.name),
        );
        if (!sameId && sameNamed) renamed.set(id, sameNamed.id);
        else newCategories.push({ ...item, id });
      });
      return {
        recipeCategories: mergeById(state.recipeCategories, newCategories),
        ingredients: mergeById(
          state.ingredients,
          ingredients.map((item) => ({ ...item, id: item.id || uuidv4() })),
        ),
        packaging: mergeById(
          state.packaging,
          packaging.map((item) => ({ ...item, id: item.id || uuidv4() })),
        ),
        finishedGoods: mergeById(
          state.finishedGoods,
          finishedGoods.map((lot) => ({ ...lot, id: lot.id || uuidv4() })),
        ),
        orders: mergeById(
          state.orders,
          orders.map((order) => ({ ...order, id: order.id || uuidv4() })),
        ),
        recipes: mergeById(
          state.recipes,
          recipes.map((recipe) => ({
            ...recipe,
            id: recipe.id || uuidv4(),
            ...(renamed.has(recipe.categoryId)
              ? { categoryId: renamed.get(recipe.categoryId) }
              : {}),
          })),
        ),
      };
    }),
}));

export default useRecipeStore;
