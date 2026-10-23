import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import {
  RECIPE_STORAGE_KEY,
  RECIPE_STORAGE_VERSION,
  createSafeStorage,
  migrateRecipeState,
} from "../lib/recipeStorage";
import { moveItem } from "../lib/listing";
import { reportSaveResult } from "./useSaveStatusStore";

const demoIngredients = [
  {
    id: "harina",
    name: "Harina 0000",
    category: "Secos",
    unit: "g",
    packSize: 1000,
    packCost: 1250,
  },
  {
    id: "manteca",
    name: "Manteca",
    category: "Lácteos",
    unit: "g",
    packSize: 200,
    packCost: 2100,
  },
  {
    id: "azucar",
    name: "Azúcar",
    category: "Secos",
    unit: "g",
    packSize: 1000,
    packCost: 980,
  },
  {
    id: "huevos",
    name: "Huevos",
    category: "Frescos",
    unit: "un",
    packSize: 12,
    packCost: 2400,
  },
  {
    id: "chocolate",
    name: "Chocolate cobertura",
    category: "Chocolates",
    unit: "g",
    packSize: 500,
    packCost: 4600,
  },
];

const DAY = 24 * 60 * 60 * 1000;

const demoRecipes = [
  {
    id: "cookies",
    name: "Cookies de chocolate",
    yield: 18,
    margin: 65,
    extras: 180,
    updatedAt: Date.now(),
    items: [
      { ingredientId: "harina", quantity: 280 },
      { ingredientId: "manteca", quantity: 120 },
      { ingredientId: "azucar", quantity: 160 },
      { ingredientId: "huevos", quantity: 2 },
      { ingredientId: "chocolate", quantity: 180 },
    ],
  },
  {
    id: "brownie",
    name: "Brownie clásico",
    yield: 12,
    margin: 55,
    extras: 250,
    updatedAt: Date.now() - DAY,
    items: [
      { ingredientId: "harina", quantity: 180 },
      { ingredientId: "manteca", quantity: 150 },
      { ingredientId: "azucar", quantity: 220 },
      { ingredientId: "huevos", quantity: 4 },
      { ingredientId: "chocolate", quantity: 250 },
    ],
  },
];

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

const useRecipeStore = create()(
  persist(
    (set, get) => ({
      ingredients: demoIngredients,
      recipes: demoRecipes,
      recipeCategories: [],
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
      // Changing the photo is an edit: it refreshes updatedAt. null removes
      // the reference; deleting the image itself is up to the caller.
      setRecipeImage: (id, imageId) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id !== id) return recipe;
            const { imageId: _previous, ...rest } = recipe;
            return imageId
              ? { ...rest, imageId, updatedAt: Date.now() }
              : { ...rest, updatedAt: Date.now() };
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
      importData: ({ ingredients = [], recipes = [], recipeCategories = [] }) =>
        set((state) => ({
          recipeCategories: mergeById(
            state.recipeCategories,
            recipeCategories.map((item) => ({ ...item, id: item.id || uuidv4() })),
          ),
          ingredients: mergeById(
            state.ingredients,
            ingredients.map((item) => ({ ...item, id: item.id || uuidv4() })),
          ),
          recipes: mergeById(
            state.recipes,
            recipes.map((recipe) => ({ ...recipe, id: recipe.id || uuidv4() })),
          ),
        })),
    }),
    {
      name: RECIPE_STORAGE_KEY,
      version: RECIPE_STORAGE_VERSION,
      migrate: migrateRecipeState,
      // Only the data is persisted; actions and derived state are rebuilt.
      partialize: ({ ingredients, recipes, recipeCategories }) => ({
        ingredients,
        recipes,
        recipeCategories,
      }),
      storage: createJSONStorage(() =>
        createSafeStorage(() => window.localStorage, reportSaveResult),
      ),
    },
  ),
);

export default useRecipeStore;
