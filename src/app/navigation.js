import { LayoutDashboard, Package, ReceiptText, Settings2 } from "lucide-react";

// The app's top-level views, in sidebar order. `main` items go in the main
// list; the rest sit at the bottom of the sidebar.
export const views = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard, main: true },
  { id: "ingredients", label: "Insumos", icon: Package, main: true },
  { id: "recipes", label: "Recetas", icon: ReceiptText, main: true },
  { id: "settings", label: "Configuración", icon: Settings2, main: false },
];

export function viewLabel(id) {
  return views.find((view) => view.id === id)?.label ?? "";
}
