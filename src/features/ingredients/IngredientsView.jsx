import { Edit3, Package, Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import Pagination from "../../shared/Pagination";
import SortControl from "../../shared/SortControl";
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

// `ingredients` is the current page, already filtered and sorted.
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
}) {
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
      <section className="panel table-panel">
        <div className="table-header">
          <span>Insumo</span>
          <span>Presentación</span>
          <span>Costo de compra</span>
          <span>Costo por unidad</span>
          <span />
        </div>
        {ingredients.map((item) => (
          <div className="table-row" key={item.id}>
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
            <span>
              {formatUnitPrice(item)}
            </span>
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
          </div>
        ))}
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
