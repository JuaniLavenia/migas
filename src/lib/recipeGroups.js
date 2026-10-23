// Id of the "Sin categoría" group: recipes without a category, or whose
// category no longer exists.
export const UNCATEGORIZED = "";

// Splits `recipes` (already sorted) into groups in the categories' order,
// keeping the given order inside each group. Groups without recipes are left
// out and "Sin categoría" goes last.
export function groupRecipes(recipes, categories) {
  const known = new Set(categories.map((category) => category.id));
  const byGroup = new Map();
  recipes.forEach((recipe) => {
    const id = known.has(recipe.categoryId) ? recipe.categoryId : UNCATEGORIZED;
    if (!byGroup.has(id)) byGroup.set(id, []);
    byGroup.get(id).push(recipe);
  });
  const groups = categories
    .filter((category) => byGroup.has(category.id))
    .map((category) => ({
      id: category.id,
      name: category.name,
      recipes: byGroup.get(category.id),
    }));
  if (byGroup.has(UNCATEGORIZED)) {
    groups.push({
      id: UNCATEGORIZED,
      name: "Sin categoría",
      recipes: byGroup.get(UNCATEGORIZED),
    });
  }
  return groups;
}
