import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AppLayout from "./app/AppLayout";
import OverviewPage from "./features/overview/OverviewPage";
import IngredientsPage from "./features/ingredients/IngredientsPage";
import PackagingPage from "./features/packaging/PackagingPage";
import OrdersPage from "./features/orders/OrdersPage";
import FinishedGoodsPage from "./features/finished/FinishedGoodsPage";
import ShoppingPage from "./features/shopping/ShoppingPage";
import RecipesPage from "./features/recipes/RecipesPage";
import SettingsPage from "./features/settings/SettingsPage";

// Composition only: the layout and one route per view. The router itself is
// provided by main.jsx (BrowserRouter) or by the tests (MemoryRouter).
function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="compras" element={<ShoppingPage />} />
        <Route path="insumos" element={<IngredientsPage />} />
        <Route path="packaging" element={<PackagingPage />} />
        <Route path="elaborados" element={<FinishedGoodsPage />} />
        <Route path="recetas" element={<RecipesPage />} />
        <Route path="recetas/:recipeId" element={<RecipesPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
