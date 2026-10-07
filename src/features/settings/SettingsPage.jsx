import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import SettingsView from "./SettingsView";

// Container of the settings view: backup export/import against the store.
function SettingsPage() {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const importData = useRecipeStore((state) => state.importData);
  const showToast = useToastStore((state) => state.showToast);
  return (
    <SettingsView
      ingredients={ingredients}
      recipes={recipes}
      onImport={importData}
      onToast={showToast}
    />
  );
}

export default SettingsPage;
