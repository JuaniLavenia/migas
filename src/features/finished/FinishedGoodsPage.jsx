import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import ConfirmDialog from "../../shared/ConfirmDialog";
import { todayKey } from "../../lib/orders";
import { daysAgo } from "../../lib/dates";
import FinishedGoodsView from "./FinishedGoodsView";
import FinishedGoodModal from "./FinishedGoodModal";

const DELETED = "Receta eliminada";

// Batches grouped by recipe (by name, deleted recipes last), oldest first:
// the order in which orders use them.
function groupByRecipe(lots, recipes) {
  const groups = new Map();
  lots.forEach((lot) => {
    const recipe = recipes.find((entry) => entry.id === lot.recipeId);
    const key = recipe ? recipe.id : "";
    if (!groups.has(key)) groups.set(key, { id: key, name: recipe?.name ?? DELETED, lots: [] });
    groups.get(key).lots.push(lot);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      lots: [...group.lots].sort((a, b) => a.madeAt.localeCompare(b.madeAt)),
      total: group.lots.reduce((total, lot) => total + lot.quantity, 0),
    }))
    .sort((a, b) =>
      a.id === "" ? 1 : b.id === "" ? -1 : a.name.localeCompare(b.name, "es"),
    );
}

// Container of the finished goods view: what she already has cooked, with
// its age, the create/edit modal and the discard confirmation.
function FinishedGoodsPage() {
  const finishedGoods = useRecipeStore((state) => state.finishedGoods);
  const recipes = useRecipeStore((state) => state.recipes);
  const addFinishedGood = useRecipeStore((state) => state.addFinishedGood);
  const updateFinishedGood = useRecipeStore((state) => state.updateFinishedGood);
  const deleteFinishedGood = useRecipeStore((state) => state.deleteFinishedGood);
  const showToast = useToastStore((state) => state.showToast);
  // null: closed; {}: new batch; a batch: editing it.
  const [editing, setEditing] = useState(null);
  const [pendingDiscard, setPendingDiscard] = useState(null);
  const today = todayKey();
  const nameOf = (lot) =>
    recipes.find((recipe) => recipe.id === lot.recipeId)?.name ?? DELETED;

  function save(lot) {
    if (editing?.id) updateFinishedGood(editing.id, lot);
    else addFinishedGood(lot);
    setEditing(null);
    showToast("Elaborados guardados");
  }

  function confirmDiscard() {
    if (!pendingDiscard) return;
    deleteFinishedGood(pendingDiscard.id);
    showToast("Elaborados descartados");
    setPendingDiscard(null);
  }

  return (
    <>
      <FinishedGoodsView
        groups={groupByRecipe(finishedGoods, recipes)}
        ageOf={(lot) => daysAgo(lot.madeAt, today)}
        canAdd={recipes.length > 0}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDiscard={setPendingDiscard}
      />
      {editing !== null && (
        <FinishedGoodModal
          initial={editing}
          recipes={recipes}
          today={today}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={pendingDiscard !== null}
        title="Descartar elaborados"
        description={
          pendingDiscard
            ? `¿Descartar ${pendingDiscard.quantity} ${nameOf(pendingDiscard)} de ${daysAgo(pendingDiscard.madeAt, today)}?`
            : ""
        }
        confirmLabel="Descartar"
        onConfirm={confirmDiscard}
        onCancel={() => setPendingDiscard(null)}
      />
    </>
  );
}

export default FinishedGoodsPage;
