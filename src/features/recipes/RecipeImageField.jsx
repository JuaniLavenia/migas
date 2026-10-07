import { Camera, ImageIcon, Trash2 } from "lucide-react";

const statusText = {
  none: "Sin foto",
  loading: "Cargando foto…",
  missing: "No encontramos la foto",
  error: "No pudimos cargar la foto",
};

// Photo of the recipe in the editor. `available` is null while checking
// whether images can be stored, then true or false.
function RecipeImageField({
  recipeName,
  hasImage,
  url,
  status,
  available,
  busy,
  onPick,
  onRemove,
}) {
  if (available === false) {
    return (
      <section className="recipe-image-field" aria-label="Foto de la receta">
        <p className="recipe-image-note">
          Las fotos no están disponibles en este navegador (por ejemplo, en
          modo privado). Tus recetas se guardan igual.
        </p>
      </section>
    );
  }

  return (
    <section className="recipe-image-field" aria-label="Foto de la receta">
      <div className="recipe-image-preview">
        {url ? (
          <img src={url} alt={recipeName} />
        ) : (
          <span className="recipe-image-placeholder">
            <ImageIcon size={20} />
            {statusText[status] ?? statusText.none}
          </span>
        )}
      </div>
      {available && (
        <div className="recipe-image-actions">
          <label
            className={`secondary-button file-button ${busy ? "busy" : ""}`}
          >
            <Camera size={16} />
            {hasImage ? "Cambiar foto" : "Agregar foto"}
            <input
              type="file"
              accept="image/*"
              className="visually-hidden"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Picking the same file again must fire onChange too.
                event.target.value = "";
                if (file) onPick(file);
              }}
            />
          </label>
          {hasImage && (
            <button
              type="button"
              className="secondary-button danger"
              onClick={onRemove}
              disabled={busy}
            >
              <Trash2 size={14} /> Quitar foto
            </button>
          )}
          {busy && (
            <span className="recipe-image-note" aria-live="polite">
              Guardando foto…
            </span>
          )}
        </div>
      )}
    </section>
  );
}

export default RecipeImageField;
