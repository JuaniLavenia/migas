import { useId, useMemo } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import NumericInput from "../../shared/NumericInput";
import Pagination from "../../shared/Pagination";
import SortControl from "../../shared/SortControl";
import ReorderControls from "../../shared/ReorderControls";
import { SortableItem, SortableList } from "../../shared/SortableList";
import { rectSortingStrategy } from "@dnd-kit/sortable";
import { currency } from "../../lib/format";
import { indexIngredients } from "../../lib/recipeMath";
import { addNextItem, removeItemAt, updateItemAt } from "../../lib/recipeItems";
import { formatRelativeDate } from "../../lib/dates";
import RecipeImageField from "./RecipeImageField";
import RecipeItemRow from "./RecipeItemRow";
import RecipeThumb from "./RecipeThumb";

function LibraryItem({ recipe, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(recipe.id)}
      className={`selector-item ${selected ? "selected" : ""}`}
    >
      <RecipeThumb
        recipe={recipe}
        className="selector-avatar"
        fallback={
          <span className="selector-avatar">{recipe.name.charAt(0)}</span>
        }
      />
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
// them. First/last refer to the full library, not the page. `imageField`
// holds the props of the open recipe's RecipeImageField.
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
  imageField,
  reorder = null,
}) {
  const fieldId = useId();
  const byId = useMemo(() => indexIngredients(ingredients), [ingredients]);
  function setItems(items) {
    if (items !== selectedRecipe.items) updateRecipe("items", items);
  }
  function updateItem(index, field, value) {
    setItems(updateItemAt(selectedRecipe.items, index, field, value));
  }
  function addItem() {
    setItems(addNextItem(selectedRecipe.items, ingredients));
  }
  function removeItem(index) {
    setItems(removeItemAt(selectedRecipe.items, index));
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
                  aria-label="Nombre de la receta"
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
                  aria-label="Eliminar receta"
                  onClick={() => onDelete(selectedRecipe.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {imageField && <RecipeImageField {...imageField} />}
            <div className="editor-grid">
              <div className="field-group">
                <label htmlFor={`${fieldId}-yield`}>Rendimiento</label>
                <div className="input-with-suffix">
                  <NumericInput
                    id={`${fieldId}-yield`}
                    min={1}
                    value={selectedRecipe.yield}
                    onChange={(value) => updateRecipe("yield", value)}
                  />
                  <span>unidades</span>
                </div>
              </div>
              <div className="field-group">
                <label htmlFor={`${fieldId}-margin`}>Margen de ganancia</label>
                <div className="input-with-suffix">
                  <NumericInput
                    id={`${fieldId}-margin`}
                    min={0}
                    value={selectedRecipe.margin}
                    onChange={(value) => updateRecipe("margin", value)}
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="field-group">
                <label htmlFor={`${fieldId}-extras`}>Gastos extra</label>
                <div className="input-with-suffix">
                  <NumericInput
                    id={`${fieldId}-extras`}
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
              {selectedRecipe.items.map((item, index) => (
                <RecipeItemRow
                  key={index}
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
          </div>
        )}
      </div>
    </>
  );
}

export default RecipesView;
