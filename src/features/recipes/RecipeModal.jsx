import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ModalShell from "../../shared/ModalShell";

function RecipeModal({ ingredients, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    yield: 12,
    margin: 60,
    extras: 0,
    items: ingredients
      .slice(0, 3)
      .map((item) => ({ ingredientId: item.id, quantity: 0 })),
  });
  const updateItem = (index, field, value) =>
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === "quantity" ? Number(value) : value }
          : item,
      ),
    }));
  const addItem = () =>
    setForm((current) => {
      const used = new Set(current.items.map((item) => item.ingredientId));
      const next =
        ingredients.find((ingredient) => !used.has(ingredient.id)) ||
        ingredients[0];
      if (!next) return current;
      return {
        ...current,
        items: [...current.items, { ingredientId: next.id, quantity: 0 }],
      };
    });
  const removeItem = (index) =>
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  return (
    <ModalShell title="Nueva receta" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...form,
            items: form.items.filter((item) => item.quantity > 0),
          });
        }}
      >
        <div className="form-grid">
          <div className="field-group full">
            <label>Nombre de la receta</label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Ej. Budín de limón"
            />
          </div>
          <div className="field-group">
            <label>Rinde</label>
            <input
              type="number"
              min="1"
              value={form.yield}
              onChange={(event) =>
                setForm({ ...form, yield: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label>Margen</label>
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                step="any"
                value={form.margin}
                onChange={(event) =>
                  setForm({ ...form, margin: event.target.value })
                }
              />
              <span>%</span>
            </div>
          </div>
          <div className="field-group full">
            <label>Gastos extra</label>
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                step="any"
                value={form.extras}
                onChange={(event) =>
                  setForm({ ...form, extras: event.target.value })
                }
              />
              <span>ARS</span>
            </div>
          </div>
        </div>
        <div className="modal-subheading">Insumos de la receta</div>
        <div className="modal-ingredients">
          {form.items.map((item, index) => (
            <div className="modal-ingredient-row" key={index}>
              <select
                value={item.ingredientId}
                onChange={(event) =>
                  updateItem(index, "ingredientId", event.target.value)
                }
              >
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="any"
                value={item.quantity}
                onChange={(event) =>
                  updateItem(index, "quantity", event.target.value)
                }
                placeholder="Cantidad"
              />
              <span>
                {
                  ingredients.find(
                    (ingredient) => ingredient.id === item.ingredientId,
                  )?.unit
                }
              </span>
              <button
                type="button"
                className="icon-button danger"
                title="Quitar insumo"
                onClick={() => removeItem(index)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={addItem}
            disabled={!ingredients.length}
          >
            <Plus size={16} /> Agregar insumo
          </button>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Crear receta
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default RecipeModal;
