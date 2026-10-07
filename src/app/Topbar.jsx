import { ChevronRight, Menu } from "lucide-react";
import useSaveStatusStore from "../stores/useSaveStatusStore";

function Topbar({ title, onOpenMenu }) {
  const saveFailed = useSaveStatusStore((state) => state.status === "error");
  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button menu-button"
        aria-label="Abrir menú"
        onClick={onOpenMenu}
      >
        <Menu size={21} />
      </button>
      <div className="breadcrumbs">
        <span>Workspace</span>
        <ChevronRight size={14} />
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <span
          className={`saved-status ${saveFailed ? "save-error" : ""}`}
          role="status"
          title={
            saveFailed
              ? "El navegador no dejó guardar los cambios. Descargá un backup desde Configuración para no perderlos."
              : undefined
          }
        >
          <span className="status-dot" />{" "}
          {saveFailed ? "No se pudo guardar" : "Guardado localmente"}
        </span>
        <button type="button" className="avatar small" aria-label="Mi perfil">
          MP
        </button>
      </div>
    </header>
  );
}

export default Topbar;
