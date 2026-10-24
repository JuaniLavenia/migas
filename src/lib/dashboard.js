import { formatMonthYear } from "./dates";
import { isClosed, orderTotals, paymentStatus } from "./orders";
import { indexIngredients, recipePricing, recipeTotals } from "./recipeMath";

// The dashboard's numbers. A month is "YYYY-MM" and an order belongs to the
// month of its delivery date; days are "YYYY-MM-DD".

export function shiftMonth(month, delta) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

// "Septiembre 2026".
export function monthLabel(month) {
  const [year, number] = month.split("-").map(Number);
  return formatMonthYear(new Date(year, number - 1, 1));
}

const inMonth = (order, month) => order.dueDate.slice(0, 7) === month;

// sales: what was collected from the month's delivered orders; cost and
// profit (sales − cost) of those same orders; margin: profit over sales, in
// whole %, or null without sales; orderCount: the month's orders but the
// cancelled ones.
export function monthSummary(orders, catalog, month) {
  const ofMonth = orders.filter((order) => inMonth(order, month));
  const delivered = ofMonth.filter((order) => order.status === "delivered");
  const sales = delivered.reduce((total, order) => total + (Number(order.paid) || 0), 0);
  const cost = delivered.reduce((total, order) => total + orderTotals(order, catalog).cost, 0);
  const profit = sales - cost;
  return {
    sales,
    cost,
    profit,
    margin: sales > 0 ? Math.round((profit / sales) * 100) : null,
    orderCount: ofMonth.filter((order) => order.status !== "cancelled").length,
  };
}

// Change of each number against the previous month, in whole %; null when
// the previous month had 0 (there is nothing to compare with).
export function compareMonths(current, previous) {
  const change = (key) =>
    previous[key]
      ? Math.round(((current[key] - previous[key]) / Math.abs(previous[key])) * 100)
      : null;
  return { sales: change("sales"), profit: change("profit"), orderCount: change("orderCount") };
}

// What is still owed today by the orders where collecting is due: señados
// and delivered ones, of any month, but not the cancelled ones.
export function balanceDue(orders) {
  return orders
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        (order.status === "delivered" || (Number(order.paid) || 0) > 0),
    )
    .reduce((total, order) => total + paymentStatus(order).balance, 0);
}

function addDays(day, days) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Open orders due within the next 7 days (today included), late ones too,
// by date and time; `late` marks the ones whose date already passed.
export function upcomingDeliveries(orders, today) {
  const last = addDays(today, 6);
  return orders
    .filter((order) => !isClosed(order.status) && order.dueDate <= last)
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99"),
    )
    .map((order) => ({ ...order, late: order.dueDate < today }));
}

export const OLD_AFTER_DAYS = 3;

// Batches made more than OLD_AFTER_DAYS days ago, oldest first.
export function oldFinishedGoods(lots, today) {
  const limit = addDays(today, -OLD_AFTER_DAYS);
  return lots
    .filter((lot) => lot.madeAt < limit)
    .sort((a, b) => a.madeAt.localeCompare(b.madeAt));
}

// The month's delivered recipes: the 5 that sold the most units and the 5
// that left the most profit, estimated with their sale price (the suggested
// one when they have none) minus their unit cost. Deleted recipes are left
// out.
export function topRecipes(orders, catalog, month, limit = 5) {
  const byId = indexIngredients(catalog.ingredients);
  const totals = new Map();
  orders
    .filter((order) => order.status === "delivered" && inMonth(order, month))
    .flatMap((order) => order.items ?? [])
    .forEach(({ recipeId, quantity }) => {
      const recipe = catalog.recipes.find((entry) => entry.id === recipeId);
      if (!recipe) return;
      const entry = totals.get(recipeId) ?? { recipeId, name: recipe.name, units: 0, profit: 0 };
      const units = Number(quantity) || 0;
      const pricing = recipePricing(recipeTotals(recipe, catalog.ingredients, byId), recipe.salePrice);
      entry.units += units;
      entry.profit += units * pricing.unitProfit;
      totals.set(recipeId, entry);
    });
  const entries = [...totals.values()];
  return {
    sold: [...entries]
      .sort((a, b) => b.units - a.units)
      .slice(0, limit)
      .map(({ recipeId, name, units }) => ({ recipeId, name, units })),
    profitable: [...entries]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit)
      .map(({ recipeId, name, profit }) => ({ recipeId, name, profit: Math.round(profit) })),
  };
}
