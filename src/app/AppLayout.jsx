import { useState } from "react";
import useRecipeStore from "../stores/useRecipeStore";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastRegion from "./ToastRegion";
import { viewLabel } from "./navigation";

// Shell shared by every view: sidebar, topbar, footer and toasts. The mobile
// menu closes whenever the user navigates.
function AppLayout({ activeView, onNavigate, children }) {
  const ingredientCount = useRecipeStore((state) => state.ingredients.length);
  const recipeCount = useRecipeStore((state) => state.recipes.length);
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(view) {
    onNavigate(view);
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        counts={{ ingredients: ingredientCount, recipes: recipeCount }}
        open={menuOpen}
        onNavigate={navigate}
        onClose={() => setMenuOpen(false)}
      />
      <main className="main-content">
        <Topbar
          title={viewLabel(activeView)}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <div className="content-wrap">{children}</div>
        <footer className="app-footer">Desarrollado por Codbyte</footer>
      </main>
      <ToastRegion />
    </div>
  );
}

export default AppLayout;
