import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Calculator,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  FilePlus2,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import "./App.css";
import useRecipeStore from "./stores/useRecipeStore";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const unitLabels = { g: "gramos", ml: "mililitros", un: "unidades" };

function ingredientCost(ingredient, quantity) {
  return (
    (Number(quantity) / Number(ingredient.packSize || 1)) *
    Number(ingredient.packCost || 0)
  );
}

function recipeTotals(recipe, ingredients) {
  const cost =
    recipe.items.reduce((total, item) => {
      const ingredient = ingredients.find(
        (entry) => entry.id === item.ingredientId,
      );
      return (
        total + (ingredient ? ingredientCost(ingredient, item.quantity) : 0)
      );
    }, 0) + Number(recipe.extras || 0);
  const unitCost = cost / Math.max(Number(recipe.yield) || 1, 1);
  return {
    cost,
    unitCost,
    price: unitCost * (1 + Number(recipe.margin || 0) / 100),
  };
}

function App() {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const updateIngredient = useRecipeStore((state) => state.updateIngredient);
  const deleteIngredientFromStore = useRecipeStore(
    (state) => state.deleteIngredient,
  );
  const addRecipe = useRecipeStore((state) => state.addRecipe);
  const updateRecipeField = useRecipeStore((state) => state.updateRecipe);
  const [activeView, setActiveView] = useState("overview");
  const [selectedRecipeId, setSelectedRecipeId] = useState("cookies");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [ingredientModal, setIngredientModal] = useState(null);
  const [recipeModal, setRecipeModal] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedRecipeId) || recipes[0];
  const selectedTotals = selectedRecipe
    ? recipeTotals(selectedRecipe, ingredients)
    : { cost: 0, unitCost: 0, price: 0 };
  const totalValue = recipes.reduce(
    (total, recipe) => total + recipeTotals(recipe, ingredients).cost,
    0,
  );
  const filteredIngredients = ingredients.filter((item) =>
    `${item.name} ${item.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function navigate(view) {
    setActiveView(view);
    setMenuOpen(false);
  }
  function saveIngredient(form) {
    const item = {
      ...form,
      packSize: Number(form.packSize),
      packCost: Number(form.packCost),
    };
    if (ingredientModal?.id) updateIngredient(ingredientModal.id, item);
    else addIngredient(item);
    setIngredientModal(null);
    setToast("Insumo guardado");
  }
  function deleteIngredient(id) {
    deleteIngredientFromStore(id);
    setToast("Insumo eliminado");
  }
  function saveRecipe(form) {
    const recipe = {
      ...form,
      yield: Number(form.yield),
      margin: Number(form.margin),
      extras: Number(form.extras),
      updated: "Ahora",
    };
    const id = addRecipe(recipe);
    setRecipeModal(false);
    setSelectedRecipeId(id);
    setToast("Receta creada");
  }
  function updateRecipe(field, value) {
    updateRecipeField(selectedRecipeId, { [field]: Number(value) });
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Utensils size={18} />
          </span>
          <span>Miga</span>
          <button
            className="icon-button mobile-close"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">
          Mi emprendimiento <ChevronRight size={13} />
        </div>
        <nav className="nav-list">
          <button
            className={
              activeView === "overview" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("overview")}
          >
            <LayoutDashboard size={18} /> Resumen
          </button>
          <button
            className={
              activeView === "ingredients" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("ingredients")}
          >
            <Package size={18} /> Insumos <span>{ingredients.length}</span>
          </button>
          <button
            className={
              activeView === "recipes" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("recipes")}
          >
            <ReceiptText size={18} /> Recetas <span>{recipes.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item">
            <Settings2 size={18} /> Configuración
          </button>
          <div className="user-card">
            <div className="avatar">MP</div>
            <div>
              <strong>Mi perfil</strong>
              <small>Emprendimiento</small>
            </div>
            <ChevronRight size={15} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {activeView === "overview"
                ? "Resumen"
                : activeView === "ingredients"
                  ? "Insumos"
                  : "Recetas"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="saved-status">
              <span className="status-dot" /> Guardado localmente
            </span>
            <button className="avatar small">MP</button>
          </div>
        </header>
        <div className="content-wrap">
          {activeView === "overview" && (
            <Overview
              recipes={recipes}
              ingredients={ingredients}
              totals={selectedTotals}
              totalValue={totalValue}
              onNavigate={navigate}
              onSelect={(id) => {
                setSelectedRecipeId(id);
                navigate("recipes");
              }}
              onNewRecipe={() => setRecipeModal(true)}
            />
          )}
          {activeView === "ingredients" && (
            <IngredientsView
              ingredients={filteredIngredients}
              search={search}
              setSearch={setSearch}
              onAdd={() => setIngredientModal({})}
              onEdit={setIngredientModal}
              onDelete={deleteIngredient}
            />
          )}
          {activeView === "recipes" && (
            <RecipesView
              recipes={recipes}
              ingredients={ingredients}
              selectedId={selectedRecipeId}
              onSelect={setSelectedRecipeId}
              onNew={() => setRecipeModal(true)}
              totals={selectedTotals}
              selectedRecipe={selectedRecipe}
              updateRecipe={updateRecipe}
            />
          )}
        </div>
      </main>
      {ingredientModal !== null && (
        <IngredientModal
          initial={ingredientModal}
          onClose={() => setIngredientModal(null)}
          onSave={saveIngredient}
        />
      )}
      {recipeModal && (
        <RecipeModal
          ingredients={ingredients}
          onClose={() => setRecipeModal(false)}
          onSave={saveRecipe}
        />
      )}
      {toast && (
        <div className="toast">
          <CircleDollarSign size={17} /> {toast}
        </div>
      )}
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function StatCard({ icon, label, value, note, tone = "" }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}

function Overview({
  recipes,
  ingredients,
  totals,
  totalValue,
  onNavigate,
  onSelect,
  onNewRecipe,
}) {
  return (
    <>
      <PageHeader
        eyebrow="Mi cocina / Agosto 2026"
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
              <span className="eyebrow">Última receta editada</span>
              <h2>{recipes[0]?.name || "Sin recetas"}</h2>
            </div>
            <button
              className="text-button"
              onClick={() => onSelect(recipes[0]?.id)}
            >
              Ver detalle <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="recipe-cost-hero">
            <div>
              <span>Costo total</span>
              <strong>{currency.format(totals.cost)}</strong>
              <small>
                Rinde {recipes[0]?.yield || 0} unidades ·{" "}
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
                  Math.max(totals.cost - Number(recipes[0]?.extras || 0), 0),
                )}
              </strong>
            </div>
            <div>
              <span>Extras</span>
              <strong>{currency.format(recipes[0]?.extras || 0)}</strong>
            </div>
            <div>
              <span>Margen</span>
              <strong>{recipes[0]?.margin || 0}%</strong>
            </div>
          </div>
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
                <span
                  className={`recipe-number ${index === 0 ? "featured" : ""}`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="recipe-info">
                  <strong>{recipe.name}</strong>
                  <small>
                    <Clock3 size={13} /> Actualizada {recipe.updated} · rinde{" "}
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

function IngredientsView({
  ingredients,
  search,
  setSearch,
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
        <span className="toolbar-count">{ingredients.length} insumos</span>
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
              {currency.format(item.packCost / item.packSize)} / {item.unit}
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
    </>
  );
}

function RecipesView({
  recipes,
  ingredients,
  selectedId,
  onSelect,
  onNew,
  totals,
  selectedRecipe,
  updateRecipe,
}) {
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
        <div className="recipe-selector panel">
          <div className="selector-heading">
            <span className="eyebrow">Biblioteca</span>
            <strong>{recipes.length} recetas</strong>
          </div>
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onSelect(recipe.id)}
              className={`selector-item ${selectedId === recipe.id ? "selected" : ""}`}
            >
              <span className="selector-avatar">{recipe.name.charAt(0)}</span>
              <span>
                <strong>{recipe.name}</strong>
                <small>Rinde {recipe.yield} unidades</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        {selectedRecipe && (
          <div className="recipe-editor">
            <div className="editor-top">
              <div>
                <span className="eyebrow">Editando receta</span>
                <h2>{selectedRecipe.name}</h2>
              </div>
              <span className="updated-tag">
                <span className="status-dot" /> {selectedRecipe.updated}
              </span>
            </div>
            <div className="editor-grid">
              <div className="field-group">
                <label>Rendimiento</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="1"
                    value={selectedRecipe.yield}
                    onChange={(event) =>
                      updateRecipe("yield", event.target.value)
                    }
                  />
                  <span>unidades</span>
                </div>
              </div>
              <div className="field-group">
                <label>Margen de ganancia</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="0"
                    value={selectedRecipe.margin}
                    onChange={(event) =>
                      updateRecipe("margin", event.target.value)
                    }
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="field-group">
                <label>Gastos extra</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="0"
                    value={selectedRecipe.extras}
                    onChange={(event) =>
                      updateRecipe("extras", event.target.value)
                    }
                  />
                  <span>ARS</span>
                </div>
              </div>
            </div>
            <div className="editor-cost-card">
              <div>
                <span>Costo total</span>
                <strong>{currency.format(totals.cost)}</strong>
                <small>{selectedRecipe.items.length} insumos + extras</small>
              </div>
              <div className="cost-divider" />
              <div>
                <span>Costo unitario</span>
                <strong>{currency.format(totals.unitCost)}</strong>
                <small>por unidad producida</small>
              </div>
              <div className="suggested-price">
                <span>Precio sugerido</span>
                <strong>{currency.format(totals.price)}</strong>
                <small>margen del {selectedRecipe.margin}%</small>
              </div>
            </div>
            <div className="ingredients-used">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Composición</span>
                  <h3>Insumos utilizados</h3>
                </div>
                <span className="mini-label">Costo proporcional</span>
              </div>
              {selectedRecipe.items.map((item) => {
                const ingredient = ingredients.find(
                  (entry) => entry.id === item.ingredientId,
                );
                return (
                  <div className="used-row" key={item.ingredientId}>
                    <span className="used-dot" />
                    <strong>{ingredient?.name || "Insumo eliminado"}</strong>
                    <span>
                      {item.quantity}{" "}
                      {unitLabels[ingredient?.unit] || ingredient?.unit}
                    </span>
                    <strong>
                      {currency.format(
                        ingredient
                          ? ingredientCost(ingredient, item.quantity)
                          : 0,
                      )}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function IngredientModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    category: initial.category || "Secos",
    unit: initial.unit || "g",
    packSize: initial.packSize || "",
    packCost: initial.packCost || "",
  });
  const change = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  return (
    <ModalShell
      title={initial.id ? "Editar insumo" : "Nuevo insumo"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <div className="field-group full">
            <label>Nombre del insumo</label>
            <input
              required
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
              placeholder="Ej. Harina 0000"
            />
          </div>
          <div className="field-group">
            <label>Categoría</label>
            <input
              value={form.category}
              onChange={(event) => change("category", event.target.value)}
              placeholder="Ej. Secos"
            />
          </div>
          <div className="field-group">
            <label>Unidad base</label>
            <select
              value={form.unit}
              onChange={(event) => change("unit", event.target.value)}
            >
              <option value="g">Gramos (g)</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="un">Unidades (un)</option>
            </select>
          </div>
          <div className="field-group">
            <label>Contenido del pack</label>
            <input
              required
              type="number"
              min="0.01"
              value={form.packSize}
              onChange={(event) => change("packSize", event.target.value)}
              placeholder="1000"
            />
          </div>
          <div className="field-group">
            <label>Costo del pack</label>
            <div className="input-with-suffix">
              <input
                required
                type="number"
                min="0"
                value={form.packCost}
                onChange={(event) => change("packCost", event.target.value)}
                placeholder="1250"
              />
              <span>ARS</span>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Guardar insumo
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
function RecipeModal({ ingredients, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    yield: 12,
    margin: 60,
    extras: 0,
    items: ingredients
      .slice(0, 3)
      .map((item) => ({ ingredientId: item.id, quantity: 0 })),
  });
  const updateItem = (index, field, value) =>
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === "quantity" ? Number(value) : value }
          : item,
      ),
    }));
  return (
    <ModalShell title="Nueva receta" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...form,
            items: form.items.filter((item) => item.quantity > 0),
          });
        }}
      >
        <div className="form-grid">
          <div className="field-group full">
            <label>Nombre de la receta</label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Ej. Budín de limón"
            />
          </div>
          <div className="field-group">
            <label>Rinde</label>
            <input
              type="number"
              min="1"
              value={form.yield}
              onChange={(event) =>
                setForm({ ...form, yield: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label>Margen</label>
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                value={form.margin}
                onChange={(event) =>
                  setForm({ ...form, margin: event.target.value })
                }
              />
              <span>%</span>
            </div>
          </div>
          <div className="field-group full">
            <label>Gastos extra</label>
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                value={form.extras}
                onChange={(event) =>
                  setForm({ ...form, extras: event.target.value })
                }
              />
              <span>ARS</span>
            </div>
          </div>
        </div>
        <div className="modal-subheading">Insumos de la receta</div>
        <div className="modal-ingredients">
          {form.items.map((item, index) => (
            <div className="modal-ingredient-row" key={item.ingredientId}>
              <select
                value={item.ingredientId}
                onChange={(event) =>
                  updateItem(index, "ingredientId", event.target.value)
                }
              >
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                value={item.quantity}
                onChange={(event) =>
                  updateItem(index, "quantity", event.target.value)
                }
                placeholder="Cantidad"
              />
              <span>
                {
                  ingredients.find(
                    (ingredient) => ingredient.id === item.ingredientId,
                  )?.unit
                }
              </span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Crear receta
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default App;
