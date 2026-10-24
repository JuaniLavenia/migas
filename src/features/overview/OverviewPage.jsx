import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CloudUpload } from "lucide-react";
import useRecipeStore from "../../stores/useRecipeStore";
import { viewPath } from "../../app/navigation";
import { useSession } from "../../app/session/SessionContext";
import { readLocalData } from "../../lib/localData";
import { daysAgo } from "../../lib/dates";
import { todayKey } from "../../lib/orders";
import { shoppingList } from "../../lib/stockMoves";
import {
  balanceDue,
  compareMonths,
  monthLabel,
  monthSummary,
  oldFinishedGoods,
  shiftMonth,
  topRecipes,
  upcomingDeliveries,
} from "../../lib/dashboard";
import Dashboard from "./Dashboard";

// On a first sign-in the cloud is empty while the phone still has the old
// data: say where to upload it, so the empty app does not look like a loss.
function UploadHint() {
  const session = useSession();
  const cloudEmpty = useRecipeStore(
    (state) =>
      !state.ingredients.length &&
      !state.recipes.length &&
      !state.recipeCategories.length &&
      !state.packaging.length &&
      !state.orders.length,
  );
  const hasLocalData = useMemo(
    () => Boolean(session && readLocalData()),
    [session],
  );
  if (!session || !cloudEmpty || !hasLocalData) return null;
  return (
    <Link className="upload-hint" to={viewPath("settings")}>
      <CloudUpload size={18} />
      <span>
        <strong>Subir los datos de este dispositivo</strong>
        <small>
          Tus recetas guardadas en este navegador todavía no están en la nube.
        </small>
      </span>
    </Link>
  );
}

// "septiembre", for "vs septiembre".
function monthName(month) {
  return monthLabel(month).split(" ")[0].toLowerCase();
}

// Container of the home view, the business dashboard: the chosen month
// (the current one by default) against the month before, plus what needs
// attention today.
function OverviewPage() {
  const orders = useRecipeStore((state) => state.orders);
  const recipes = useRecipeStore((state) => state.recipes);
  const ingredients = useRecipeStore((state) => state.ingredients);
  const packaging = useRecipeStore((state) => state.packaging);
  const finishedGoods = useRecipeStore((state) => state.finishedGoods);
  const today = todayKey();
  const [month, setMonth] = useState(() => today.slice(0, 7));

  const catalog = { recipes, ingredients, packaging };
  const previous = shiftMonth(month, -1);
  const summary = monthSummary(orders, catalog, month);
  const missingCount = shoppingList({ ...catalog, finishedGoods, orders })
    .groups.flatMap((group) => group.items)
    .filter((item) => item.missing > 0).length;
  const nameOf = (recipeId) =>
    recipes.find((recipe) => recipe.id === recipeId)?.name ?? "de una receta eliminada";

  return (
    <>
      <UploadHint />
      <Dashboard
        month={{ label: monthLabel(month), previousName: monthName(previous) }}
        onPreviousMonth={() => setMonth(previous)}
        onNextMonth={() => setMonth(shiftMonth(month, 1))}
        summary={summary}
        changes={compareMonths(summary, monthSummary(orders, catalog, previous))}
        balance={balanceDue(orders)}
        hasOrders={orders.length > 0}
        upcoming={upcomingDeliveries(orders, today)}
        missingCount={missingCount}
        oldLots={oldFinishedGoods(finishedGoods, today).map((lot) => ({
          ...lot,
          name: nameOf(lot.recipeId),
          age: daysAgo(lot.madeAt, today),
        }))}
        topRecipes={topRecipes(orders, catalog, month)}
      />
    </>
  );
}

export default OverviewPage;
