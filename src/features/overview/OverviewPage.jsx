import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useRecipeStore from "../../stores/useRecipeStore";
import useRecipeSelectionStore from "../../stores/useRecipeSelectionStore";
import { recipeTotals } from "../../lib/recipeMath";
import { resolveSelectedRecipe } from "../../lib/recipeSelection";
import { recipePath, viewPath } from "../../app/navigation";
import useNewRecipeModal from "../recipes/useNewRecipeModal";
import Overview from "./Overview";

const emptyTotals = { cost: 0, unitCost: 0, price: 0, missingCount: 0 };

// Container of the overview. The spotlight shows the last recipe opened in
// this session (the first one otherwise); opening a recipe goes to its URL.
function OverviewPage() {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const lastRecipeId = useRecipeSelectionStore((state) => state.lastRecipeId);
  const navigate = useNavigate();
  const openRecipe = (id) => navigate(recipePath(id));
  const { openNewRecipe, newRecipeModal } = useNewRecipeModal({
    onCreated: openRecipe,
  });

  const selectedRecipe = resolveSelectedRecipe(recipes, lastRecipeId);
  const totals = useMemo(
    () =>
      selectedRecipe ? recipeTotals(selectedRecipe, ingredients) : emptyTotals,
    [selectedRecipe, ingredients],
  );

  return (
    <>
      <Overview
        recipes={recipes}
        ingredients={ingredients}
        selectedRecipe={selectedRecipe}
        totals={totals}
        onNavigate={(view) => navigate(viewPath(view))}
        onSelect={openRecipe}
        onNewRecipe={openNewRecipe}
      />
      {newRecipeModal}
    </>
  );
}

export default OverviewPage;
