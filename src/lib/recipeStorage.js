// Persistence contract of the recipe store. The ErrorBoundary reads the same
// key to offer a download/reset of the stored data, so it lives here.
export const RECIPE_STORAGE_KEY = "miga-recipe-storage";

// Bump on every change to the persisted shape and teach migrateRecipeState
// how to upgrade from the previous version.
export const RECIPE_STORAGE_VERSION = 1;

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
export function migrateRecipeState(persisted, fromVersion, now = Date.now()) {
  if (!isObject(persisted)) return {};
  const state = {};
  if (Array.isArray(persisted.ingredients)) {
    state.ingredients = persisted.ingredients;
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

// Storage adapter for zustand's createJSONStorage. Writes can fail (quota
// exceeded, storage blocked by the browser); instead of throwing inside the
// store update, each write reports whether it succeeded through onWrite.
export function createSafeStorage(getStorage, onWrite) {
  return {
    getItem(name) {
      try {
        return getStorage().getItem(name);
      } catch {
        return null;
      }
    },
    setItem(name, value) {
      try {
        getStorage().setItem(name, value);
        onWrite(true);
      } catch {
        onWrite(false);
      }
    },
    removeItem(name) {
      try {
        getStorage().removeItem(name);
      } catch {
        // Nothing stored can be removed when storage is unavailable.
      }
    },
  };
}
