import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import useRecipeStore from "../stores/useRecipeStore";
import useMediaQuery from "../shared/useMediaQuery";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastRegion from "./ToastRegion";
import { viewForPath } from "./navigation";
import useOrphanImageCleanup from "./useOrphanImageCleanup";

const SIDEBAR_ID = "app-sidebar";
// Same breakpoint as the drawer styles in App.css.
const MOBILE_QUERY = "(max-width: 680px)";

// Shell shared by every route: sidebar, topbar, footer and toasts. On mobile
// the sidebar is a drawer: while closed it is inert (out of the tab order);
// it closes whenever the user navigates (or taps the current item), with its
// close button or with Escape, and the last two return the focus to the menu
// button. Also runs the startup cleanup of orphaned recipe images.
function AppLayout() {
  const ingredientCount = useRecipeStore((state) => state.ingredients.length);
  const recipeCount = useRecipeStore((state) => state.recipes.length);
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  useOrphanImageCleanup();

  useEffect(() => setMenuOpen(false), [pathname]);

  function closeMenuToButton() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  // The drawer is no longer inert once open: move the focus into it.
  useEffect(() => {
    if (!menuOpen || !isMobile) return;
    sidebarRef.current?.querySelector("button, a[href]")?.focus();
  }, [menuOpen, isMobile]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") closeMenuToButton();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <Sidebar
        id={SIDEBAR_ID}
        ref={sidebarRef}
        counts={{ ingredients: ingredientCount, recipes: recipeCount }}
        open={menuOpen}
        inert={isMobile && !menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onClose={closeMenuToButton}
      />
      <main className="main-content">
        <Topbar
          title={viewForPath(pathname).label}
          menuButtonRef={menuButtonRef}
          menuOpen={menuOpen}
          sidebarId={SIDEBAR_ID}
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
