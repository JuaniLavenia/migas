import { useState } from "react";
import { CloudUpload } from "lucide-react";
import ConfirmDialog from "../../shared/ConfirmDialog";
import { formatRelativeDate } from "../../lib/dates";

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function describe({ recipes, ingredients, categories }) {
  const parts = [
    plural(recipes, "receta", "recetas"),
    plural(ingredients, "insumo", "insumos"),
  ];
  if (categories) parts.push(plural(categories, "categoría", "categorías"));
  return parts.length === 3
    ? `${parts[0]}, ${parts[1]} y ${parts[2]}`
    : parts.join(" y ");
}

// The manual first upload of what this browser kept before the cloud.
// `summary` comes from readLocalData; `onUpload` resolves when done.
function LocalUploadPanel({ summary, busy, onUpload }) {
  const [confirming, setConfirming] = useState(false);
  const when = summary.lastChange ? formatRelativeDate(summary.lastChange) : "";
  const text = `En este dispositivo hay ${describe(summary)}.${
    when ? ` Última modificación: ${when}.` : ""
  }`;
  return (
    <section className="panel quick-panel" aria-labelledby="local-upload-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Primera carga</span>
          <h2 id="local-upload-title">Subir los datos de este dispositivo</h2>
        </div>
      </div>
      <p className="field-hint">{text}</p>
      {summary.photos > 0 && (
        <p className="field-hint">
          {summary.photos === 1
            ? "La foto guardada en este dispositivo no se sube: cargala como link."
            : `Las ${summary.photos} fotos guardadas en este dispositivo no se suben: cargalas como link.`}
        </p>
      )}
      <p className="field-hint">
        Fijate que la fecha sea la que esperás: si este dispositivo tiene datos
        viejos, mejor subilos desde el que usás siempre.
      </p>
      <button
        type="button"
        className="primary-button"
        disabled={busy}
        onClick={() => setConfirming(true)}
      >
        <CloudUpload size={16} /> Subir a la nube
      </button>
      <ConfirmDialog
        open={confirming}
        title="Subir los datos"
        description={`Vamos a subir ${describe(summary)} a tu cuenta. Después vas a verlos en todos tus dispositivos.`}
        confirmLabel="Subir"
        danger={false}
        onConfirm={() => {
          setConfirming(false);
          onUpload();
        }}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}

export default LocalUploadPanel;
