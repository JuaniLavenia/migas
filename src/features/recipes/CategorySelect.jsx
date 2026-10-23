import { useState } from "react";

const NEW_CATEGORY = "__new__";

// Category of a recipe: none, one of `categories`, or a new one typed in
// place. `onCreate(name)` returns the id of the created (or existing) category,
// which is then selected through `onChange(id)`.
function CategorySelect({ id, value, categories, onChange, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function create() {
    const createdId = onCreate(name);
    if (!createdId) return;
    onChange(createdId);
    setCreating(false);
    setName("");
  }

  return (
    <>
      <select
        id={id}
        value={creating ? NEW_CATEGORY : value ?? ""}
        onChange={(event) => {
          if (event.target.value === NEW_CATEGORY) {
            setCreating(true);
            return;
          }
          setCreating(false);
          onChange(event.target.value);
        }}
      >
        <option value="">Sin categoría</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
        <option value={NEW_CATEGORY}>+ Nueva categoría</option>
      </select>
      {creating && (
        <div className="new-category">
          <input
            aria-label="Nueva categoría"
            value={name}
            autoFocus
            placeholder="Ej. Budines"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              // Enter must not submit the surrounding form.
              if (event.key === "Enter") {
                event.preventDefault();
                create();
              }
            }}
          />
          <button
            type="button"
            className="primary-button"
            onClick={create}
            disabled={!name.trim()}
          >
            Crear
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setCreating(false);
              setName("");
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </>
  );
}

export default CategorySelect;
