import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { countRecipesUsingIngredient } from "../../lib/recipeMath";
import ConfirmDialog from "../../shared/ConfirmDialog";
import IngredientsView from "./IngredientsView";
import IngredientModal from "./IngredientModal";

function deleteDescription(target) {
  const question = `¿Eliminar "${target?.name}"? Esta acción no se puede deshacer.`;
  if (!target?.usedIn) return question;
  const recipesLabel =
    target.usedIn === 1 ? "1 receta" : `${target.usedIn} recetas`;
  return `Este insumo se usa en ${recipesLabel}: esas líneas van a quedar sin costo hasta que elijas otro insumo. ${question}`;
}

// Container of the ingredients view: search, create/edit modal and the
// delete confirmation (which warns when recipes use the ingredient).
function IngredientsPage() {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const updateIngredient = useRecipeStore((state) => state.updateIngredient);
  const deleteIngredient = useRecipeStore((state) => state.deleteIngredient);
  const showToast = useToastStore((state) => state.showToast);
  const [search, setSearch] = useState("");
  // null: closed; {}: new ingredient; an ingredient: editing it.
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const filteredIngredients = ingredients.filter((item) =>
    `${item.name} ${item.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

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
        ingredients={filteredIngredients}
        search={search}
        setSearch={setSearch}
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
