import { useMemo, useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { sanitizeBackup } from "../../lib/backup";
import { downloadFile } from "../../shared/downloadFile";
import { importSummary } from "./importSummary";
import SettingsView from "./SettingsView";
import RecipeCategoriesPanel from "./RecipeCategoriesPanel";

// Container of the settings view: backup export/import against the store
// (cloudSync saves what an import changes) and the recipe categories.
// `children` are extra panels (the first upload of a device's data).
function SettingsPage({ children }) {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const recipeCategories = useRecipeStore((state) => state.recipeCategories);
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

  function handleExport() {
    setBusy(true);
    try {
      downloadFile(
        `miga-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify({ ingredients, recipeCategories, recipes }, null, 2),
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
      backup.recipeCategories.length
    ) {
      importData(backup);
    }
    showToast(importSummary(backup));
  }

  return (
    <SettingsView onExport={handleExport} onImport={handleImport} busy={busy}>
      {children}
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
