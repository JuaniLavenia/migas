import { useId } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import { currency } from "../../lib/format";
import { ORDER_STATUSES, dueLabel, paymentStatus } from "../../lib/orders";

// "16 Cookies · 1 Torta · 2 Box x8 · Personalizado". Lines whose recipe or
// packaging was deleted keep their quantity, so nothing silently disappears.
function contentsLabel(order, { recipes, packaging }) {
  const products = (order.items ?? []).map(({ recipeId, quantity }) => {
    const recipe = recipes.find((entry) => entry.id === recipeId);
    return recipe ? `${quantity} ${recipe.name}` : `${quantity} (receta eliminada)`;
  });
  const extras = (order.packagingItems ?? []).map(({ packagingId, quantity }) => {
    const item = packaging.find((entry) => entry.id === packagingId);
    return item ? `${quantity} ${item.name}` : `${quantity} (packaging eliminado)`;
  });
  const custom = order.customization ? ["Personalizado"] : [];
  return [...products, ...extras, ...custom].join(" · ") || "Sin productos";
}

function paymentLabel(order) {
  const payment = paymentStatus(order);
  return payment.value === "deposit"
    ? `${payment.label} · falta ${currency.format(payment.balance)}`
    : payment.label;
}

function countLabel(matchCount, filteredCount, searching) {
  const noun = filteredCount === 1 ? "pedido" : "pedidos";
  return searching
    ? `${matchCount} de ${filteredCount} ${noun}`
    : `${filteredCount} ${noun}`;
}

function OrderCard({ order, catalog, onEdit, onDelete, onStatusChange }) {
  const payment = paymentStatus(order);
  return (
    <article className="order-card panel" aria-label={`Pedido de ${order.client}`}>
      <div className="order-card-top">
        <div>
          <strong className="order-client">{order.client}</strong>
          {order.contact && <span className="order-contact">{order.contact}</span>}
        </div>
        <div className="row-actions">
          <button
            className="icon-button"
            title="Editar"
            aria-label="Editar"
            onClick={() => onEdit(order)}
          >
            <Edit3 size={16} />
          </button>
          <button
            className="icon-button danger"
            title="Eliminar"
            aria-label="Eliminar"
            onClick={() => onDelete(order)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <p className="order-due">
        <span>{dueLabel(order)}</span>
        <span className="order-delivery">
          {order.delivery === "delivery" ? "Envío" : "Retira"}
        </span>
      </p>
      <p className="order-contents">{contentsLabel(order, catalog)}</p>
      {order.notes && <p className="order-notes">{order.notes}</p>}
      <div className="order-card-bottom">
        <select
          className="order-status"
          data-status={order.status}
          aria-label={`Estado del pedido de ${order.client}`}
          value={order.status}
          onChange={(event) => onStatusChange(order.id, event.target.value)}
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <span className="order-payment" data-payment={payment.value}>
          {paymentLabel(order)}
        </span>
        <strong className="order-price">{currency.format(order.price)}</strong>
      </div>
    </article>
  );
}

// `groups` come from groupOrders, already filtered and searched. `catalog`
// ({ recipes, ingredients, packaging }) names the lines of each order.
function OrdersView({
  groups,
  catalog,
  matchCount,
  filteredCount,
  totalCount,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const filterId = useId();
  return (
    <>
      <PageHeader
        eyebrow="Pedidos"
        title="Tus pedidos."
        description="Lo que te encargaron, ordenado por fecha de entrega. Cambiá el estado con un toque."
        action={
          <button className="primary-button" onClick={onAdd}>
            <Plus size={18} /> Nuevo pedido
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Buscar por cliente"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por cliente..."
          />
        </div>
        <div className="toolbar-actions">
          <div className="sort-control">
            <label htmlFor={filterId}>Mostrar</label>
            <select
              id={filterId}
              value={filter}
              onChange={(event) => onFilterChange(event.target.value)}
            >
              <option value="open">Pedidos activos</option>
              <option value="all">Todos</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <span className="toolbar-count">
            {countLabel(matchCount, filteredCount, search.trim() !== "")}
          </span>
        </div>
      </div>
      {groups.map((group) => (
        <section
          key={group.id}
          className={`order-group ${group.id === "overdue" ? "overdue" : ""}`}
          aria-label={group.label}
        >
          <h2>
            {group.label} <span>{group.orders.length}</span>
          </h2>
          <div className="order-list">
            {group.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                catalog={catalog}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </section>
      ))}
      {!groups.length && (
        <section className="panel">
          {totalCount === 0 ? (
            <div className="empty-state">
              <p>Todavía no cargaste pedidos.</p>
              <button type="button" className="primary-button" onClick={onAdd}>
                <Plus size={16} /> Cargar el primer pedido
              </button>
            </div>
          ) : (
            <div className="empty-state">No hay pedidos con ese filtro.</div>
          )}
        </section>
      )}
    </>
  );
}

export default OrdersView;
