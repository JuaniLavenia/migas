import { LayoutDashboard, Package, ReceiptText, Settings2 } from "lucide-react";

// The app's top-level views, in sidebar order. `main` items go in the main
// list; the rest sit at the bottom of the sidebar.
export const views = [
  {
    id: "overview",
    path: "/",
    label: "Resumen",
    icon: LayoutDashboard,
    main: true,
  },
  {
    id: "ingredients",
    path: "/insumos",
    label: "Insumos",
    icon: Package,
    main: true,
  },
  {
    id: "recipes",
    path: "/recetas",
    label: "Recetas",
    icon: ReceiptText,
    main: true,
  },
  {
    id: "settings",
    path: "/configuracion",
    label: "Configuración",
    icon: Settings2,
    main: false,
  },
];

export function viewPath(id) {
  return views.find((view) => view.id === id)?.path ?? "/";
}

export function recipePath(recipeId) {
  return `/recetas/${encodeURIComponent(recipeId)}`;
}

// The view a pathname belongs to ("/recetas/abc" → recipes).
export function viewForPath(pathname) {
  return (
    views.find(
      (view) =>
        view.path !== "/" &&
        (pathname === view.path || pathname.startsWith(`${view.path}/`)),
    ) ?? views[0]
  );
}
