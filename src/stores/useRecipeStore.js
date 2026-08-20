import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

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

const demoRecipes = [
  {
    id: "cookies",
    name: "Cookies de chocolate",
    yield: 18,
    margin: 65,
    extras: 180,
    updated: "Hoy",
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
    updated: "Ayer",
    items: [
      { ingredientId: "harina", quantity: 180 },
      { ingredientId: "manteca", quantity: 150 },
      { ingredientId: "azucar", quantity: 220 },
      { ingredientId: "huevos", quantity: 4 },
      { ingredientId: "chocolate", quantity: 250 },
    ],
  },
];

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
        const nextRecipe = { ...recipe, id: uuidv4() };
        set((state) => ({ recipes: [...state.recipes, nextRecipe] }));
        return nextRecipe.id;
      },
      updateRecipe: (id, changes) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id
              ? { ...recipe, ...changes, updated: "Ahora" }
              : recipe,
          ),
        })),
      getRecipe: (id) => get().recipes.find((recipe) => recipe.id === id),
    }),
    { name: "miga-recipe-storage" },
  ),
);

export default useRecipeStore;
