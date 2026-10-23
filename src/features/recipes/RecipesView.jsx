import { useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import NumericInput from "../../shared/NumericInput";
import SortControl from "../../shared/SortControl";
import ReorderControls from "../../shared/ReorderControls";
import { SortableItem, SortableList } from "../../shared/SortableList";
import { rectSortingStrategy } from "@dnd-kit/sortable";
import { currency } from "../../lib/format";
import { indexIngredients, recipePricing } from "../../lib/recipeMath";
import { addNextItem, removeItemAt, updateItemAt } from "../../lib/recipeItems";
import { formatRelativeDate } from "../../lib/dates";
import { UNCATEGORIZED } from "../../lib/recipeGroups";
import CategorySelect from "./CategorySelect";
import RecipeImageField from "./RecipeImageField";
import RecipeItemRow from "./RecipeItemRow";
import RecipeThumb from "./RecipeThumb";

function LibraryItem({ recipe, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(recipe.id)}
      className={`selector-item ${selected ? "selected" : ""}`}
      aria-current={selected ? "page" : undefined}
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

// The recipes of one library group, in order. In the custom order they can be
// dragged or moved inside the group: first/last are the group's edges.
function GroupItems({ recipes, selectedId, onSelect, reorder }) {
  if (!reorder) {
    return recipes.map((recipe) => (
      <LibraryItem
        key={recipe.id}
        recipe={recipe}
        selected={selectedId === recipe.id}
        onSelect={onSelect}
      />
    ));
  }
  const firstId = recipes[0]?.id;
  const lastId = recipes.at(-1)?.id;
  return (
    // The rect strategy works both for the desktop column and the
    // horizontal scroller on mobile.
    <SortableList
      ids={recipes.map((recipe) => recipe.id)}
      getLabel={(id) => recipes.find((recipe) => recipe.id === id)?.name}
      onReorder={reorder.onReorder}
      strategy={rectSortingStrategy}
    >
      {recipes.map((recipe) => (
        <SortableItem key={recipe.id} id={recipe.id} className="selector-row">
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
                canMoveUp={recipe.id !== firstId}
                canMoveDown={recipe.id !== lastId}
                onMove={(delta) => reorder.onMove(recipe.id, delta)}
              />
            </>
          )}
        </SortableItem>
      ))}
    </SortableList>
  );
}

function LibraryGroup({ group, collapsed, onToggle, children }) {
  const bodyId = useId();
  return (
    <div className="library-group">
      <button
        type="button"
        className="library-group-toggle"
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        {`${group.name} (${group.recipes.length})`}
      </button>
      <div className="library-group-body" id={bodyId} hidden={collapsed}>
        {children}
      </div>
    </div>
  );
}

const MARGIN_HINT = "100% = vendés al doble de lo que te cuesta";

// What the batch and each unit cost, next to what to sell each unit for:
// suggested (cost + her percentage), her own price and what she earns.
function PricingCard({ id, recipe, totals }) {
  const pricing = recipePricing(totals, recipe.salePrice);
  return (
    <div className="pricing-card">
      <div
        className="pricing-block"
        role="group"
        aria-labelledby={`${id}-cost-title`}
      >
        <span className="eyebrow" id={`${id}-cost-title`}>
          Lo que te cuesta
        </span>
        <dl>
          <div>
            <dt>Toda la tanda ({recipe.yield} u.)</dt>
            <dd>{currency.format(totals.cost)}</dd>
          </div>
          <div>
            <dt>Cada unidad</dt>
            <dd>{currency.format(totals.unitCost)}</dd>
          </div>
        </dl>
      </div>
      <div
        className="pricing-block selling"
        role="group"
        aria-labelledby={`${id}-price-title`}
      >
        <span className="eyebrow" id={`${id}-price-title`}>
          A cuánto venderlo (por unidad)
        </span>
        <dl>
          <div>
            <dt>Sugerido</dt>
            <dd>{currency.format(pricing.suggested)}</dd>
          </div>
          <div>
            <dt>Tu precio</dt>
            <dd>
              {pricing.salePrice === null
                ? "Sin cargar"
                : currency.format(pricing.salePrice)}
              {pricing.belowSuggestedPercent !== null && (
                <span className="price-warning">
                  <AlertTriangle size={13} aria-hidden="true" />
                  {`${pricing.belowSuggestedPercent}% debajo del sugerido`}
                </span>
              )}
            </dd>
          </div>
          <div className="pricing-profit">
            <dt>Ganás por unidad</dt>
            <dd>{currency.format(pricing.unitProfit)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

const ALL_CATEGORIES = "__all__";
const COLLAPSED_KEY = "miga-collapsed-categories";

// Which categories are collapsed is a per-browser convenience: it survives
// reloads when storage works and silently starts empty when it does not.
function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return new Set(JSON.parse(window.localStorage.getItem(COLLAPSED_KEY)) ?? []);
    } catch {
      return new Set();
    }
  });
  function toggleGroup(id) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        // Only this browser forgets the collapsed groups.
      }
      return next;
    });
  }
  return { collapsed, toggleGroup };
}

