import { Trash2 } from "lucide-react";
import NumericInput from "../../shared/NumericInput";
import { currency, unitLabels } from "../../lib/format";
import { ingredientCost } from "../../lib/recipeMath";

// One editable recipe line: ingredient select, quantity, unit and remove
// button. `ingredient` is the line's ingredient (undefined when it was
// deleted, which shows a disabled "Insumo eliminado" option). The "editor"
// variant (recipe editor, `.used-row`) adds the dot, the unit label and the
// line cost; the "modal" variant (new recipe modal, `.modal-ingredient-row`)
// shows the raw unit.
function RecipeItemRow({
  item,
  ingredient,
  ingredients,
  onChange,
  onRemove,
  variant = "editor",
}) {
  const editor = variant === "editor";
  const select = (
    <select
      aria-label="Insumo"
      value={item.ingredientId}
      onChange={(event) => onChange("ingredientId", event.target.value)}
    >
      {!ingredient && (
        <option value={item.ingredientId} disabled>
          Insumo eliminado
        </option>
      )}
      {ingredients.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
  const quantity = (
    <NumericInput
      aria-label="Cantidad"
      min={0}
      value={item.quantity}
      onChange={(value) => onChange("quantity", value)}
      placeholder={editor ? undefined : "Cantidad"}
    />
  );
  const remove = (
    <button
      type="button"
      className="icon-button danger"
      title="Quitar insumo"
      aria-label="Quitar insumo"
      onClick={onRemove}
    >
      <Trash2 size={14} />
    </button>
  );

  if (!editor) {
    return (
      <div className="modal-ingredient-row">
        {select}
        {quantity}
        <span>{ingredient?.unit}</span>
        {remove}
      </div>
    );
  }
  return (
    <div className="used-row">
      <span className="used-dot" />
      {select}
      <div className="used-quantity">
        {quantity}
        <span>{unitLabels[ingredient?.unit] || ingredient?.unit}</span>
      </div>
      <strong className="used-cost">
        {currency.format(
          ingredient ? ingredientCost(ingredient, item.quantity) : 0,
        )}
      </strong>
      {remove}
    </div>
  );
}

export default RecipeItemRow;
