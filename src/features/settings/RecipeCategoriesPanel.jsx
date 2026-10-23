import { useState } from "react";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "../../shared/ConfirmDialog";

// Rename (on Enter or when leaving the field) and delete the recipe
// categories. `recipeCounts` maps a category id to how many recipes use it.
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

function RecipeCategoriesPanel({ categories, recipeCounts, onRename, onDelete }) {
  const [pending, setPending] = useState(null);
  const count = pending ? recipeCounts[pending.id] ?? 0 : 0;
  const consequence =
    count === 0
      ? "No la usa ninguna receta."
      : count === 1
        ? "1 receta queda sin categoría."
        : `${count} recetas quedan sin categoría.`;
  return (
    <section className="panel quick-panel" aria-labelledby="categories-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Recetas</span>
          <h2 id="categories-title">Categorías de recetas</h2>
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
        <p className="field-hint">
          Todavía no hay categorías. Creá la primera desde una receta, en el
          campo Categoría.
        </p>
      )}
      <ConfirmDialog
        open={pending !== null}
        title="Eliminar categoría"
        description={`¿Eliminar "${pending?.name}"? ${consequence}`}
        onConfirm={() => {
          onDelete(pending.id);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

export default RecipeCategoriesPanel;
