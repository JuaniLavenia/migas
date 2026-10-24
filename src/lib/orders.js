import { indexIngredients, recipePricing, recipeTotals, unitPrice } from "./recipeMath";

// Orders: status, payment, price and grouping by delivery date. Dates are
// calendar days as "YYYY-MM-DD" strings, compared as text; times are "HH:MM"
// or "" when no time was agreed.

export const ORDER_STATUSES = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "En preparación" },
  { value: "ready", label: "Listo" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
];

export function statusLabel(status) {
  return ORDER_STATUSES.find((entry) => entry.value === status)?.label ?? "Pendiente";
}

// Delivered and cancelled orders are done: never late, hidden by default.
export function isClosed(status) {
  return status === "delivered" || status === "cancelled";
}

const PAYMENT_LABELS = { unpaid: "Sin pagar", deposit: "Señado", paid: "Pagado" };

// Derived from what she collected and the agreed price; `balance` is what is
// left to collect.
export function paymentStatus(order) {
  const price = Number(order.price) || 0;
  const paid = Number(order.paid) || 0;
  let value = "deposit";
  if (paid <= 0) value = "unpaid";
  else if (paid >= price) value = "paid";
  return { value, label: PAYMENT_LABELS[value], balance: Math.max(price - paid, 0) };
}

// Prices of the order's lines. `proposed` sells each product at its sale
// price (the suggested one when it has none), `suggested` at the suggested
// price; packaging is charged at cost in both. `profit` uses the agreed
// price. missingCount: lines whose recipe or packaging was deleted or has an
// incomplete cost; they add 0, so the UI must warn.
export function orderTotals(order, { recipes, ingredients, packaging }) {
  const byId = indexIngredients(ingredients);
  let proposed = 0;
  let suggested = 0;
  let cost = 0;
  let missingCount = 0;
  (order.items ?? []).forEach(({ recipeId, quantity }) => {
    const recipe = recipes.find((entry) => entry.id === recipeId);
    if (!recipe) {
      missingCount += 1;
      return;
    }
    const totals = recipeTotals(recipe, ingredients, byId);
    const pricing = recipePricing(totals, recipe.salePrice);
    const units = Number(quantity) || 0;
    proposed += units * (pricing.salePrice ?? pricing.suggested);
    suggested += units * pricing.suggested;
    cost += units * totals.unitCost;
    if (totals.missingCount) missingCount += 1;
  });
  (order.packagingItems ?? []).forEach(({ packagingId, quantity }) => {
    const item = packaging.find((entry) => entry.id === packagingId);
    const price = item ? unitPrice(item) : null;
    if (price === null) {
      missingCount += 1;
      return;
    }
    const lineCost = (Number(quantity) || 0) * price;
    proposed += lineCost;
    suggested += lineCost;
    cost += lineCost;
  });
  return {
    proposed,
    suggested,
    cost,
    profit: (Number(order.price) || 0) - cost,
    missingCount,
  };
}

const dueFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// "sáb, 24 oct · 17:30"; dates are calendar days, read in UTC so the
// browser's time zone never moves them.
export function dueLabel(order) {
  const date = dueFormat.format(new Date(`${order.dueDate}T00:00:00Z`));
  return order.dueTime ? `${date} · ${order.dueTime}` : date;
}

// Today's local calendar date.
export function todayKey(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Calendar arithmetic in UTC, so daylight saving never shifts a day.
function toDate(key) {
  return new Date(`${key}T00:00:00Z`);
}

function addDays(key, days) {
  const date = toDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// The Sunday that ends the week of `key` (the week starts on Monday).
function endOfWeek(key) {
  const weekday = toDate(key).getUTCDay();
  return addDays(key, weekday === 0 ? 0 : 7 - weekday);
}

// By date, then time; an order without a time goes last in its day.
function byDue(a, b) {
  const dateOrder = a.dueDate.localeCompare(b.dueDate);
  if (dateOrder) return dateOrder;
  return (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99");
}

// Groups orders by delivery date relative to `today`, in display order and
// without empty groups. Only open orders are late; closed orders with a past
// date go in "Anteriores", most recent first.
export function groupOrders(orders, today = todayKey()) {
  const tomorrow = addDays(today, 1);
  const weekEnd = endOfWeek(today);
  const groups = [
    { id: "overdue", label: "Atrasados", orders: [] },
    { id: "today", label: "Hoy", orders: [] },
    { id: "tomorrow", label: "Mañana", orders: [] },
    { id: "week", label: "Esta semana", orders: [] },
    { id: "later", label: "Más adelante", orders: [] },
    { id: "past", label: "Anteriores", orders: [] },
  ];
  const group = (id) => groups.find((entry) => entry.id === id).orders;
  [...orders].sort(byDue).forEach((order) => {
    const date = order.dueDate;
    if (date < today) group(isClosed(order.status) ? "past" : "overdue").push(order);
    else if (date === today) group("today").push(order);
    else if (date === tomorrow) group("tomorrow").push(order);
    else if (date <= weekEnd) group("week").push(order);
    else group("later").push(order);
  });
  group("past").reverse();
  return groups.filter((entry) => entry.orders.length);
}
