import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import {
  RECIPE_STORAGE_KEY,
  RECIPE_STORAGE_VERSION,
  createSafeStorage,
  migrateRecipeState,
} from "../lib/recipeStorage";
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
    category: "Repostería",
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

const useRecipeStore = create()(
  persist(
    (set, get) => ({
      ingredients: demoIngredients,
      recipes: demoRecipes,
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
      updateRecipe: (id, changes) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id
              ? { ...recipe, ...changes, updatedAt: Date.now() }
              : recipe,
          ),
        })),
      deleteRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter((recipe) => recipe.id !== id),
        })),
      getRecipe: (id) => get().recipes.find((recipe) => recipe.id === id),
      importData: ({ ingredients = [], recipes = [] }) =>
        set((state) => ({
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
      partialize: ({ ingredients, recipes }) => ({ ingredients, recipes }),
      storage: createJSONStorage(() =>
        createSafeStorage(() => window.localStorage, reportSaveResult),
      ),
    },
  ),
);

export default useRecipeStore;
