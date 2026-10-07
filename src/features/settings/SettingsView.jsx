import { useRef } from "react";
import { ChevronRight, Download, Upload } from "lucide-react";
import PageHeader from "../../shared/PageHeader";

// Backup export/import. Reading the picked file happens here; parsing,
// validation and storing are up to the container (onImport receives the
// file text). `busy` disables both actions while one is in progress.
function SettingsView({ onExport, onImport, busy = false }) {
  const fileInputRef = useRef(null);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImport(reader.result);
    reader.readAsText(file);
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Tu backup."
        description="Descargá una copia de tus insumos y recetas, o importá un backup para restaurarlos o combinarlos con lo que ya tenés guardado."
      />
      <div className="overview-grid">
        <section className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Respaldo</span>
              <h2>Exportar e importar</h2>
            </div>
          </div>
          <button
            className="quick-action"
            onClick={onExport}
            disabled={busy}
            aria-busy={busy}
          >
            <span className="quick-icon mint">
              <Download size={19} />
            </span>
            <span>
              <strong>Descargar backup</strong>
              <small>
                Guarda insumos, recetas y sus fotos en un archivo .json
              </small>
            </span>
            <ChevronRight size={17} />
          </button>
          <button
            className="quick-action"
            onClick={handleImportClick}
            disabled={busy}
          >
            <span className="quick-icon peach">
              <Upload size={19} />
            </span>
            <span>
              <strong>Importar backup</strong>
              <small>
                Combina un archivo .json con lo que ya tenés guardado
              </small>
            </span>
            <ChevronRight size={17} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            aria-label="Archivo de backup"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </section>
      </div>
    </>
  );
}

export default SettingsView;
