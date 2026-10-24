import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import ConfirmDialog from "../../shared/ConfirmDialog";
import { groupOrders, isClosed, todayKey } from "../../lib/orders";
import OrdersView from "./OrdersView";
import OrderModal from "./OrderModal";

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
  const showToast = useToastStore((state) => state.showToast);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  // null: closed; {}: new order; an order: editing it.
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = orders.filter((order) => matchesFilter(order, filter));
  const matches = filtered.filter((order) => matchesSearch(order, search));
  const groups = groupOrders(matches, todayKey());

  function save(order) {
    if (editing?.id) updateOrder(editing.id, order);
    else addOrder(order);
    setEditing(null);
    showToast("Pedido guardado");
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
        onDelete={setPendingDelete}
        onStatusChange={(id, status) => updateOrder(id, { status })}
      />
      {editing !== null && (
        <OrderModal
          initial={editing}
          catalog={{ recipes, ingredients, packaging }}
          onClose={() => setEditing(null)}
          onSave={save}
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
