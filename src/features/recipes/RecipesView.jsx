import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import NumericInput from "../../shared/NumericInput";
import Pagination from "../../shared/Pagination";
import SortControl from "../../shared/SortControl";
import ReorderControls from "../../shared/ReorderControls";
import { SortableItem, SortableList } from "../../shared/SortableList";
import { rectSortingStrategy } from "@dnd-kit/sortable";
import { currency, unitLabels } from "../../lib/format";
import { ingredientCost } from "../../lib/recipeMath";
import { formatRelativeDate } from "../../lib/dates";

function LibraryItem({ recipe, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(recipe.id)}
      className={`selector-item ${selected ? "selected" : ""}`}
    >
      <span className="selector-avatar">{recipe.name.charAt(0)}</span>
      <span>
        <strong>{recipe.name}</strong>
        <small>Rinde {recipe.yield} unidades</small>
      </span>
    </button>
  );
}

// `recipes` is the current library page, already sorted; `recipeCount` is the
// total. `selectedRecipe` may be on another page. `reorder` ({ onReorder,
// onMove, firstId, lastId }) enables the custom order controls; null hides
// them. First/last refer to the full library, not the page.
function RecipesView({
  recipes,
  recipeCount,
  ingredients,
  sortOptions,
  sort,
  direction,
  onSortChange,
  onDirectionChange,
  page,
  pageCount,
  onPageChange,
  selectedId,
  onSelect,
  onNew,
  totals,
  selectedRecipe,
  updateRecipe,
  onDelete,
  reorder = null,
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
        <section
          className="recipe-selector panel"
          aria-label="Biblioteca de recetas"
        >
          <div className="selector-heading">
            <span className="eyebrow">Biblioteca</span>
            <strong>{recipeCount} recetas</strong>
          </div>
          {recipeCount > 1 && (
            <SortControl
              options={sortOptions}
              sort={sort}
              direction={direction}
              onSortChange={onSortChange}
              onDirectionChange={onDirectionChange}
            />
          )}
          <div className="selector-list">
            {reorder ? (
              // The rect strategy works both for the desktop column and the
              // horizontal scroller on mobile.
              <SortableList
                ids={recipes.map((recipe) => recipe.id)}
                getLabel={(id) =>
                  recipes.find((recipe) => recipe.id === id)?.name
                }
                onReorder={reorder.onReorder}
                strategy={rectSortingStrategy}
              >
                {recipes.map((recipe) => (
                  <SortableItem
                    key={recipe.id}
                    id={recipe.id}
                    className="selector-row"
                  >
                    {(handleProps) => (
                      <>
                        <LibraryItem
                          recipe={recipe}
                          selected={selectedId === recipe.id}
                          onSelect={onSelect}
                        />
                        <ReorderControls
                          id={recipe.id}
                          name={recipe.name}
                          handleProps={handleProps}
                          stacked
                          canMoveUp={recipe.id !== reorder.firstId}
                          canMoveDown={recipe.id !== reorder.lastId}
                          onMove={(delta) => reorder.onMove(recipe.id, delta)}
                        />
                      </>
                    )}
                  </SortableItem>
                ))}
              </SortableList>
            ) : (
              recipes.map((recipe) => (
                <LibraryItem
                  key={recipe.id}
                  recipe={recipe}
                  selected={selectedId === recipe.id}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
          <Pagination
            className="pagination-compact"
            page={page}
            pageCount={pageCount}
            onPageChange={onPageChange}
          />
        </section>
        {!selectedRecipe && (
          <div className="panel empty-state">
            <p>Todavía no hay recetas.</p>
            <button className="primary-button" onClick={onNew}>
              <Plus size={18} /> Crear receta
            </button>
          </div>
        )}
        {selectedRecipe && (
          <div className="recipe-editor" key={selectedRecipe.id}>
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
                  <span className="status-dot" />{" "}
                  {formatRelativeDate(selectedRecipe.updatedAt)}
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
                  <NumericInput
                    min={1}
                    value={selectedRecipe.yield}
                    onChange={(value) => updateRecipe("yield", value)}
                  />
                  <span>unidades</span>
                </div>
              </div>
              <div className="field-group">
                <label>Margen de ganancia</label>
                <div className="input-with-suffix">
                  <NumericInput
                    min={0}
                    value={selectedRecipe.margin}
                    onChange={(value) => updateRecipe("margin", value)}
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="field-group">
                <label>Gastos extra</label>
                <div className="input-with-suffix">
                  <NumericInput
                    min={0}
                    value={selectedRecipe.extras}
                    onChange={(value) => updateRecipe("extras", value)}
                  />
                  <span>ARS</span>
                </div>
              </div>
            </div>
            {totals.missingCount > 0 && (
              <div className="recipe-warning" role="alert">
                <AlertTriangle size={16} />
                <span>
                  {totals.missingCount === 1
                    ? "1 insumo de esta receta no tiene costo"
                    : `${totals.missingCount} insumos de esta receta no tienen costo`}
                  : fue eliminado o tiene un contenido de pack inválido. El
                  costo total está incompleto.
                </span>
              </div>
            )}
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
                    <div className="used-quantity">
                      <NumericInput
                        min={0}
                        value={item.quantity}
                        onChange={(value) =>
                          updateItem(index, "quantity", value)
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
