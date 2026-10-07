import {
  ArrowUpRight,
  Calculator,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  Package,
  Plus,
  ReceiptText,
} from "lucide-react";
import PageHeader from "../../shared/PageHeader";
import StatCard from "../../shared/StatCard";
import { currency } from "../../lib/format";
import { recipeTotals } from "../../lib/recipeMath";
import { formatMonthYear, formatRelativeDate } from "../../lib/dates";
import RecipeThumb from "../recipes/RecipeThumb";

function Overview({
  recipes,
  ingredients,
  selectedRecipe,
  totals,
  onNavigate,
  onSelect,
  onNewRecipe,
}) {
  const now = Date.now();
  return (
    <>
      <PageHeader
        eyebrow={`Mi cocina / ${formatMonthYear(new Date(now))}`}
        title="Un precio justo empieza acá."
        description="Costeá tus recetas con claridad y decidí cuánto cobrar, sin hacer cuentas a mano."
        action={
          <button className="primary-button" onClick={onNewRecipe}>
            <Plus size={18} /> Nueva receta
          </button>
        }
      />
      <div className="stats-grid">
        <StatCard
          icon={<CircleDollarSign size={20} />}
          label="Costo estimado"
          value={currency.format(totals.cost)}
          note="de la receta seleccionada"
          tone="green"
        />
        <StatCard
          icon={<Calculator size={20} />}
          label="Precio sugerido"
          value={currency.format(totals.price)}
          note="con margen configurado"
          tone="yellow"
        />
        <StatCard
          icon={<Package size={20} />}
          label="Insumos activos"
          value={ingredients.length}
          note="en tu despensa"
        />
        <StatCard
          icon={<ReceiptText size={20} />}
          label="Recetas creadas"
          value={recipes.length}
          note="listas para vender"
        />
      </div>
      <div className="overview-grid">
        <section className="panel spotlight-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Receta seleccionada</span>
              <h2>{selectedRecipe?.name || "Sin recetas"}</h2>
            </div>
            {selectedRecipe && (
              <button
                className="text-button"
                onClick={() => onSelect(selectedRecipe.id)}
              >
                Ver detalle <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          {!selectedRecipe && (
            <div className="empty-state">
              <p>Todavía no hay recetas.</p>
              <button className="primary-button" onClick={onNewRecipe}>
                <Plus size={18} /> Crear receta
              </button>
            </div>
          )}
          {selectedRecipe && (
            <>
              <div className="recipe-cost-hero">
                <div>
                  <span>Costo total</span>
                  <strong>{currency.format(totals.cost)}</strong>
                  <small>
                    Rinde {selectedRecipe.yield} unidades ·{" "}
                    {currency.format(totals.unitCost)} c/u
                  </small>
                </div>
                <div className="price-pill">
                  <span>Venta sugerida</span>
                  <strong>{currency.format(totals.price)}</strong>
                </div>
              </div>
              <div className="cost-progress">
                <div>
                  <span>Insumos</span>
                  <strong>
                    {currency.format(
                      Math.max(totals.cost - Number(selectedRecipe.extras || 0), 0),
                    )}
                  </strong>
                </div>
                <div>
                  <span>Extras</span>
                  <strong>{currency.format(selectedRecipe.extras || 0)}</strong>
                </div>
                <div>
                  <span>Margen</span>
                  <strong>{selectedRecipe.margin || 0}%</strong>
                </div>
              </div>
            </>
          )}
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Acciones rápidas</span>
              <h2>Seguí avanzando</h2>
            </div>
          </div>
          <button
            className="quick-action"
            onClick={() => onNavigate("ingredients")}
          >
            <span className="quick-icon mint">
              <Package size={19} />
            </span>
            <span>
              <strong>Cargar un insumo</strong>
              <small>Actualizá tus costos de compra</small>
            </span>
            <ChevronRight size={17} />
          </button>
          <button className="quick-action" onClick={onNewRecipe}>
            <span className="quick-icon peach">
              <FilePlus2 size={19} />
            </span>
            <span>
              <strong>Crear una receta</strong>
              <small>Calculá tu próximo producto</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </section>
      </div>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Biblioteca</span>
            <h2>Tus recetas</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate("recipes")}>
            Ver todas <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="recipe-list">
          {recipes.map((recipe, index) => {
            const data = recipeTotals(recipe, ingredients);
            return (
              <button
                className="recipe-row"
                key={recipe.id}
                onClick={() => onSelect(recipe.id)}
              >
                <RecipeThumb
                  recipe={recipe}
                  className="recipe-number recipe-thumb"
                  fallback={
                    <span
                      className={`recipe-number ${index === 0 ? "featured" : ""}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  }
                />
                <span className="recipe-info">
                  <strong>{recipe.name}</strong>
                  <small>
                    <Clock3 size={13} /> Actualizada{" "}
                    {formatRelativeDate(recipe.updatedAt, now)} · rinde{" "}
                    {recipe.yield} unidades
                  </small>
                </span>
                <span className="recipe-row-cost">
                  <small>Costo total</small>
                  <strong>{currency.format(data.cost)}</strong>
                </span>
                <ChevronRight size={17} />
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default Overview;
