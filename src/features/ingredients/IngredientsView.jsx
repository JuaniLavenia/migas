import { Edit3, Package, Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import Pagination from "../../shared/Pagination";
import SortControl from "../../shared/SortControl";
import ReorderControls from "../../shared/ReorderControls";
import { SortableItem, SortableList } from "../../shared/SortableList";
import { currency } from "../../lib/format";
import { unitPrice } from "../../lib/recipeMath";

function formatUnitPrice(item) {
  const price = unitPrice(item);
  // Invalid pack size: show the price as unavailable instead of Infinity/NaN.
  return price === null ? "—" : `${currency.format(price)} / ${item.unit}`;
}

// Totals, not page sizes: "N insumos", or "N de M insumos" while searching.
function countLabel(matchCount, totalCount, searching) {
  return searching
    ? `${matchCount} de ${totalCount} insumos`
    : `${totalCount} insumos`;
}

function IngredientRow({ item, onEdit, onDelete, reorderControls }) {
  return (
    <>
      {reorderControls}
      <div className="table-name">
        <span className="ingredient-icon">
          <Package size={17} />
        </span>
        <span>
          <strong>{item.name}</strong>
          <small>{item.category}</small>
        </span>
      </div>
      <span>
        {item.packSize} {item.unit}
      </span>
      <strong>{currency.format(item.packCost)}</strong>
      <span>{formatUnitPrice(item)}</span>
      <div className="row-actions">
        <button
          className="icon-button"
          title="Editar"
          onClick={() => onEdit(item)}
        >
          <Edit3 size={16} />
        </button>
        <button
          className="icon-button danger"
          title="Eliminar"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </>
  );
}

// `ingredients` is the current page, already filtered and sorted. `reorder`
// ({ onReorder, onMove, firstId, lastId }) enables the custom order controls;
// null hides them. First/last refer to the full list, not the page.
function IngredientsView({
  ingredients,
  matchCount,
  totalCount,
  search,
  setSearch,
  sortOptions,
  sort,
  direction,
  onSortChange,
  onDirectionChange,
  page,
  pageCount,
  onPageChange,
  onAdd,
  onEdit,
  onDelete,
  reorder = null,
}) {
  const rows = reorder ? (
    <SortableList
      ids={ingredients.map((item) => item.id)}
      getLabel={(id) => ingredients.find((item) => item.id === id)?.name}
      onReorder={reorder.onReorder}
    >
      {ingredients.map((item) => (
        <SortableItem key={item.id} id={item.id} className="table-row">
          {(handleProps) => (
            <IngredientRow
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              reorderControls={
                <ReorderControls
                  id={item.id}
                  name={item.name}
                  handleProps={handleProps}
                  canMoveUp={item.id !== reorder.firstId}
                  canMoveDown={item.id !== reorder.lastId}
                  onMove={(delta) => reorder.onMove(item.id, delta)}
                />
              }
            />
          )}
        </SortableItem>
      ))}
    </SortableList>
  ) : (
    ingredients.map((item) => (
      <div className="table-row" key={item.id}>
        <IngredientRow item={item} onEdit={onEdit} onDelete={onDelete} />
      </div>
    ))
  );

  return (
    <>
      <PageHeader
        eyebrow="Inventario de costos"
        title="Tus insumos."
        description="Mantené actualizados los precios de compra para que cada receta sea confiable."
        action={
          <button className="primary-button" onClick={onAdd}>
            <Plus size={18} /> Nuevo insumo
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar insumo o categoría..."
          />
        </div>
        <div className="toolbar-actions">
          <SortControl
            options={sortOptions}
            sort={sort}
            direction={direction}
            onSortChange={onSortChange}
            onDirectionChange={onDirectionChange}
          />
          <span className="toolbar-count">
            {countLabel(matchCount, totalCount, search !== "")}
          </span>
        </div>
      </div>
      <section
        className={`panel table-panel ${reorder ? "reorderable" : ""}`}
      >
        <div className="table-header">
          {reorder && <span>Orden</span>}
          <span>Insumo</span>
          <span>Presentación</span>
          <span>Costo de compra</span>
          <span>Costo por unidad</span>
          <span />
        </div>
        {rows}
        {!ingredients.length && (
          <div className="empty-state">
            No encontramos insumos con ese nombre.
          </div>
        )}
      </section>
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
      />
    </>
  );
}

export default IngredientsView;
