import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  HandCoins,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../../shared/PageHeader";
import StatCard from "../../shared/StatCard";
import { currency } from "../../lib/format";
import { dueLabel } from "../../lib/orders";
import { OLD_AFTER_DAYS } from "../../lib/dashboard";
import { viewPath } from "../../app/navigation";

// "▲ 12% vs septiembre", or `none` when the previous month had nothing.
function changeNote(change, previousName, none) {
  if (change === null) return `${none} en ${previousName}`;
  return `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs ${previousName}`;
}

function PanelLink({ to, children }) {
  return (
    <Link className="text-button" to={to}>
      {children} <ArrowUpRight size={15} />
    </Link>
  );
}

// The business dashboard. Every value comes from the container
// (OverviewPage): `month` is { label, previousName }, `summary` and
// `changes` the month's numbers and their change, and the lists are
// already sorted.
function Dashboard({
  month,
  onPreviousMonth,
  onNextMonth,
  summary,
  changes,
  balance,
  hasOrders,
  upcoming,
  missingCount,
  oldLots,
  topRecipes,
}) {
  const margin = summary.margin === null ? "Sin ventas" : `Margen ${summary.margin}%`;
  return (
    <>
      <PageHeader
        eyebrow="Mi cocina"
        title="Cómo va tu negocio."
        description="Los números del mes, comparados con el anterior, y lo que tenés que atender."
      />
      <div className="toolbar dashboard-month">
        <button
          type="button"
          className="icon-button"
          aria-label="Mes anterior"
          title="Mes anterior"
          onClick={onPreviousMonth}
        >
          <ChevronLeft size={17} />
        </button>
        <strong>{month.label}</strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Mes siguiente"
          title="Mes siguiente"
          onClick={onNextMonth}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="stats-grid">
        <StatCard
          icon={<CircleDollarSign size={20} />}
          label="Ventas"
          value={currency.format(summary.sales)}
          note={changeNote(changes.sales, month.previousName, "Sin ventas")}
          tone="green"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Ganancia real"
          value={currency.format(summary.profit)}
          note={`${margin} · ${changeNote(changes.profit, month.previousName, "Sin ganancia")}`}
          tone="yellow"
        />
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Pedidos"
          value={summary.orderCount}
          note={changeNote(changes.orderCount, month.previousName, "Sin pedidos")}
        />
        <StatCard
          icon={<HandCoins size={20} />}
          label="Saldo por cobrar"
          value={currency.format(balance)}
          note="de pedidos señados o entregados"
        />
      </div>
      {!hasOrders && (
        <section className="panel dashboard-panel">
          <div className="empty-state">
            <p>Todavía no cargaste pedidos.</p>
            <Link className="primary-button" to={viewPath("orders")}>
              Cargar un pedido
            </Link>
          </div>
        </section>
      )}
      <div className="dashboard-grid">
        <section className="panel dashboard-panel" aria-label="Próximas entregas">
          <div className="panel-heading">
            <h2>Próximas entregas</h2>
            <PanelLink to={viewPath("orders")}>Ver pedidos</PanelLink>
          </div>
          {upcoming.length ? (
            <ul className="dashboard-list">
              {upcoming.map((order) => (
                <li key={order.id}>
                  <strong>{order.client}</strong>
                  <span>{dueLabel(order)}</span>
                  {order.late && <span className="dashboard-late">Atrasado</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">No tenés entregas en los próximos 7 días.</p>
          )}
        </section>
        <section className="panel dashboard-panel" aria-label="Para comprar">
          <div className="panel-heading">
            <h2>Para comprar</h2>
            <PanelLink to={viewPath("shopping")}>Ver lista de compras</PanelLink>
          </div>
          <p className={missingCount ? "dashboard-alert" : "dashboard-empty"}>
            {missingCount
              ? `Te ${missingCount === 1 ? "falta 1 cosa" : `faltan ${missingCount} cosas`} para los pedidos pendientes.`
              : "Tenés todo para los pedidos pendientes."}
          </p>
        </section>
        <section className="panel dashboard-panel" aria-label="Elaborados viejos">
          <div className="panel-heading">
            <h2>Elaborados viejos</h2>
            <PanelLink to={viewPath("finished")}>Ver elaborados</PanelLink>
          </div>
          {oldLots.length ? (
            <ul className="dashboard-list">
              {oldLots.map((lot) => (
                <li key={lot.id}>{`${lot.quantity} ${lot.name} · ${lot.age}`}</li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">
              Nada con más de {OLD_AFTER_DAYS} días.
            </p>
          )}
        </section>
        <section className="panel dashboard-panel" aria-label="Recetas del mes">
          <div className="panel-heading">
            <h2>Recetas del mes</h2>
          </div>
          {topRecipes.sold.length ? (
            <div className="dashboard-rankings">
              <div>
                <h3 id="dashboard-sold">Más vendidas</h3>
                <ol className="dashboard-list" aria-labelledby="dashboard-sold">
                  {topRecipes.sold.map((entry) => (
                    <li key={entry.recipeId}>
                      <span>{entry.name}</span>
                      <strong>{entry.units} un</strong>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 id="dashboard-profitable">Más ganancia</h3>
                <ol className="dashboard-list" aria-labelledby="dashboard-profitable">
                  {topRecipes.profitable.map((entry) => (
                    <li key={entry.recipeId}>
                      <span>{entry.name}</span>
                      <strong>{currency.format(entry.profit)}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <p className="dashboard-empty">Todavía no entregaste pedidos este mes.</p>
          )}
        </section>
      </div>
    </>
  );
}

export default Dashboard;
