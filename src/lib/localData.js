import { sanitizeBackup } from "./backup";
import { RECIPE_STORAGE_KEY, migrateRecipeState } from "./recipeStorage";

// Records whose name was erased in the editor get one, so they are not lost.
function named(list) {
  if (!Array.isArray(list)) return [];
  return list.map((record) =>
    record && typeof record === "object" && !String(record.name ?? "").trim()
      ? { ...record, name: "Sin nombre" }
      : record,
  );
}

// The data an earlier version of the app kept in this browser, ready for the
// manual first upload: { data: { recipeCategories, ingredients, recipes },
// summary: { recipes, ingredients, categories, photos, lastChange, skipped } }, or
// null when there is nothing (or it cannot be read). Records go through the
// backup validation, so only valid ones are uploaded; local photos (an
// `imageId`) stay behind and are only counted.
export function readLocalData(storage = window.localStorage) {
  let stored;
  try {
    stored = JSON.parse(storage.getItem(RECIPE_STORAGE_KEY));
  } catch {
    return null;
  }
  if (!stored || typeof stored !== "object") return null;
  const state = migrateRecipeState(stored.state, stored.version ?? 0);
  let backup;
  try {
    backup = sanitizeBackup({
      ingredients: named(state.ingredients),
      recipes: named(state.recipes),
      recipeCategories: named(state.recipeCategories),
    });
  } catch {
    return null;
  }
  const { ingredients, recipes, recipeCategories } = backup;
  if (!ingredients.length && !recipes.length && !recipeCategories.length) {
    return null;
  }
  const photos = (state.recipes ?? []).filter((recipe) => recipe?.imageId).length;
  return {
    data: { recipeCategories, ingredients, recipes },
    summary: {
      skipped: backup.skipped,
      recipes: recipes.length,
      ingredients: ingredients.length,
      categories: recipeCategories.length,
      photos,
      lastChange: Math.max(0, ...recipes.map((recipe) => recipe.updatedAt)),
    },
  };
}
