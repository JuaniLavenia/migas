import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useRecipeStore from "../../stores/useRecipeStore";
import useRecipeSelectionStore from "../../stores/useRecipeSelectionStore";
import useToastStore from "../../stores/useToastStore";
import { recipeTotals } from "../../lib/recipeMath";
import { resolveSelectedRecipe } from "../../lib/recipeSelection";
import { recipePath, viewPath } from "../../app/navigation";
import ConfirmDialog from "../../shared/ConfirmDialog";
import RecipesView from "./RecipesView";
import useNewRecipeModal from "./useNewRecipeModal";

const numericRecipeFields = new Set(["yield", "margin", "extras"]);
const emptyTotals = { cost: 0, unitCost: 0, price: 0, missingCount: 0 };

// Container of the recipes view. The open recipe comes from the URL:
// /recetas redirects to the last opened (or first) recipe, and an unknown id
// falls back to /recetas. Owns the create/delete flows.
function RecipesPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const updateRecipeInStore = useRecipeStore((state) => state.updateRecipe);
  const deleteRecipe = useRecipeStore((state) => state.deleteRecipe);
  const lastRecipeId = useRecipeSelectionStore((state) => state.lastRecipeId);
  const setLastRecipeId = useRecipeSelectionStore(
    (state) => state.setLastRecipeId,
  );
  const showToast = useToastStore((state) => state.showToast);
  const [pendingDelete, setPendingDelete] = useState(null);
  const openRecipe = (id) => navigate(recipePath(id));
  const { openNewRecipe, newRecipeModal } = useNewRecipeModal({
    onCreated: openRecipe,
  });

  const selectedRecipe =
    recipeId === undefined
      ? null
      : recipes.find((recipe) => recipe.id === recipeId) ?? null;
  const fallbackRecipe = resolveSelectedRecipe(recipes, lastRecipeId);

  useEffect(() => {
    if (selectedRecipe) setLastRecipeId(selectedRecipe.id);
  }, [selectedRecipe?.id, setLastRecipeId]);

  if (recipeId !== undefined && !selectedRecipe) {
    return <Navigate to={viewPath("recipes")} replace />;
  }
  if (recipeId === undefined && fallbackRecipe) {
    return <Navigate to={recipePath(fallbackRecipe.id)} replace />;
  }

  const totals = selectedRecipe
    ? recipeTotals(selectedRecipe, ingredients)
    : emptyTotals;

  function updateRecipe(field, value) {
    if (!selectedRecipe) return;
    updateRecipeInStore(selectedRecipe.id, {
      [field]: numericRecipeFields.has(field) ? Number(value) : value,
    });
  }

  function requestDelete(id) {
    const recipe = recipes.find((entry) => entry.id === id);
    setPendingDelete({ id, name: recipe?.name });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteRecipe(pendingDelete.id);
    if (pendingDelete.id === selectedRecipe?.id) {
      const next = recipes.find((recipe) => recipe.id !== pendingDelete.id);
      // replace: the deleted recipe's URL should not stay in the history.
      navigate(next ? recipePath(next.id) : viewPath("recipes"), {
        replace: true,
      });
    }
    showToast("Receta eliminada");
    setPendingDelete(null);
  }

  return (
    <>
      <RecipesView
        recipes={recipes}
        ingredients={ingredients}
        selectedId={selectedRecipe?.id}
        onSelect={openRecipe}
        onNew={openNewRecipe}
        totals={totals}
        selectedRecipe={selectedRecipe}
        updateRecipe={updateRecipe}
        onDelete={requestDelete}
      />
      {newRecipeModal}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar receta"
        description={`¿Eliminar "${pendingDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default RecipesPage;
