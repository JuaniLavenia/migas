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

export function recipeTotals(recipe, ingredients) {
  const items = Array.isArray(recipe.items) ? recipe.items : [];
  const cost =
    items.reduce((total, item) => {
      const ingredient = ingredients.find(
        (entry) => entry.id === item.ingredientId,
      );
      return (
        total + (ingredient ? ingredientCost(ingredient, item.quantity) : 0)
      );
    }, 0) + Number(recipe.extras || 0);
  const unitCost = cost / Math.max(Number(recipe.yield) || 1, 1);
  return {
    cost,
    unitCost,
    price: unitCost * (1 + Number(recipe.margin || 0) / 100),
  };
}
