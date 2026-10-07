import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { recipeTotals } from "../../lib/recipeMath";
import { resolveSelectedRecipe } from "../../lib/recipeSelection";
import ConfirmDialog from "../../shared/ConfirmDialog";
import RecipesView from "./RecipesView";
import useNewRecipeModal from "./useNewRecipeModal";

const numericRecipeFields = new Set(["yield", "margin", "extras"]);
const emptyTotals = { cost: 0, unitCost: 0, price: 0, missingCount: 0 };

// Container of the recipes view: reads the store, owns the create/delete
// flows and reports selection changes through onSelectRecipe.
function RecipesPage({ selectedRecipeId, onSelectRecipe }) {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const updateRecipeInStore = useRecipeStore((state) => state.updateRecipe);
  const deleteRecipe = useRecipeStore((state) => state.deleteRecipe);
  const showToast = useToastStore((state) => state.showToast);
  const [pendingDelete, setPendingDelete] = useState(null);
  const { openNewRecipe, newRecipeModal } = useNewRecipeModal({
    onCreated: onSelectRecipe,
  });

  // Effective selection: always an existing recipe, or null with no recipes.
  const selectedRecipe = resolveSelectedRecipe(recipes, selectedRecipeId);
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
      const remaining = recipes.filter(
        (recipe) => recipe.id !== pendingDelete.id,
      );
      onSelectRecipe(remaining[0]?.id ?? null);
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
        onSelect={onSelectRecipe}
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
