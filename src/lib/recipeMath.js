export function ingredientCost(ingredient, quantity) {
  return (
    (Number(quantity) / Number(ingredient.packSize || 1)) *
    Number(ingredient.packCost || 0)
  );
}

export function recipeTotals(recipe, ingredients) {
  const cost =
    recipe.items.reduce((total, item) => {
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
