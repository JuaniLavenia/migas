import { useId, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { normalizePhotoUrl } from "../../lib/photoUrl";

// Photo of the recipe in the editor: a link (e.g. from Cloudinary) pasted
// and saved on Enter or when leaving the field. `onChange(url)` receives the
// link, or null to remove the photo.
function RecipeImageField({ url, onChange }) {
  const fieldId = useId();
  const [draft, setDraft] = useState(url ?? "");
  const [invalid, setInvalid] = useState(false);

  function commit() {
    if (draft.trim() === "") {
      setInvalid(false);
      if (url) onChange(null);
      return;
    }
    const next = normalizePhotoUrl(draft);
    setInvalid(next === null);
    if (next !== null) {
      setDraft(next);
      if (next !== url) onChange(next);
    }
  }

  return (
    <section className="recipe-image-field" aria-label="Foto de la receta">
      <div className="recipe-image-preview">
        {url ? (
          <img src={url} alt="" />
        ) : (
          <span className="recipe-image-placeholder">
            <ImageIcon size={20} />
            Sin foto
          </span>
        )}
      </div>
      <div className="recipe-image-url">
        <label htmlFor={`${fieldId}-url`}>Link de la foto</label>
        <input
          id={`${fieldId}-url`}
          type="url"
          inputMode="url"
          value={draft}
          placeholder="https://res.cloudinary.com/…"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${fieldId}-error` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
        />
        {invalid && (
          <p className="field-error" id={`${fieldId}-error`}>
            Pegá un link que empiece con https://
          </p>
        )}
        {url && (
          <button
            type="button"
            className="secondary-button danger"
            onClick={() => {
              setDraft("");
              setInvalid(false);
              onChange(null);
            }}
          >
            <Trash2 size={14} /> Quitar foto
          </button>
        )}
      </div>
    </section>
  );
}

export default RecipeImageField;
