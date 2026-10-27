import { useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import { shoppingList } from "../../lib/stockMoves";
import { joinParts } from "../../lib/format";
import PageHeader from "../../shared/PageHeader";

function batchLabel({ count, name }) {
  return `${count} ${count === 1 ? "tanda" : "tandas"} de ${name}`;
}

// The shopping list: what the pending and confirmed orders need, in full
// batches and minus the finished goods, against what she has, by aisle.
function ShoppingPage() {
  const recipes = useRecipeStore((state) => state.recipes);
  const ingredients = useRecipeStore((state) => state.ingredients);
  const packaging = useRecipeStore((state) => state.packaging);
  const finishedGoods = useRecipeStore((state) => state.finishedGoods);
  const orders = useRecipeStore((state) => state.orders);
  const ingredientCategories = useRecipeStore((state) => state.ingredientCategories);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const list = shoppingList({
    recipes,
    ingredients,
    ingredientCategories,
    packaging,
    finishedGoods,
    orders,
  });
  const allThere = list.groups.every((group) =>
    group.items.every((item) => item.missing === 0),
  );
  const groups = list.groups
    .map((group) => ({
      ...group,
      items: onlyMissing ? group.items.filter((item) => item.missing > 0) : group.items,
    }))
    .filter((group) => group.items.length);

  return (
    <>
      <PageHeader
        eyebrow="Compras"
        title="Lista de compras."
        description="Lo que necesitás para los pedidos pendientes y confirmados, en tandas completas y descontando lo que ya tenés hecho."
      />
      {list.batches.length > 0 && (
        <div className="toolbar">
          <p className="shopping-batches">
            Vas a cocinar {joinParts(list.batches.map(batchLabel))}.
          </p>
          <label className="shopping-toggle">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(event) => setOnlyMissing(event.target.checked)}
            />
            Solo lo que falta
          </label>
        </div>
      )}
      {allThere && list.groups.length > 0 && (
        <p className="shopping-ready">Tenés todo lo que necesitás.</p>
      )}
      {groups.map((group) => (
        <section key={group.label} className="panel shopping-group" aria-label={group.label}>
          <h2>{group.label}</h2>
          {group.items.map((item) => (
            <div className="shopping-row" key={`${item.kind}-${item.id}`}>
              <strong>{item.name}</strong>
              <span>
                <small>Necesitás</small>
                {item.need} {item.unit}
              </span>
              <span>
                <small>Tenés</small>
                {item.have} {item.unit}
              </span>
              <span className={item.missing > 0 ? "shopping-missing" : "shopping-ok"}>
                <small>Te falta</small>
                {item.missing > 0 ? `${item.missing} ${item.unit}` : "Nada"}
              </span>
            </div>
          ))}
        </section>
      ))}
      {!list.groups.length && (
        <section className="panel">
          <div className="empty-state">
            {orders.some((order) => order.status === "pending" || order.status === "confirmed")
              ? "Ya tenés hecho todo lo que piden los pedidos."
              : "No hay pedidos pendientes ni confirmados."}
          </div>
        </section>
      )}
    </>
  );
}

export default ShoppingPage;
