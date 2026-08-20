import { useRef } from "react";
import { ChevronRight, Download, Upload } from "lucide-react";
import PageHeader from "../../shared/PageHeader";

function buildBackup(ingredients, recipes) {
  return JSON.stringify({ ingredients, recipes }, null, 2);
}

function SettingsView({ ingredients, recipes, onImport, onToast }) {
  const fileInputRef = useRef(null);

  function handleExport() {
    const blob = new Blob([buildBackup(ingredients, recipes)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `miga-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onToast("Backup descargado");
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (
          !Array.isArray(data.ingredients) &&
          !Array.isArray(data.recipes)
        ) {
          throw new Error("invalid backup shape");
        }
        onImport(data);
        onToast("Backup importado");
      } catch {
        onToast("No pudimos leer ese archivo");
      }
    };
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
          <button className="quick-action" onClick={handleExport}>
            <span className="quick-icon mint">
              <Download size={19} />
            </span>
            <span>
              <strong>Descargar backup</strong>
              <small>Guarda insumos y recetas en un archivo .json</small>
            </span>
            <ChevronRight size={17} />
          </button>
          <button className="quick-action" onClick={handleImportClick}>
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
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </section>
      </div>
    </>
  );
}

export default SettingsView;
