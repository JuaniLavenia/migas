import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import useRecipeStore from "../stores/useRecipeStore";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastRegion from "./ToastRegion";
import { viewForPath } from "./navigation";
import useOrphanImageCleanup from "./useOrphanImageCleanup";

// Shell shared by every route: sidebar, topbar, footer and toasts. The mobile
// menu closes whenever the user navigates (or taps the current item). Also
// runs the startup cleanup of orphaned recipe images.
function AppLayout() {
  const ingredientCount = useRecipeStore((state) => state.ingredients.length);
  const recipeCount = useRecipeStore((state) => state.recipes.length);
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useOrphanImageCleanup();

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="app-shell">
      <Sidebar
        counts={{ ingredients: ingredientCount, recipes: recipeCount }}
        open={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onClose={() => setMenuOpen(false)}
      />
      <main className="main-content">
        <Topbar
          title={viewForPath(pathname).label}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <div className="content-wrap">
          <Outlet />
        </div>
        <footer className="app-footer">Desarrollado por Codbyte</footer>
      </main>
      <ToastRegion />
    </div>
  );
}

export default AppLayout;
