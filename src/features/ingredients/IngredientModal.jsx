import { useId, useState } from "react";
import ModalShell from "../../shared/ModalShell";
import CategorySelect from "../../shared/CategorySelect";

const UNIT_NAMES = { g: "gramos", ml: "mililitros", un: "unidades" };

// `categories` are her ingredient categories; `onCreateCategory(name)`
// returns the id of the created (or existing) one.
function IngredientModal({ initial, categories, onCreateCategory, onClose, onSave }) {
  const fieldId = useId();
  const [form, setForm] = useState({
    name: initial.name || "",
    // An unknown category (deleted meanwhile) shows as "Sin categoría".
    categoryId: categories.some((category) => category.id === initial.categoryId)
      ? initial.categoryId
      : "",
    unit: initial.unit || "g",
    // ?? keeps a stored 0 visible (|| blanked a free ingredient's cost).
    packSize: initial.packSize ?? "",
    packCost: initial.packCost ?? "",
    stock: initial.stock ?? (initial.id ? 0 : ""),
  });
  const change = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  return (
    <ModalShell
      title={initial.id ? "Editar insumo" : "Nuevo insumo"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <div className="field-group full">
            <label htmlFor={`${fieldId}-name`}>Nombre del insumo</label>
            <input
              id={`${fieldId}-name`}
              required
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
              placeholder="Ej. Harina 0000"
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-category`}>Categoría</label>
            <CategorySelect
              id={`${fieldId}-category`}
              value={form.categoryId}
              categories={categories}
              onChange={(categoryId) => change("categoryId", categoryId)}
              onCreate={onCreateCategory}
              placeholder="Ej. Frutos secos"
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-unit`}>Unidad base</label>
            <select
              id={`${fieldId}-unit`}
              value={form.unit}
              onChange={(event) => change("unit", event.target.value)}
            >
              <option value="g">Gramos (g)</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="un">Unidades (un)</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-pack-size`}>Presentación de compra</label>
            <input
              id={`${fieldId}-pack-size`}
              required
              type="number"
              min="0.01"
              step="any"
              value={form.packSize}
              onChange={(event) => change("packSize", event.target.value)}
              placeholder="1000"
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-pack-cost`}>Costo de la presentación</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-pack-cost`}
                required
                type="number"
                min="0"
                step="any"
                value={form.packCost}
                onChange={(event) => change("packCost", event.target.value)}
                placeholder="1250"
              />
              <span>ARS</span>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-stock`}>Tengo</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-stock`}
                type="number"
                min="0"
                step="any"
                value={form.stock}
                onChange={(event) => change("stock", event.target.value)}
                placeholder="0"
                aria-describedby={`${fieldId}-stock-hint`}
              />
              <span>{form.unit}</span>
            </div>
            <p className="field-hint" id={`${fieldId}-stock-hint`}>
              Cuánto te queda, en {UNIT_NAMES[form.unit] ?? form.unit}.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar insumo
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default IngredientModal;
