import { useId, useState } from "react";
import ModalShell from "../../shared/ModalShell";

const byName = (a, b) => a.name.localeCompare(b.name, "es");

// A batch of finished goods: which recipe, how many units and the day it was
// made (today for a new one).
function FinishedGoodModal({ initial, recipes, today, onClose, onSave }) {
  const fieldId = useId();
  const options = [...recipes].sort(byName);
  const [form, setForm] = useState({
    recipeId: initial.recipeId ?? options[0]?.id ?? "",
    quantity: initial.quantity ?? "",
    madeAt: initial.madeAt ?? today,
  });
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const known = options.some((recipe) => recipe.id === form.recipeId);
  return (
    <ModalShell
      title={initial.id ? "Editar elaborados" : "Cargar elaborados"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ ...form, quantity: Number(form.quantity) });
        }}
      >
        <div className="form-grid">
          <div className="field-group full">
            <label htmlFor={`${fieldId}-recipe`}>Receta</label>
            <select
              id={`${fieldId}-recipe`}
              value={form.recipeId}
              onChange={(event) => change("recipeId", event.target.value)}
            >
              {!known && (
                <option value={form.recipeId} disabled>
                  Receta eliminada
                </option>
              )}
              {options.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-quantity`}>Unidades</label>
            <div className="input-with-suffix">
              <input
                id={`${fieldId}-quantity`}
                type="number"
                required
                min="1"
                step="any"
                value={form.quantity}
                onChange={(event) => change("quantity", event.target.value)}
                placeholder="10"
              />
              <span>un</span>
            </div>
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-made-at`}>Hecho el</label>
            <input
              id={`${fieldId}-made-at`}
              type="date"
              required
              max={today}
              value={form.madeAt}
              onChange={(event) => change("madeAt", event.target.value)}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar elaborados
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default FinishedGoodModal;
