import { useMemo, useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { sanitizeBackup } from "../../lib/backup";
import { downloadFile } from "../../shared/downloadFile";
import { importSummary } from "./importSummary";
import SettingsView from "./SettingsView";
import RecipeCategoriesPanel from "./RecipeCategoriesPanel";
import LocalUploadPanel from "./LocalUploadPanel";
import { useSession } from "../../app/session/SessionContext";
import { readLocalData } from "../../lib/localData";

// Container of the settings view: backup export/import against the store
// (cloudSync saves what an import changes), the recipe categories and, while
// the business in the cloud is empty, the manual upload of what this browser
// kept before the cloud.
function SettingsPage() {
  const session = useSession();
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const recipeCategories = useRecipeStore((state) => state.recipeCategories);
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
  const recipeCounts = useMemo(() => {
    const counts = {};
    recipes.forEach((recipe) => {
      if (recipe.categoryId)
        counts[recipe.categoryId] = (counts[recipe.categoryId] ?? 0) + 1;
    });
    return counts;
  }, [recipes]);
  const showToast = useToastStore((state) => state.showToast);
  const [busy, setBusy] = useState(false);
  const localData = useMemo(() => (session ? readLocalData() : null), [session]);
  const cloudEmpty =
    !ingredients.length &&
    !recipes.length &&
    !recipeCategories.length &&
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
          { ingredients, recipeCategories, recipes, packaging, orders, finishedGoods },
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
      <RecipeCategoriesPanel
        categories={recipeCategories}
        recipeCounts={recipeCounts}
        onRename={renameRecipeCategory}
        onDelete={deleteRecipeCategory}
      />
    </SettingsView>
  );
}

export default SettingsPage;
