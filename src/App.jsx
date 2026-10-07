import { useState } from "react";
import "./App.css";
import AppLayout from "./app/AppLayout";
import OverviewPage from "./features/overview/OverviewPage";
import IngredientsPage from "./features/ingredients/IngredientsPage";
import RecipesPage from "./features/recipes/RecipesPage";
import SettingsPage from "./features/settings/SettingsPage";

// Composition only: which view is shown and which recipe is selected.
// Every feature handler lives in its page container.
function App() {
  const [activeView, setActiveView] = useState("overview");
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);

  function openRecipe(id) {
    setSelectedRecipeId(id);
    setActiveView("recipes");
  }

  return (
    <AppLayout activeView={activeView} onNavigate={setActiveView}>
      {activeView === "overview" && (
        <OverviewPage
          selectedRecipeId={selectedRecipeId}
          onSelectRecipe={setSelectedRecipeId}
          onOpenRecipe={openRecipe}
          onNavigate={setActiveView}
        />
      )}
      {activeView === "ingredients" && <IngredientsPage />}
      {activeView === "recipes" && (
        <RecipesPage
          selectedRecipeId={selectedRecipeId}
          onSelectRecipe={setSelectedRecipeId}
        />
      )}
      {activeView === "settings" && <SettingsPage />}
    </AppLayout>
  );
}

export default App;
