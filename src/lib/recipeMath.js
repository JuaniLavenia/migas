// Cost of one base unit (g, ml, un), or null when the pack size is not a
// positive number: the price is unknown, not free and not Infinity.
export function unitPrice(ingredient) {
  const packSize = Number(ingredient.packSize);
  if (!Number.isFinite(packSize) || packSize <= 0) return null;
  return Number(ingredient.packCost || 0) / packSize;
}

// An ingredient without a unit price contributes 0; recipeTotals reports
// those lines as invalid.
export function ingredientCost(ingredient, quantity) {
  const price = unitPrice(ingredient);
  return price === null ? 0 : Number(quantity) * price;
}

function recipeItems(recipe) {
  return Array.isArray(recipe?.items) ? recipe.items : [];
}

// id → ingredient. A repeated id keeps its first ingredient, as Array#find
// would.
export function indexIngredients(ingredients) {
  const byId = new Map();
  for (const ingredient of ingredients) {
    if (!byId.has(ingredient.id)) byId.set(ingredient.id, ingredient);
  }
  return byId;
}

// missingCount: lines whose ingredient was deleted or has no unit price.
// They cost 0, so the UI must warn that the total is incomplete. Callers
// computing totals for many recipes pass a prebuilt `byId` index.
export function recipeTotals(
  recipe,
  ingredients,
  byId = indexIngredients(ingredients),
) {
  let missingCount = 0;
  const cost =
    recipeItems(recipe).reduce((total, item) => {
      const ingredient = byId.get(item.ingredientId);
      if (!ingredient || unitPrice(ingredient) === null) {
        missingCount += 1;
        return total;
      }
      return total + ingredientCost(ingredient, item.quantity);
    }, 0) + Number(recipe.extras || 0);
  const unitCost = cost / Math.max(Number(recipe.yield) || 1, 1);
  return {
    cost,
    unitCost,
    price: unitCost * (1 + Number(recipe.margin || 0) / 100),
    missingCount,
  };
}

export function countRecipesUsingIngredient(recipes, ingredientId) {
  return recipes.filter((recipe) =>
    recipeItems(recipe).some((item) => item.ingredientId === ingredientId),
  ).length;
}
