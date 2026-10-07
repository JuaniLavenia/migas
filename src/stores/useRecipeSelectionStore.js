import { create } from "zustand";

// Last recipe opened in this session. The URL decides which recipe is shown
// on /recetas/:recipeId; this only answers "which one" where the URL has no
// id (the overview spotlight and plain /recetas). Not persisted.
const useRecipeSelectionStore = create((set) => ({
  lastRecipeId: null,
  setLastRecipeId: (lastRecipeId) => set({ lastRecipeId }),
}));

export default useRecipeSelectionStore;
