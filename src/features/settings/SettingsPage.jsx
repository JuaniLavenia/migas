import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { sanitizeBackup } from "../../lib/backup";
import { discardImage, getImageStore } from "../../lib/images/imageStore";
import {
  collectBackupImages,
  restoreBackupImages,
} from "../../lib/images/backupImages";
import { downloadFile } from "../../shared/downloadFile";
import { importSummary } from "./importSummary";
import SettingsView from "./SettingsView";

// Container of the settings view: backup export/import against the store,
// including the recipe photos.
function SettingsPage() {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const importData = useRecipeStore((state) => state.importData);
  const showToast = useToastStore((state) => state.showToast);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const images = await collectBackupImages(recipes, getImageStore());
      downloadFile(
        `miga-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify({ ingredients, recipes, images }, null, 2),
        "application/json",
      );
      showToast("Backup descargado");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(text) {
    let data;
    let backup;
    try {
      data = JSON.parse(text);
      backup = sanitizeBackup(data);
    } catch {
      showToast("No pudimos leer ese archivo: no es un backup válido");
      return;
    }
    if (!backup.ingredients.length && !backup.recipes.length) {
      showToast(importSummary(backup));
      return;
    }
    setBusy(true);
    try {
      const images = await restoreBackupImages(
        backup.recipes,
        data.images,
        getImageStore(),
      );
      // An imported recipe with a new photo replaces the photo of the
      // stored recipe with the same id: that one is no longer referenced.
      const current = useRecipeStore.getState().recipes;
      const replaced = images.recipes
        .filter((recipe) => recipe.imageId)
        .map((recipe) => current.find((entry) => entry.id === recipe.id)?.imageId)
        .filter(Boolean);
      importData({ ingredients: backup.ingredients, recipes: images.recipes });
      replaced.forEach(discardImage);
      showToast(importSummary({ ...backup, images }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsView onExport={handleExport} onImport={handleImport} busy={busy} />
  );
}

export default SettingsPage;
