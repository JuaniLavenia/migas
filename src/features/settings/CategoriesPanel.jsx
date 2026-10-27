import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "../../shared/ConfirmDialog";

// Rename (on Enter or when leaving the field) and delete the recipe or
// ingredient categories. `counts` maps a category id to how many records use
// it; `consequence(count)` says what deleting it does to them.
function CategoryRow({ category, onRename, onDelete }) {
  const [name, setName] = useState(category.name);
  const commit = () => {
    if (name.trim()) onRename(category.id, name);
    else setName(category.name);
  };
  return (
    <li className="category-row">
      <input
        aria-label={`Nombre de ${category.name}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
      />
      <button
        type="button"
        className="icon-button danger"
        aria-label={`Eliminar ${category.name}`}
        title="Eliminar categoría"
        onClick={() => onDelete(category)}
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

function CategoriesPanel({
  eyebrow,
  title,
  emptyHint,
  categories,
  counts,
  consequence,
  onRename,
  onDelete,
}) {
  const titleId = useId();
  const [pending, setPending] = useState(null);
  const count = pending ? counts[pending.id] ?? 0 : 0;
  return (
    <section className="panel quick-panel" aria-labelledby={titleId}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={titleId}>{title}</h2>
        </div>
      </div>
      {categories.length ? (
        <ul className="category-list">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onRename={onRename}
              onDelete={setPending}
            />
          ))}
        </ul>
      ) : (
        <p className="field-hint">{emptyHint}</p>
      )}
      <ConfirmDialog
        open={pending !== null}
        title="Eliminar categoría"
        description={`¿Eliminar "${pending?.name}"? ${consequence(count)}`}
        onConfirm={() => {
          onDelete(pending.id);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

export default CategoriesPanel;
