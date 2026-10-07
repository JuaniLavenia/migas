import { useId, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import ModalShell from "../../shared/ModalShell";
import NumericInput from "../../shared/NumericInput";
import { addNextItem, removeItemAt, updateItemAt } from "../../lib/recipeItems";
import { indexIngredients } from "../../lib/recipeMath";
import RecipeItemRow from "./RecipeItemRow";

function RecipeModal({ ingredients, onClose, onSave }) {
  const fieldId = useId();
  const [form, setForm] = useState({
    name: "",
    yield: 12,
    margin: 60,
    extras: 0,
    items: ingredients
      .slice(0, 3)
      .map((item) => ({ ingredientId: item.id, quantity: 0 })),
  });
  const byId = useMemo(() => indexIngredients(ingredients), [ingredients]);
  const setItems = (change) =>
    setForm((current) => {
      const items = change(current.items);
      return items === current.items ? current : { ...current, items };
    });
  const updateItem = (index, field, value) =>
    setItems((items) => updateItemAt(items, index, field, value));
  const addItem = () => setItems((items) => addNextItem(items, ingredients));
  const removeItem = (index) =>
    setItems((items) => removeItemAt(items, index));
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
            <label htmlFor={`${fieldId}-name`}>Nombre de la receta</label>
            <input
              id={`${fieldId}-name`}
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Ej. Budín de limón"
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-yield`}>Rinde</label>
            <NumericInput
              id={`${fieldId}-yield`}
              min={1}
              value={form.yield}
              onChange={(value) => setForm({ ...form, yield: value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldId}-margin`}>Margen</label>
            <div className="input-with-suffix">
              <NumericInput
                id={`${fieldId}-margin`}
                min={0}
                value={form.margin}
                onChange={(value) => setForm({ ...form, margin: value })}
              />
              <span>%</span>
            </div>
          </div>
          <div className="field-group full">
            <label htmlFor={`${fieldId}-extras`}>Gastos extra</label>
            <div className="input-with-suffix">
              <NumericInput
                id={`${fieldId}-extras`}
                min={0}
                value={form.extras}
                onChange={(value) => setForm({ ...form, extras: value })}
              />
              <span>ARS</span>
            </div>
          </div>
        </div>
        <div className="modal-subheading">Insumos de la receta</div>
        <div className="modal-ingredients">
          {form.items.map((item, index) => (
            <RecipeItemRow
              key={index}
              variant="modal"
              item={item}
              ingredient={byId.get(item.ingredientId)}
              ingredients={ingredients}
              onChange={(field, value) => updateItem(index, field, value)}
              onRemove={() => removeItem(index)}
            />
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
