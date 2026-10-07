// Pure helpers to edit a recipe's `items` ({ ingredientId, quantity }). Each
// returns a new array; callers store it however they keep the recipe.

// The quantity is stored as a number; other fields as given.
export function updateItemAt(items, index, field, value) {
  return items.map((item, itemIndex) =>
    itemIndex === index
      ? { ...item, [field]: field === "quantity" ? Number(value) : value }
      : item,
  );
}

// Appends the first ingredient not used yet (the first ingredient when all
// are used) with quantity 0. Without ingredients it returns `items` itself.
export function addNextItem(items, ingredients) {
  const used = new Set(items.map((item) => item.ingredientId));
  const next =
    ingredients.find((ingredient) => !used.has(ingredient.id)) ||
    ingredients[0];
  if (!next) return items;
  return [...items, { ingredientId: next.id, quantity: 0 }];
}

export function removeItemAt(items, index) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}
