// Sample data: the tests' starting state (src/test/renderApp.jsx). The app
// itself starts empty and loads the business data from the cloud.

export const demoIngredientCategories = [
  { id: "secos", name: "Secos" },
  { id: "lacteos", name: "Lácteos" },
  { id: "frescos", name: "Frescos" },
  { id: "chocolates", name: "Chocolates" },
  { id: "decoracion", name: "Decoración" },
  { id: "otros", name: "Otros" },
];

export const demoIngredients = [
  {
    id: "harina",
    name: "Harina 0000",
    categoryId: "secos",
    unit: "g",
    packSize: 1000,
    packCost: 1250,
  },
  {
    id: "manteca",
    name: "Manteca",
    categoryId: "lacteos",
    unit: "g",
    packSize: 200,
    packCost: 2100,
  },
  {
    id: "azucar",
    name: "Azúcar",
    categoryId: "secos",
    unit: "g",
    packSize: 1000,
    packCost: 980,
  },
  {
    id: "huevos",
    name: "Huevos",
    categoryId: "frescos",
    unit: "un",
    packSize: 12,
    packCost: 2400,
  },
  {
    id: "chocolate",
    name: "Chocolate cobertura",
    categoryId: "chocolates",
    unit: "g",
    packSize: 500,
    packCost: 4600,
  },
];

const DAY = 24 * 60 * 60 * 1000;

export const demoRecipes = [
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
