import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import RecipeModal from "./RecipeModal";

// "Nueva receta" flow shared by every page that offers it. Returns the
// opener and the modal element to render (null while closed). onCreated
// receives the new recipe id.
function useNewRecipeModal({ onCreated } = {}) {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const addRecipe = useRecipeStore((state) => state.addRecipe);
  const recipeCategories = useRecipeStore((state) => state.recipeCategories);
  const addRecipeCategory = useRecipeStore((state) => state.addRecipeCategory);
  const showToast = useToastStore((state) => state.showToast);
  const [open, setOpen] = useState(false);

  function save({ categoryId, ...form }) {
    const id = addRecipe({
      ...form,
      ...(categoryId ? { categoryId } : {}),
      yield: Number(form.yield),
      margin: Number(form.margin),
      extras: Number(form.extras),
    });
    setOpen(false);
    showToast("Receta creada");
    onCreated?.(id);
  }

  const modal = open ? (
    <RecipeModal
      ingredients={ingredients}
      categories={recipeCategories}
      onCreateCategory={addRecipeCategory}
      onClose={() => setOpen(false)}
      onSave={save}
    />
  ) : null;

  return { openNewRecipe: () => setOpen(true), newRecipeModal: modal };
}

export default useNewRecipeModal;
