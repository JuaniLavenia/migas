import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import useRecipeStore from "../../stores/useRecipeStore";
import useRecipeSelectionStore from "../../stores/useRecipeSelectionStore";
import useToastStore from "../../stores/useToastStore";
import { recipeTotals } from "../../lib/recipeMath";
import { resolveSelectedRecipe } from "../../lib/recipeSelection";
import {
  CUSTOM_SORT,
  pageOfIndex,
  paginate,
  sortListing,
} from "../../lib/listing";
import useListingParams from "../../shared/useListingParams";
import { recipePath, viewPath } from "../../app/navigation";
import ConfirmDialog from "../../shared/ConfirmDialog";
import RecipesView from "./RecipesView";
import useNewRecipeModal from "./useNewRecipeModal";
import {
  RECIPES_PER_PAGE,
  recipeListingDefaults,
  recipeSortOptions,
  recipeSortValue,
} from "./recipeListing";

const numericRecipeFields = new Set(["yield", "margin", "extras"]);
const emptyTotals = { cost: 0, unitCost: 0, price: 0, missingCount: 0 };

// Container of the recipes view. The open recipe comes from the URL:
// /recetas redirects to the last opened (or first) recipe, and an unknown id
// falls back to /recetas. Owns the create/delete flows and the library's
// sort and pagination, whose query string (`?orden=…`) is kept when moving
// between recipes here. The open recipe does not need to be on the visible
// library page.
function RecipesPage() {
  const { recipeId } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const listing = useListingParams(recipeListingDefaults);
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const updateRecipeInStore = useRecipeStore((state) => state.updateRecipe);
  const deleteRecipe = useRecipeStore((state) => state.deleteRecipe);
  const reorderRecipes = useRecipeStore((state) => state.reorderRecipes);
  const moveRecipe = useRecipeStore((state) => state.moveRecipe);
  const lastRecipeId = useRecipeSelectionStore((state) => state.lastRecipeId);
  const setLastRecipeId = useRecipeSelectionStore(
    (state) => state.setLastRecipeId,
  );
  const showToast = useToastStore((state) => state.showToast);
  const [pendingDelete, setPendingDelete] = useState(null);
  const withQuery = (pathname) => ({ pathname, search });
  const openRecipe = (id) => navigate(withQuery(recipePath(id)));
  const { openNewRecipe, newRecipeModal } = useNewRecipeModal({
    onCreated: openRecipe,
  });

  const selectedRecipe =
    recipeId === undefined
      ? null
      : recipes.find((recipe) => recipe.id === recipeId) ?? null;
  const fallbackRecipe = resolveSelectedRecipe(recipes, lastRecipeId);

  let redirectPath = null;
  if (recipeId !== undefined && !selectedRecipe) {
    redirectPath = viewPath("recipes");
  } else if (recipeId === undefined && fallbackRecipe) {
    redirectPath = recipePath(fallbackRecipe.id);
  }

  const sortedRecipes = sortListing(
    recipes,
    recipeSortValue(listing.sort, ingredients),
    listing.direction,
  );
  const pageInfo = paginate(sortedRecipes, listing.page, RECIPES_PER_PAGE);

  useEffect(() => {
    if (selectedRecipe) setLastRecipeId(selectedRecipe.id);
  }, [selectedRecipe?.id, setLastRecipeId]);

  // A page beyond the last one (deep link, or after deleting) is shown
  // clamped; this keeps the URL in line with what is shown.
  useEffect(() => {
    if (!redirectPath && listing.page !== pageInfo.page) {
      listing.setPage(pageInfo.page);
    }
  }, [redirectPath, listing.page, pageInfo.page]);

  if (redirectPath) {
    return <Navigate to={withQuery(redirectPath)} replace />;
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

  // Moves one position in the full library and, when the recipe leaves the
  // visible page, follows it so it stays in view. The open recipe stays open.
  function move(id, delta) {
    const target = recipes.findIndex((recipe) => recipe.id === id) + delta;
    if (target < 0 || target >= recipes.length) return;
    moveRecipe(id, delta);
    const targetPage = pageOfIndex(target, RECIPES_PER_PAGE);
    if (targetPage !== pageInfo.page) listing.setPage(targetPage);
  }

  // In the custom order the visible order is the stored order.
  const reorder =
    listing.sort === CUSTOM_SORT
      ? {
          onReorder: reorderRecipes,
          onMove: move,
          firstId: recipes[0]?.id,
          lastId: recipes.at(-1)?.id,
        }
      : null;

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
      navigate(
        withQuery(next ? recipePath(next.id) : viewPath("recipes")),
        { replace: true },
      );
    }
    showToast("Receta eliminada");
    setPendingDelete(null);
  }

  return (
    <>
      <RecipesView
        recipes={pageInfo.items}
        recipeCount={recipes.length}
        ingredients={ingredients}
        sortOptions={recipeSortOptions}
        sort={listing.sort}
        direction={listing.direction}
        onSortChange={listing.setSort}
        onDirectionChange={listing.setDirection}
        page={pageInfo.page}
        pageCount={pageInfo.pageCount}
        onPageChange={listing.setPage}
        selectedId={selectedRecipe?.id}
        onSelect={openRecipe}
        onNew={openNewRecipe}
        totals={totals}
        selectedRecipe={selectedRecipe}
        updateRecipe={updateRecipe}
        onDelete={requestDelete}
        reorder={reorder}
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
