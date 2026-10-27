import { useMemo, useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { sanitizeBackup } from "../../lib/backup";
import { downloadFile } from "../../shared/downloadFile";
import { importSummary } from "./importSummary";
import SettingsView from "./SettingsView";
import CategoriesPanel from "./CategoriesPanel";
import LocalUploadPanel from "./LocalUploadPanel";
import { useSession } from "../../app/session/SessionContext";
import { readLocalData } from "../../lib/localData";

function countByCategory(records) {
  const counts = {};
  records.forEach((record) => {
    if (record.categoryId)
      counts[record.categoryId] = (counts[record.categoryId] ?? 0) + 1;
  });
  return counts;
}

function recipeConsequence(count) {
  if (count === 0) return "No la usa ninguna receta.";
  return count === 1
    ? "1 receta queda sin categoría."
    : `${count} recetas quedan sin categoría.`;
}

function ingredientConsequence(count) {
  if (count === 0) return "No la usa ningún insumo.";
  return count === 1
    ? "1 insumo queda sin categoría."
    : `${count} insumos quedan sin categoría.`;
}

// Container of the settings view: backup export/import against the store
// (cloudSync saves what an import changes), the recipe and ingredient
// categories and, while the business in the cloud is empty, the manual upload
// of what this browser kept before the cloud.
function SettingsPage() {
  const session = useSession();
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const recipeCategories = useRecipeStore((state) => state.recipeCategories);
  const ingredientCategories = useRecipeStore((state) => state.ingredientCategories);
  const renameIngredientCategory = useRecipeStore(
    (state) => state.renameIngredientCategory,
  );
  const deleteIngredientCategory = useRecipeStore(
    (state) => state.deleteIngredientCategory,
  );
  const packaging = useRecipeStore((state) => state.packaging);
  const orders = useRecipeStore((state) => state.orders);
  const finishedGoods = useRecipeStore((state) => state.finishedGoods);
  const importData = useRecipeStore((state) => state.importData);
  const renameRecipeCategory = useRecipeStore(
    (state) => state.renameRecipeCategory,
  );
  const deleteRecipeCategory = useRecipeStore(
    (state) => state.deleteRecipeCategory,
  );
  const recipeCounts = useMemo(() => countByCategory(recipes), [recipes]);
  const ingredientCounts = useMemo(() => countByCategory(ingredients), [ingredients]);
  const showToast = useToastStore((state) => state.showToast);
  const [busy, setBusy] = useState(false);
  const localData = useMemo(() => (session ? readLocalData() : null), [session]);
  const cloudEmpty =
    !ingredients.length &&
    !recipes.length &&
    !recipeCategories.length &&
    !ingredientCategories.length &&
    !packaging.length &&
    !orders.length;

  async function handleUpload() {
    setBusy(true);
    try {
      await session.repository.uploadLocalData(session.businessId, localData.data);
      await session.reload();
      showToast("Datos subidos a la nube");
    } catch (error) {
      if (error?.code === "business_not_empty") {
        showToast("La nube ya tiene datos: no subimos nada para no pisarlos.");
        await session.reload();
      } else {
        showToast("No pudimos subir los datos. Probá de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    setBusy(true);
    try {
      downloadFile(
        `miga-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(
          {
            ingredientCategories,
            ingredients,
            recipeCategories,
            recipes,
            packaging,
            orders,
            finishedGoods,
          },
          null,
          2,
        ),
        "application/json",
      );
      showToast("Backup descargado");
    } finally {
      setBusy(false);
    }
  }

  function handleImport(text) {
    let backup;
    try {
      backup = sanitizeBackup(JSON.parse(text));
    } catch {
      showToast("No pudimos leer ese archivo: no es un backup válido");
      return;
    }
    if (
      backup.ingredients.length ||
      backup.recipes.length ||
      backup.recipeCategories.length ||
      backup.ingredientCategories.length ||
      backup.packaging.length ||
      backup.orders.length ||
      backup.finishedGoods.length
    ) {
      importData(backup);
    }
    showToast(importSummary(backup));
  }

  return (
    <SettingsView onExport={handleExport} onImport={handleImport} busy={busy}>
      {session && localData && cloudEmpty && (
        <LocalUploadPanel
          summary={localData.summary}
          busy={busy}
          onUpload={handleUpload}
        />
      )}
      <CategoriesPanel
        eyebrow="Recetas"
        title="Categorías de recetas"
        emptyHint="Todavía no hay categorías. Creá la primera desde una receta, en el campo Categoría."
        categories={recipeCategories}
        counts={recipeCounts}
        consequence={recipeConsequence}
        onRename={renameRecipeCategory}
        onDelete={deleteRecipeCategory}
      />
      <CategoriesPanel
        eyebrow="Insumos"
        title="Categorías de insumos"
        emptyHint="Todavía no hay categorías. Creá la primera desde un insumo, en el campo Categoría."
        categories={ingredientCategories}
        counts={ingredientCounts}
        consequence={ingredientConsequence}
        onRename={renameIngredientCategory}
        onDelete={deleteIngredientCategory}
      />
    </SettingsView>
  );
}

export default SettingsPage;
