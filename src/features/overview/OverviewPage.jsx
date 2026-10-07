import useRecipeStore from "../../stores/useRecipeStore";
import { recipeTotals } from "../../lib/recipeMath";
import { resolveSelectedRecipe } from "../../lib/recipeSelection";
import useNewRecipeModal from "../recipes/useNewRecipeModal";
import Overview from "./Overview";

const emptyTotals = { cost: 0, unitCost: 0, price: 0, missingCount: 0 };

// Container of the overview: reads the store and hands navigation intents
// (open a recipe, go to a view) back to the app.
function OverviewPage({
  selectedRecipeId,
  onSelectRecipe,
  onOpenRecipe,
  onNavigate,
}) {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const { openNewRecipe, newRecipeModal } = useNewRecipeModal({
    onCreated: onSelectRecipe,
  });

  const selectedRecipe = resolveSelectedRecipe(recipes, selectedRecipeId);
  const totals = selectedRecipe
    ? recipeTotals(selectedRecipe, ingredients)
    : emptyTotals;

  return (
    <>
      <Overview
        recipes={recipes}
        ingredients={ingredients}
        selectedRecipe={selectedRecipe}
        totals={totals}
        onNavigate={onNavigate}
        onSelect={onOpenRecipe}
        onNewRecipe={openNewRecipe}
      />
      {newRecipeModal}
    </>
  );
}

export default OverviewPage;
