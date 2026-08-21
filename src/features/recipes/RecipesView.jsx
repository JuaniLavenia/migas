import { ChevronRight, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import { currency, unitLabels } from "../../lib/format";
import { ingredientCost } from "../../lib/recipeMath";

function RecipesView({
  recipes,
  ingredients,
  selectedId,
  onSelect,
  onNew,
  totals,
  selectedRecipe,
  updateRecipe,
  onDelete,
}) {
  function updateItem(index, field, value) {
    updateRecipe(
      "items",
      selectedRecipe.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === "quantity" ? Number(value) : value }
          : item,
      ),
    );
  }
  function addItem() {
    const used = new Set(
      selectedRecipe.items.map((item) => item.ingredientId),
    );
    const next =
      ingredients.find((ingredient) => !used.has(ingredient.id)) ||
      ingredients[0];
    if (!next) return;
    updateRecipe("items", [
      ...selectedRecipe.items,
      { ingredientId: next.id, quantity: 0 },
    ]);
  }
  function removeItem(index) {
    updateRecipe(
      "items",
      selectedRecipe.items.filter((_, itemIndex) => itemIndex !== index),
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Calculadora de precios"
        title="Tus recetas."
        description="Probá distintos márgenes y rendimientos para encontrar tu precio de venta."
        action={
          <button className="primary-button" onClick={onNew}>
            <Plus size={18} /> Nueva receta
          </button>
        }
      />
      <div className="recipe-workspace">
        <div className="recipe-selector panel">
          <div className="selector-heading">
            <span className="eyebrow">Biblioteca</span>
            <strong>{recipes.length} recetas</strong>
          </div>
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onSelect(recipe.id)}
              className={`selector-item ${selectedId === recipe.id ? "selected" : ""}`}
            >
              <span className="selector-avatar">{recipe.name.charAt(0)}</span>
              <span>
                <strong>{recipe.name}</strong>
                <small>Rinde {recipe.yield} unidades</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        {selectedRecipe && (
          <div className="recipe-editor">
            <div className="editor-top">
              <div>
                <span className="eyebrow">Editando receta</span>
                <input
                  className="recipe-name-input"
                  value={selectedRecipe.name}
                  onChange={(event) =>
                    updateRecipe("name", event.target.value)
                  }
                />
              </div>
              <div className="editor-top-actions">
                <span className="updated-tag">
                  <span className="status-dot" /> {selectedRecipe.updated}
                </span>
                <button
                  type="button"
                  className="icon-button danger"
                  title="Eliminar receta"
                  onClick={() => onDelete(selectedRecipe.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="editor-grid">
              <div className="field-group">
                <label>Rendimiento</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="1"
                    value={selectedRecipe.yield}
                    onChange={(event) =>
                      updateRecipe("yield", event.target.value)
                    }
                  />
                  <span>unidades</span>
                </div>
              </div>
              <div className="field-group">
                <label>Margen de ganancia</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={selectedRecipe.margin}
                    onChange={(event) =>
                      updateRecipe("margin", event.target.value)
                    }
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="field-group">
                <label>Gastos extra</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={selectedRecipe.extras}
                    onChange={(event) =>
                      updateRecipe("extras", event.target.value)
                    }
                  />
                  <span>ARS</span>
                </div>
              </div>
            </div>
            <div className="editor-cost-card">
              <div>
                <span>Costo total</span>
                <strong>{currency.format(totals.cost)}</strong>
                <small>{selectedRecipe.items.length} insumos + extras</small>
              </div>
              <div className="cost-divider" />
              <div>
                <span>Costo unitario</span>
                <strong>{currency.format(totals.unitCost)}</strong>
                <small>por unidad producida</small>
              </div>
              <div className="suggested-price">
                <span>Precio sugerido</span>
                <strong>{currency.format(totals.price)}</strong>
                <small>margen del {selectedRecipe.margin}%</small>
              </div>
            </div>
            <div className="ingredients-used">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Composición</span>
                  <h3>Insumos utilizados</h3>
                </div>
                <span className="mini-label">Costo proporcional</span>
              </div>
              {selectedRecipe.items.map((item, index) => {
                const ingredient = ingredients.find(
                  (entry) => entry.id === item.ingredientId,
                );
                return (
                  <div className="used-row" key={index}>
                    <span className="used-dot" />
                    <select
                      value={item.ingredientId}
                      onChange={(event) =>
                        updateItem(index, "ingredientId", event.target.value)
                      }
                    >
                      {ingredients.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <div className="used-quantity">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, "quantity", event.target.value)
                        }
                      />
                      <span>{unitLabels[ingredient?.unit] || ingredient?.unit}</span>
                    </div>
                    <strong className="used-cost">
                      {currency.format(
                        ingredient
                          ? ingredientCost(ingredient, item.quantity)
                          : 0,
                      )}
                    </strong>
                    <button
                      type="button"
                      className="icon-button danger"
                      title="Quitar insumo"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="secondary-button"
                onClick={addItem}
                disabled={!ingredients.length}
              >
                <Plus size={16} /> Agregar insumo
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default RecipesView;
