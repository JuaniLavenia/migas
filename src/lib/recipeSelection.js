// Resolves the recipe the UI should show and edit. The stored selection can
// point to a recipe that no longer exists (deleted, never existed, or not set
// yet), so every caller must use this effective recipe, never the raw id.
export function resolveSelectedRecipe(recipes, selectedId) {
  if (!Array.isArray(recipes) || recipes.length === 0) return null;
  return recipes.find((recipe) => recipe.id === selectedId) ?? recipes[0];
}