// `groups` ([{ id, name, recipes }]) is the visible library, already sorted
// and filtered; `grouped` shows the category headers and filter (there are
// categories). `recipeCount` is the total. `selectedRecipe` may be in a hidden
// group. `reorder` ({ onReorder, onMove }) enables the custom order controls;
// null hides them.
function RecipesView({
  groups,
  grouped,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  hasUncategorized,
  onCreateCategory,
  recipeCount,
  ingredients,
  sortOptions,
  sort,
  direction,
  onSortChange,
  onDirectionChange,
  selectedId,
  onSelect,
  onNew,
  totals,
  selectedRecipe,
  updateRecipe,
  onDelete,
  reorder = null,
}) {
  const fieldId = useId();
  const { collapsed, toggleGroup } = useCollapsedGroups();
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
          {grouped && (
            <div className="category-filter">
              <label htmlFor={`${fieldId}-filter`}>Categoría</label>
              <select
                id={`${fieldId}-filter`}
                value={categoryFilter ?? ALL_CATEGORIES}
                onChange={(event) =>
                  onCategoryFilterChange(
                    event.target.value === ALL_CATEGORIES
                      ? null
                      : event.target.value,
                  )
                }
              >
                <option value={ALL_CATEGORIES}>Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                {hasUncategorized && (
                  <option value={UNCATEGORIZED}>Sin categoría</option>
                )}
              </select>
            </div>
          )}
          <div className="selector-list">
            {groups.map((group) =>
              grouped ? (
                <LibraryGroup
                  key={group.id}
                  group={group}
                  collapsed={collapsed.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                >
                  <GroupItems
                    recipes={group.recipes}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    reorder={reorder}
                  />
                </LibraryGroup>
              ) : (
                <GroupItems
                  key={group.id}
                  recipes={group.recipes}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  reorder={reorder}
                />
              ),
            )}
          </div>
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
            <RecipeImageField
              url={selectedRecipe.imageUrl}
              onChange={(url) => updateRecipe("imageUrl", url)}
            />
            <div className="editor-grid">
              <div className="field-group">
                <label htmlFor={`${fieldId}-category`}>Categoría</label>
                <CategorySelect
                  id={`${fieldId}-category`}
                  value={selectedRecipe.categoryId}
                  categories={categories}
                  onChange={(id) => updateRecipe("categoryId", id)}
                  onCreate={onCreateCategory}
                />
              </div>
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
                <label htmlFor={`${fieldId}-margin`}>
                  Ganancia sobre el costo (%)
                </label>
                <div className="input-with-suffix">
                  <NumericInput
                    id={`${fieldId}-margin`}
                    min={0}
                    value={selectedRecipe.margin}
                    onChange={(value) => updateRecipe("margin", value)}
                    aria-describedby={`${fieldId}-margin-hint`}
                  />
                  <span>%</span>
                </div>
                <p className="field-hint" id={`${fieldId}-margin-hint`}>
                  {MARGIN_HINT}
                </p>
              </div>
              <div className="field-group">
                <label htmlFor={`${fieldId}-sale-price`}>Precio de venta</label>
                <div className="input-with-suffix">
                  <NumericInput
                    id={`${fieldId}-sale-price`}
                    min={0}
                    allowEmpty
                    value={selectedRecipe.salePrice}
                    onChange={(value) => updateRecipe("salePrice", value)}
                    placeholder="Sin cargar"
                  />
                  <span>ARS</span>
                </div>
                <p className="field-hint">Por unidad, el de tu catálogo.</p>
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
                  : fue eliminado o tiene una presentación de compra inválida. El
                  costo total está incompleto.
                </span>
              </div>
            )}
            <PricingCard
              id={fieldId}
              recipe={selectedRecipe}
              totals={totals}
            />
            <div className="ingredients-used">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Composición</span>
                  <h2 className="subsection-title">Insumos utilizados</h2>
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
                aria-describedby={
                  ingredients.length ? undefined : `${fieldId}-no-ingredients`
                }
              >
                <Plus size={16} /> Agregar insumo
              </button>
              {!ingredients.length && (
                <p className="field-hint" id={`${fieldId}-no-ingredients`}>
                  Primero cargá insumos en la sección Insumos.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default RecipesView;
