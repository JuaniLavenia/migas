import { Box, Edit3, Plus, Search, Trash2 } from "lucide-react";
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
  return price === null ? "—" : `${currency.format(price)} / un`;
}

// Totals, not page sizes: "N items", or "N de M items" while searching.
function countLabel(matchCount, totalCount, searching) {
  const noun = totalCount === 1 ? "item" : "items";
  return searching
    ? `${matchCount} de ${totalCount} ${noun}`
    : `${totalCount} ${noun}`;
}

function PackagingRow({ item, onEdit, onDelete, reorderControls }) {
  return (
    <>
      {reorderControls}
      <div className="table-name">
        <span className="ingredient-icon">
          <Box size={17} />
        </span>
        <span>
          <strong>{item.name}</strong>
        </span>
      </div>
      <span>{item.packSize} un</span>
      <strong>{currency.format(item.packCost)}</strong>
      <span>{item.stock ?? 0} un</span>
      <span>{formatUnitPrice(item)}</span>
      <div className="row-actions">
        <button
          className="icon-button"
          title="Editar"
          aria-label="Editar"
          onClick={() => onEdit(item)}
        >
          <Edit3 size={16} />
        </button>
        <button
          className="icon-button danger"
          title="Eliminar"
          aria-label="Eliminar"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </>
  );
}

// `packaging` is the current page, already filtered and sorted. `reorder`
// ({ onReorder, onMove, firstId, lastId }) enables the custom order controls;
// null hides them. First/last refer to the full list, not the page.
function PackagingView({
  packaging,
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
      ids={packaging.map((item) => item.id)}
      getLabel={(id) => packaging.find((item) => item.id === id)?.name}
      onReorder={reorder.onReorder}
    >
      {packaging.map((item) => (
        <SortableItem key={item.id} id={item.id} className="table-row">
          {(handleProps) => (
            <PackagingRow
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
    packaging.map((item) => (
      <div className="table-row" key={item.id}>
        <PackagingRow item={item} onEdit={onEdit} onDelete={onDelete} />
      </div>
    ))
  );

  return (
    <>
      <PageHeader
        eyebrow="Inventario de packaging"
        title="Tu packaging."
        description="Bolsas, cajas y todo lo que usás para entregar. Lo sumás en cada pedido, no en la receta."
        action={
          <button className="primary-button" onClick={onAdd}>
            <Plus size={18} /> Nuevo packaging
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Buscar packaging"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar packaging..."
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
          <span>Packaging</span>
          <span>Presentación de compra</span>
          <span>Costo de compra</span>
          <span>Tengo</span>
          <span>Costo por unidad</span>
          <span />
        </div>
        {rows}
        {!packaging.length &&
          (totalCount === 0 ? (
            <div className="empty-state">
              <p>Todavía no cargaste packaging.</p>
              <button type="button" className="primary-button" onClick={onAdd}>
                <Plus size={16} /> Cargar el primer packaging
              </button>
            </div>
          ) : (
            <div className="empty-state">
              No encontramos packaging con ese nombre.
            </div>
          ))}
      </section>
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
      />
    </>
  );
}

export default PackagingView;
