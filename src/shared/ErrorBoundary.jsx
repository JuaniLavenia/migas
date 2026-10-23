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

// Root boundary: a render error shows a recovery screen instead of a blank
// page. The data lives in the cloud; what an earlier version kept in this
// browser (not uploaded yet, maybe) can be downloaded, never deleted here.
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
            Probá reintentar: tus datos están guardados en la nube. Si este
            dispositivo tiene datos de antes de la nube, podés descargar una
            copia.
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
              Descargar datos de este dispositivo
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
