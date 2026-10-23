import { ChevronRight, Menu } from "lucide-react";
import useSaveStatusStore from "../stores/useSaveStatusStore";

const statusLabels = {
  saved: "Guardado en la nube",
  saving: "Guardando…",
  error: "No se pudo guardar",
};

// The menu button only shows on mobile, where it opens the sidebar drawer.
function Topbar({ title, menuButtonRef, menuOpen, sidebarId, onOpenMenu }) {
  const status = useSaveStatusStore((state) => state.status);
  const saveFailed = status === "error";
  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button menu-button"
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
        aria-controls={sidebarId}
        ref={menuButtonRef}
        onClick={onOpenMenu}
      >
        <Menu size={21} />
      </button>
      <div className="breadcrumbs">
        <span>Miga</span>
        <ChevronRight size={14} />
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <span
          className={`saved-status ${saveFailed ? "save-error" : ""}`}
          role="status"
          title={
            saveFailed
              ? "No pudimos guardar los últimos cambios. Revisá la conexión: la app vuelve a intentarlo sola."
              : undefined
          }
        >
          <span className="status-dot" />{" "}
          {statusLabels[status] ?? statusLabels.saved}
        </span>
      </div>
    </header>
  );
}

export default Topbar;
