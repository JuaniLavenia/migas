// Format of the data an earlier version of the app kept in the browser
// (before it moved to the cloud). The manual upload (src/lib/localData.js)
// and the ErrorBoundary read it through this key.
export const RECIPE_STORAGE_KEY = "miga-recipe-storage";

// Last version the app wrote to the browser; older data is upgraded with
// migrateRecipeState.
export const RECIPE_STORAGE_VERSION = 2;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Upgrades persisted data from `fromVersion` to RECIPE_STORAGE_VERSION. The
// result is merged over the store defaults, so a collection left out (missing
// or malformed) keeps its default instead of crashing the app.
//
// v0 (unversioned): the whole state was persisted and recipes carried an
// `updated` display label ("Hoy", "Ayer", "Ahora"). Those labels were
// relative to when they were written, so they cannot become real dates:
// every v0 recipe gets `updatedAt` = migration time and the label is dropped.
//
// v2 added `recipeCategories` and the optional recipe fields `categoryId` and
// `salePrice`: v1 data is valid v2 data, and the categories start empty.
export function migrateRecipeState(persisted, fromVersion, now = Date.now()) {
  if (!isObject(persisted)) return {};
  const state = {};
  if (Array.isArray(persisted.ingredients)) {
    state.ingredients = persisted.ingredients;
  }
  if (Array.isArray(persisted.recipeCategories)) {
    state.recipeCategories = persisted.recipeCategories;
  }
  if (Array.isArray(persisted.recipes)) {
    state.recipes =
      fromVersion < 1
        ? persisted.recipes.map((recipe) => datedRecipe(recipe, now))
        : persisted.recipes;
  }
  return state;
}

function datedRecipe(recipe, now) {
  if (!isObject(recipe)) return recipe;
  const { updated, ...rest } = recipe;
  return Number.isFinite(rest.updatedAt) ? rest : { ...rest, updatedAt: now };
}
