import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import useRecipeStore from "../../stores/useRecipeStore";
import useRecipeSelectionStore from "../../stores/useRecipeSelectionStore";
import useToastStore from "../../stores/useToastStore";
import { recipeTotals } from "../../lib/recipeMath";
import { resolveSelectedRecipe } from "../../lib/recipeSelection";
import { CUSTOM_SORT, sortListing } from "../../lib/listing";
import { UNCATEGORIZED, groupRecipes } from "../../lib/recipeGroups";
import useListingParams from "../../shared/useListingParams";
import { recipePath, viewPath } from "../../app/navigation";
import ConfirmDialog from "../../shared/ConfirmDialog";
import { discardImage } from "../../lib/images/imageStore";
import RecipesView from "./RecipesView";
import useNewRecipeModal from "./useNewRecipeModal";
import useRecipeImageEditor from "./useRecipeImageEditor";
import {
  recipeListingDefaults,
  recipeSortOptions,
  recipeSortValue,
} from "./recipeListing";

const numericRecipeFields = new Set(["yield", "margin", "extras"]);
const emptyTotals = { cost: 0, unitCost: 0, price: 0, missingCount: 0 };

// Container of the recipes view. The open recipe comes from the URL:
// /recetas redirects to the last opened (or first) recipe, and an unknown id
// falls back to /recetas. Owns the create/delete flows, the library's sort
// (whose query string, `?orden=…`, is kept when moving between recipes here)
// and category filter, and the open recipe's photo. The library is grouped by
// category; the open recipe may be in a filtered-out or collapsed group.
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
  const recipeCategories = useRecipeStore((state) => state.recipeCategories);
  const addRecipeCategory = useRecipeStore((state) => state.addRecipeCategory);
  const lastRecipeId = useRecipeSelectionStore((state) => state.lastRecipeId);
  const setLastRecipeId = useRecipeSelectionStore(
    (state) => state.setLastRecipeId,
  );
  const showToast = useToastStore((state) => state.showToast);
  const [pendingDelete, setPendingDelete] = useState(null);
  // null: every category.
  const [categoryFilter, setCategoryFilter] = useState(null);
  const withQuery = (pathname) => ({ pathname, search });
  const openRecipe = (id) => navigate(withQuery(recipePath(id)));
  const { openNewRecipe, newRecipeModal } = useNewRecipeModal({
    onCreated: openRecipe,
  });

  const selectedRecipe =
    recipeId === undefined
      ? null
      : recipes.find((recipe) => recipe.id === recipeId) ?? null;
  const { imageField, removeImageDialog } =
    useRecipeImageEditor(selectedRecipe);
  const fallbackRecipe = resolveSelectedRecipe(recipes, lastRecipeId);

  let redirectPath = null;
  if (recipeId !== undefined && !selectedRecipe) {
    redirectPath = viewPath("recipes");
  } else if (recipeId === undefined && fallbackRecipe) {
    redirectPath = recipePath(fallbackRecipe.id);
  }

  // Cost/price sorting computes every recipe's totals: only redo it when the
  // data or the sort changes.
  const sortedRecipes = useMemo(
    () =>
      sortListing(
        recipes,
        recipeSortValue(listing.sort, ingredients),
        listing.direction,
      ),
    [recipes, ingredients, listing.sort, listing.direction],
  );
  const totals = useMemo(
    () =>
      selectedRecipe ? recipeTotals(selectedRecipe, ingredients) : emptyTotals,
    [selectedRecipe, ingredients],
  );
  const groups = useMemo(
    () => groupRecipes(sortedRecipes, recipeCategories),
    [sortedRecipes, recipeCategories],
  );
  const visibleGroups =
    categoryFilter === null
      ? groups
      : groups.filter((group) => group.id === categoryFilter);

  useEffect(() => {
    if (selectedRecipe) setLastRecipeId(selectedRecipe.id);
  }, [selectedRecipe?.id, setLastRecipeId]);

  if (redirectPath) {
    return <Navigate to={withQuery(redirectPath)} replace />;
  }

  function updateRecipe(field, value) {
    if (!selectedRecipe) return;
    let change;
    if (field === "categoryId") change = { categoryId: value || undefined };
    else if (field === "salePrice")
      change = { salePrice: value === null ? undefined : Number(value) };
    else if (numericRecipeFields.has(field)) change = { [field]: Number(value) };
    else change = { [field]: value };
    updateRecipeInStore(selectedRecipe.id, change);
  }

  // In the custom order the visible order of each group is the stored order;
  // the store keeps moves inside the recipe's category.
  const reorder =
    listing.sort === CUSTOM_SORT
      ? { onReorder: reorderRecipes, onMove: moveRecipe }
      : null;

  function requestDelete(id) {
    const recipe = recipes.find((entry) => entry.id === id);
    setPendingDelete({ id, name: recipe?.name, imageId: recipe?.imageId });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteRecipe(pendingDelete.id);
    discardImage(pendingDelete.imageId);
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
        groups={visibleGroups}
        grouped={recipeCategories.length > 0}
        categories={recipeCategories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        hasUncategorized={groups.some((group) => group.id === UNCATEGORIZED)}
        onCreateCategory={addRecipeCategory}
        recipeCount={recipes.length}
        ingredients={ingredients}
        sortOptions={recipeSortOptions}
        sort={listing.sort}
        direction={listing.direction}
        onSortChange={listing.setSort}
        onDirectionChange={listing.setDirection}
        selectedId={selectedRecipe?.id}
        onSelect={openRecipe}
        onNew={openNewRecipe}
        totals={totals}
        selectedRecipe={selectedRecipe}
        updateRecipe={updateRecipe}
        onDelete={requestDelete}
        imageField={imageField}
        reorder={reorder}
      />
      {newRecipeModal}
      {removeImageDialog}
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
