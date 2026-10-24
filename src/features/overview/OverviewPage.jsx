import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CloudUpload } from "lucide-react";
import useRecipeStore from "../../stores/useRecipeStore";
import useRecipeSelectionStore from "../../stores/useRecipeSelectionStore";
import { recipeTotals } from "../../lib/recipeMath";
import { resolveSelectedRecipe } from "../../lib/recipeSelection";
import { recipePath, viewPath } from "../../app/navigation";
import useNewRecipeModal from "../recipes/useNewRecipeModal";
import Overview from "./Overview";
import { useSession } from "../../app/session/SessionContext";
import { readLocalData } from "../../lib/localData";

const emptyTotals = { cost: 0, unitCost: 0, price: 0, missingCount: 0 };

// Container of the overview. The spotlight shows the last recipe opened in
// this session (the first one otherwise); a new recipe opens at its URL.
// On a first sign-in the cloud is empty while the phone still has the old
// data: say where to upload it, so the empty app does not look like a loss.
function UploadHint() {
  const session = useSession();
  const cloudEmpty = useRecipeStore(
    (state) =>
      !state.ingredients.length &&
      !state.recipes.length &&
      !state.recipeCategories.length &&
      !state.packaging.length &&
      !state.orders.length,
  );
  const hasLocalData = useMemo(
    () => Boolean(session && readLocalData()),
    [session],
  );
  if (!session || !cloudEmpty || !hasLocalData) return null;
  return (
    <Link className="upload-hint" to={viewPath("settings")}>
      <CloudUpload size={18} />
      <span>
        <strong>Subir los datos de este dispositivo</strong>
        <small>
          Tus recetas guardadas en este navegador todavía no están en la nube.
        </small>
      </span>
    </Link>
  );
}

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
      <UploadHint />
      <Overview
        recipes={recipes}
        ingredients={ingredients}
        selectedRecipe={selectedRecipe}
        totals={totals}
        onNewRecipe={openNewRecipe}
      />
      {newRecipeModal}
    </>
  );
}

export default OverviewPage;
