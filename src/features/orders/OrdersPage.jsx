import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import ConfirmDialog from "../../shared/ConfirmDialog";
import { groupOrders, isClosed, repeatDraft, todayKey } from "../../lib/orders";
import { stockTransition } from "../../lib/stockMoves";
import { stockValue } from "../../lib/stock";
import OrdersView from "./OrdersView";
import OrderModal from "./OrderModal";
import ShortageDialog from "./ShortageDialog";

const STOCK_TOASTS = {
  deduct: "Descontamos el stock del pedido",
  undo: "Devolvimos el stock del pedido",
  cancel: "Lo cocinado quedó en Elaborados",
};

// "open": everything but delivered and cancelled (the default); "all"; or one
// status value.
function matchesFilter(order, filter) {
  if (filter === "open") return !isClosed(order.status);
  if (filter === "all") return true;
  return order.status === filter;
}

function matchesSearch(order, search) {
  const query = search.trim().toLowerCase();
  return (
    !query ||
    order.client.toLowerCase().includes(query) ||
    (order.contact ?? "").toLowerCase().includes(query)
  );
}

// Container of the orders view: status filter, search by client, grouping
// by delivery date, the quick status change, the create/edit modal and the
// delete confirmation.
function OrdersPage() {
  const orders = useRecipeStore((state) => state.orders);
  const recipes = useRecipeStore((state) => state.recipes);
  const ingredients = useRecipeStore((state) => state.ingredients);
  const packaging = useRecipeStore((state) => state.packaging);
  const addOrder = useRecipeStore((state) => state.addOrder);
  const updateOrder = useRecipeStore((state) => state.updateOrder);
  const deleteOrder = useRecipeStore((state) => state.deleteOrder);
  const changeOrderStatus = useRecipeStore((state) => state.changeOrderStatus);
  const updateIngredient = useRecipeStore((state) => state.updateIngredient);
  const updatePackaging = useRecipeStore((state) => state.updatePackaging);
  const showToast = useToastStore((state) => state.showToast);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  // null: closed; {}: new order; an order: editing it; a repeatDraft: a new
  // order with another's contents.
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  // A status change the stock did not allow: { id, status, shortages,
  // problems }.
  const [blocked, setBlocked] = useState(null);

  const filtered = orders.filter((order) => matchesFilter(order, filter));
  const matches = filtered.filter((order) => matchesSearch(order, search));
  const groups = groupOrders(matches, todayKey());

  // Every status change goes through the store, which moves the stock with
  // it. A change that moves the stock says so; otherwise fallbackToast (if
  // any) is shown.
  function changeStatus(id, status, fallbackToast) {
    const order = useRecipeStore.getState().orders.find((entry) => entry.id === id);
    const transition = stockTransition(order.status, status, Boolean(order.stockMove));
    const result = changeOrderStatus(id, status);
    if (!result.ok) {
      setBlocked({ id, status, shortages: result.shortages, problems: result.problems });
      return;
    }
    setBlocked(null);
    const message = STOCK_TOASTS[transition] ?? fallbackToast;
    if (message) showToast(message);
  }

  function retry(updates) {
    updates.forEach(({ kind, id, stock }) => {
      const update = kind === "packaging" ? updatePackaging : updateIngredient;
      update(id, { stock: stockValue(stock) });
    });
    changeStatus(blocked.id, blocked.status);
  }

  // The order's fields are saved first, so a new status deducts the stock
  // of the lines as they are now.
  function save({ status, ...order }) {
    setEditing(null);
    if (!editing?.id) {
      addOrder(order);
      showToast("Pedido guardado");
      return;
    }
    updateOrder(editing.id, order);
    if (status === editing.status) showToast("Pedido guardado");
    else changeStatus(editing.id, status, "Pedido guardado");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteOrder(pendingDelete.id);
    showToast("Pedido eliminado");
    setPendingDelete(null);
  }

  return (
    <>
      <OrdersView
        groups={groups}
        catalog={{ recipes, ingredients, packaging }}
        matchCount={matches.length}
        filteredCount={filtered.length}
        totalCount={orders.length}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onRepeat={(order) => setEditing(repeatDraft(order))}
        onDelete={setPendingDelete}
        onStatusChange={changeStatus}
      />
      {editing !== null && (
        <OrderModal
          initial={editing}
          catalog={{ recipes, ingredients, packaging }}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {blocked && (
        <ShortageDialog
          // A new attempt that is still short shows its own figures.
          key={JSON.stringify(blocked.shortages)}
          shortages={blocked.shortages}
          problems={blocked.problems}
          onRetry={retry}
          onClose={() => setBlocked(null)}
        />
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar pedido"
        description={`¿Eliminar el pedido de "${pendingDelete?.client}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default OrdersPage;
