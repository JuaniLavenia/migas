import { useEffect, useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { countRecipesUsingIngredient } from "../../lib/recipeMath";
import { paginate, sortBy } from "../../lib/listing";
import useListingParams from "../../shared/useListingParams";
import ConfirmDialog from "../../shared/ConfirmDialog";
import IngredientsView from "./IngredientsView";
import IngredientModal from "./IngredientModal";
import {
  INGREDIENTS_PER_PAGE,
  ingredientListingDefaults,
  ingredientSortOptions,
  ingredientSortValue,
} from "./ingredientListing";

const byName = (item) => item.name;

function deleteDescription(target) {
  const question = `¿Eliminar "${target?.name}"? Esta acción no se puede deshacer.`;
  if (!target?.usedIn) return question;
  const recipesLabel =
    target.usedIn === 1 ? "1 receta" : `${target.usedIn} recetas`;
  return `Este insumo se usa en ${recipesLabel}: esas líneas van a quedar sin costo hasta que elijas otro insumo. ${question}`;
}

// Container of the ingredients view: search, sort and pagination (sort and
// page live in the URL), create/edit modal and the delete confirmation
// (which warns when recipes use the ingredient).
function IngredientsPage() {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const updateIngredient = useRecipeStore((state) => state.updateIngredient);
  const deleteIngredient = useRecipeStore((state) => state.deleteIngredient);
  const showToast = useToastStore((state) => state.showToast);
  const [search, setSearch] = useState("");
  const listing = useListingParams(ingredientListingDefaults);
  // null: closed; {}: new ingredient; an ingredient: editing it.
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Search, then sort (name breaks ties; the custom order keeps the stored
  // order), then paginate.
  const filteredIngredients = ingredients.filter((item) =>
    `${item.name} ${item.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const sortValue = ingredientSortValue(listing.sort);
  const sortedIngredients = sortValue
    ? sortBy(sortBy(filteredIngredients, byName), sortValue, listing.direction)
    : filteredIngredients;
  const pageInfo = paginate(
    sortedIngredients,
    listing.page,
    INGREDIENTS_PER_PAGE,
  );

  // A page beyond the last one (deep link, or after deleting) is shown
  // clamped; this keeps the URL in line with what is shown.
  useEffect(() => {
    if (listing.page !== pageInfo.page) listing.setPage(pageInfo.page);
  }, [listing.page, pageInfo.page]);

  function changeSearch(value) {
    setSearch(value);
    if (listing.page !== 1) listing.setPage(1);
  }

  function save(form) {
    const item = {
      ...form,
      packSize: Number(form.packSize),
      packCost: Number(form.packCost),
    };
    if (editing?.id) updateIngredient(editing.id, item);
    else addIngredient(item);
    setEditing(null);
    showToast("Insumo guardado");
  }

  function requestDelete(id) {
    const ingredient = ingredients.find((item) => item.id === id);
    setPendingDelete({
      id,
      name: ingredient?.name,
      usedIn: countRecipesUsingIngredient(recipes, id),
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteIngredient(pendingDelete.id);
    showToast("Insumo eliminado");
    setPendingDelete(null);
  }

  return (
    <>
      <IngredientsView
        ingredients={pageInfo.items}
        matchCount={filteredIngredients.length}
        totalCount={ingredients.length}
        search={search}
        setSearch={changeSearch}
        sortOptions={ingredientSortOptions}
        sort={listing.sort}
        direction={listing.direction}
        onSortChange={listing.setSort}
        onDirectionChange={listing.setDirection}
        page={pageInfo.page}
        pageCount={pageInfo.pageCount}
        onPageChange={listing.setPage}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDelete={requestDelete}
      />
      {editing !== null && (
        <IngredientModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar insumo"
        description={deleteDescription(pendingDelete)}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default IngredientsPage;
