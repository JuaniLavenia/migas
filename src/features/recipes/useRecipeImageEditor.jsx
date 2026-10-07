import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import ConfirmDialog from "../../shared/ConfirmDialog";
import useImageStoreAvailable from "../../shared/useImageStoreAvailable";
import { discardImage, getImageStore } from "../../lib/images/imageStore";
import { prepareImage } from "../../lib/images/prepareImage";
import useRecipeImage from "./useRecipeImage";

const preparationMessages = {
  "not-image": "Ese archivo no es una imagen",
  "too-large": "La foto es demasiado grande (máximo 15 MB)",
  decode: "No pudimos leer esa imagen",
  encode: "Tu navegador no pudo procesar la foto",
};

function saveErrorMessage(error) {
  return error?.code === "quota"
    ? "No hay espacio suficiente para guardar la foto. La receta quedó sin cambios."
    : "No pudimos guardar la foto. La receta quedó sin cambios.";
}

// Add / replace / remove flow of the open recipe's photo. Returns the props
// of RecipeImageField and the confirmation dialog to render. The recipe only
// changes once the new image is stored; the previous image is discarded
// afterwards (an orphan left by a failure is cleaned up on the next start).
function useRecipeImageEditor(recipe) {
  const available = useImageStoreAvailable();
  const setRecipeImage = useRecipeStore((state) => state.setRecipeImage);
  const showToast = useToastStore((state) => state.showToast);
  const [busyRecipeId, setBusyRecipeId] = useState(null);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const image = useRecipeImage(recipe?.imageId);

  async function pick(file) {
    const recipeId = recipe.id;
    setBusyRecipeId(recipeId);
    try {
      let blob;
      try {
        blob = await prepareImage(file);
      } catch (error) {
        showToast(preparationMessages[error?.code] ?? preparationMessages.decode);
        return;
      }
      let imageId;
      try {
        imageId = await getImageStore().save(blob);
      } catch (error) {
        showToast(saveErrorMessage(error));
        return;
      }
      // Read the latest state: the recipe may have changed or been deleted
      // while the photo was being processed.
      const current = useRecipeStore.getState().getRecipe(recipeId);
      if (!current) {
        await discardImage(imageId);
        return;
      }
      setRecipeImage(recipeId, imageId);
      await discardImage(current.imageId);
      showToast("Foto guardada");
    } finally {
      setBusyRecipeId(null);
    }
  }

  async function confirmRemove() {
    const recipeId = pendingRemoveId;
    setPendingRemoveId(null);
    const current = useRecipeStore.getState().getRecipe(recipeId);
    if (!current?.imageId) return;
    setRecipeImage(recipeId, null);
    showToast("Foto quitada");
    await discardImage(current.imageId);
  }

  const field = recipe
    ? {
        recipeName: recipe.name,
        hasImage: Boolean(recipe.imageId),
        url: image.url,
        status: image.status,
        available,
        busy: busyRecipeId === recipe.id,
        onPick: pick,
        onRemove: () => setPendingRemoveId(recipe.id),
      }
    : null;

  const removeDialog = (
    <ConfirmDialog
      open={pendingRemoveId !== null}
      title="Quitar foto"
      description="¿Quitar la foto de esta receta? Esta acción no se puede deshacer."
      confirmLabel="Quitar"
      onConfirm={confirmRemove}
      onCancel={() => setPendingRemoveId(null)}
    />
  );

  return { imageField: field, removeImageDialog: removeDialog };
}

export default useRecipeImageEditor;
