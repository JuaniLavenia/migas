import { Component } from "react";
import { RECIPE_STORAGE_KEY as STORAGE_KEY } from "../lib/recipeStorage";

function readStoredData() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function downloadStoredData() {
  const raw = readStoredData();
  if (raw === null) return;
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `miga-datos-guardados-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetStoredData() {
  const confirmed = window.confirm(
    "Se van a borrar los insumos y recetas guardados en este navegador. ¿Descargaste una copia antes?",
  );
  if (!confirmed) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: reloading is still the best recovery we have.
  }
  window.location.reload();
}

// Root boundary: a render error shows a recovery screen instead of a blank
// page. Stored data is only reset on an explicit, confirmed click.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Miga crashed while rendering", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const hasStoredData = readStoredData() !== null;
    return (
      <div className="error-screen">
        <div className="panel error-card">
          <span className="eyebrow">Algo salió mal</span>
          <h1>No pudimos mostrar la app.</h1>
          <p>
            Probá reintentar. Si el problema sigue, puede que los datos
            guardados estén dañados: descargá una copia antes de
            restablecerlos.
          </p>
          <div className="error-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={downloadStoredData}
              disabled={!hasStoredData}
            >
              Descargar datos guardados
            </button>
            <button
              type="button"
              className="secondary-button danger"
              onClick={resetStoredData}
              disabled={!hasStoredData}
            >
              Restablecer datos
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
