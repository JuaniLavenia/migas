import { useEffect, useState } from "react";
import {
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  Settings2,
  Utensils,
  X,
} from "lucide-react";
import "./App.css";
import useRecipeStore from "./stores/useRecipeStore";
import { recipeTotals } from "./lib/recipeMath";
import Overview from "./features/overview/Overview";
import IngredientsView from "./features/ingredients/IngredientsView";
import IngredientModal from "./features/ingredients/IngredientModal";
import RecipesView from "./features/recipes/RecipesView";
import RecipeModal from "./features/recipes/RecipeModal";
import SettingsView from "./features/settings/SettingsView";
import ConfirmDialog from "./shared/ConfirmDialog";

const numericRecipeFields = new Set(["yield", "margin", "extras"]);

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
  const deleteRecipeFromStore = useRecipeStore((state) => state.deleteRecipe);
  const importData = useRecipeStore((state) => state.importData);
  const [activeView, setActiveView] = useState("overview");
  const [selectedRecipeId, setSelectedRecipeId] = useState("cookies");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [ingredientModal, setIngredientModal] = useState(null);
  const [recipeModal, setRecipeModal] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

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
  function requestDeleteIngredient(id) {
    const ingredient = ingredients.find((item) => item.id === id);
    setConfirmDelete({ type: "ingredient", id, name: ingredient?.name });
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
    updateRecipeField(selectedRecipeId, {
      [field]: numericRecipeFields.has(field) ? Number(value) : value,
    });
  }
  function requestDeleteRecipe(id) {
    const recipe = recipes.find((entry) => entry.id === id);
    setConfirmDelete({ type: "recipe", id, name: recipe?.name });
  }
  function confirmDeleteAction() {
    if (!confirmDelete) return;
    if (confirmDelete.type === "ingredient") {
      deleteIngredientFromStore(confirmDelete.id);
      setToast("Insumo eliminado");
    } else {
      deleteRecipeFromStore(confirmDelete.id);
      if (confirmDelete.id === selectedRecipeId) {
        const remaining = recipes.filter(
          (recipe) => recipe.id !== confirmDelete.id,
        );
        setSelectedRecipeId(remaining[0]?.id);
      }
      setToast("Receta eliminada");
    }
    setConfirmDelete(null);
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
          <button
            className={
              activeView === "settings" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("settings")}
          >
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
                  : activeView === "recipes"
                    ? "Recetas"
                    : "Configuración"}
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
              onDelete={requestDeleteIngredient}
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
              onDelete={requestDeleteRecipe}
            />
          )}
          {activeView === "settings" && (
            <SettingsView
              ingredients={ingredients}
              recipes={recipes}
              onImport={importData}
              onToast={setToast}
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
      <ConfirmDialog
        open={confirmDelete !== null}
        title={
          confirmDelete?.type === "ingredient"
            ? "Eliminar insumo"
            : "Eliminar receta"
        }
        description={`¿Eliminar "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
      {toast && (
        <div className="toast">
          <CircleDollarSign size={17} /> {toast}
        </div>
      )}
    </div>
  );
}

export default App;
