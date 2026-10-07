import { useEffect } from "react";
import useRecipeStore from "../stores/useRecipeStore";
import { RECIPE_STORAGE_KEY } from "../lib/recipeStorage";
import { getImageStore } from "../lib/images/imageStore";
import { removeOrphanImages } from "../lib/images/orphans";

// The recipes really come from storage only when it can be read. If it
// cannot (blocked), the store falls back to the demo data and every stored
// image would look like an orphan: skip the cleanup instead.
function recipeStorageReadable() {
  try {
    window.localStorage.getItem(RECIPE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function cleanUp() {
  if (!recipeStorageReadable()) return;
  removeOrphanImages(
    getImageStore(),
    () => useRecipeStore.getState().recipes,
  ).catch(() => {});
}

// Removes the images no recipe references, once per app start, after the
// recipe store has loaded its persisted data. Running it twice (StrictMode)
// is harmless.
function useOrphanImageCleanup() {
  useEffect(() => {
    if (useRecipeStore.persist.hasHydrated()) {
      cleanUp();
      return undefined;
    }
    return useRecipeStore.persist.onFinishHydration(cleanUp);
  }, []);
}

export default useOrphanImageCleanup;
