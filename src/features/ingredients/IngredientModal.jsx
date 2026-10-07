import { useId, useState } from "react";
import ModalShell from "../../shared/ModalShell";

function IngredientModal({ initial, onClose, onSave }) {
  const fieldId = useId();
  const [form, setForm] = useState({
    name: initial.name || "",
    category: initial.category || "Secos",
    unit: initial.unit || "g",
    // ?? keeps a stored 0 visible (|| blanked a free ingredient's cost).
    packSize: initial.packSize ?? "",
    packCost: initial.packCost ?? "",
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
            <input
              id={`${fieldId}-category`}
              value={form.category}
              onChange={(event) => change("category", event.target.value)}
              placeholder="Ej. Secos"
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
            <label htmlFor={`${fieldId}-pack-size`}>Contenido del pack</label>
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
            <label htmlFor={`${fieldId}-pack-cost`}>Costo del pack</label>
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
