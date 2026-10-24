import { describe, expect, it } from "vitest";
import {
  groupOrders,
  isClosed,
  orderTotals,
  paymentStatus,
  todayKey,
} from "./orders";

const ingredients = [
  { id: "harina", name: "Harina", unit: "g", packSize: 1000, packCost: 1000 },
];
// 21 cookies cost 2100 (100 per unit); suggested at +100%: 200 per unit.
const cookies = {
  id: "cookies",
  name: "Cookies",
  yield: 21,
  margin: 100,
  extras: 0,
  items: [{ ingredientId: "harina", quantity: 2100 }],
};
const withSalePrice = { ...cookies, id: "premium", salePrice: 250 };
const packaging = [
  { id: "box", name: "Box x8", packSize: 10, packCost: 9000 },
  { id: "rota", name: "Sin presentación", packSize: 0, packCost: 100 },
];
const catalog = { recipes: [cookies, withSalePrice], ingredients, packaging };

const order = (fields) => ({
  id: "o",
  client: "Sofi",
  dueDate: "2026-10-25",
  dueTime: "",
  items: [],
  packagingItems: [],
  price: 0,
  paid: 0,
  status: "pending",
  ...fields,
});

describe("orderTotals", () => {
  it("proposes the sale price, the suggested one when there is none, plus packaging at cost", () => {
    const totals = orderTotals(
      order({
        items: [
          { recipeId: "cookies", quantity: 16 },
          { recipeId: "premium", quantity: 8 },
        ],
        packagingItems: [{ packagingId: "box", quantity: 2 }],
        price: 6000,
      }),
      catalog,
    );
    // 16 × 200 (suggested) + 8 × 250 (sale price) + 2 × 900 (box at cost).
    expect(totals.proposed).toBeCloseTo(7000);
    expect(totals.suggested).toBeCloseTo(16 * 200 + 8 * 200 + 1800);
    expect(totals.cost).toBeCloseTo(24 * 100 + 1800);
    // The real profit uses the agreed price, not the proposed one.
    expect(totals.profit).toBeCloseTo(6000 - 4200);
    expect(totals.missingCount).toBe(0);
  });

  it("counts deleted recipes and packaging without a price as missing, at 0", () => {
    const totals = orderTotals(
      order({
        items: [
          { recipeId: "borrada", quantity: 3 },
          { recipeId: "cookies", quantity: 1 },
        ],
        packagingItems: [
          { packagingId: "rota", quantity: 1 },
          { packagingId: "borrado", quantity: 1 },
        ],
      }),
      catalog,
    );
    expect(totals.proposed).toBeCloseTo(200);
    expect(totals.cost).toBeCloseTo(100);
    expect(totals.missingCount).toBe(3);
  });

  it("is zero for an empty order", () => {
    expect(orderTotals(order({}), catalog)).toMatchObject({
      proposed: 0,
      suggested: 0,
      cost: 0,
      profit: 0,
      missingCount: 0,
    });
  });
});

describe("paymentStatus", () => {
  it("derives Sin pagar, Señado and Pagado from what was paid and the price", () => {
    expect(paymentStatus(order({ price: 5000, paid: 0 }))).toMatchObject({
      value: "unpaid",
      label: "Sin pagar",
      balance: 5000,
    });
    expect(paymentStatus(order({ price: 5000, paid: 2000 }))).toMatchObject({
      value: "deposit",
      label: "Señado",
      balance: 3000,
    });
    expect(paymentStatus(order({ price: 5000, paid: 5000 }))).toMatchObject({
      value: "paid",
      label: "Pagado",
      balance: 0,
    });
    // Paying more than the price is still paid, with nothing left to collect.
    expect(paymentStatus(order({ price: 5000, paid: 6000 })).balance).toBe(0);
  });
});

describe("isClosed", () => {
  it("is true only for delivered and cancelled orders", () => {
    expect(["pending", "confirmed", "preparing", "ready"].map(isClosed)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(isClosed("delivered")).toBe(true);
    expect(isClosed("cancelled")).toBe(true);
  });
});

describe("todayKey", () => {
  it("is the local calendar date as YYYY-MM-DD", () => {
    expect(todayKey(new Date(2026, 9, 3, 23, 59))).toBe("2026-10-03");
  });
});

describe("groupOrders", () => {
  // Thursday 2026-10-22: tomorrow is Friday, the week ends on Sunday 25.
  const today = "2026-10-22";
  const ids = (groups) =>
    groups.map((group) => [group.label, group.orders.map((entry) => entry.id)]);

  it("groups by delivery date: Atrasados, Hoy, Mañana, Esta semana, Más adelante", () => {
    const orders = [
      order({ id: "later", dueDate: "2026-10-26" }),
      order({ id: "sunday", dueDate: "2026-10-25" }),
      order({ id: "saturday", dueDate: "2026-10-24" }),
      order({ id: "tomorrow", dueDate: "2026-10-23" }),
      order({ id: "today-late", dueDate: today, dueTime: "18:00" }),
      order({ id: "today-no-time", dueDate: today }),
      order({ id: "today-early", dueDate: today, dueTime: "09:30" }),
      order({ id: "late", dueDate: "2026-10-20", status: "ready" }),
    ];
    expect(ids(groupOrders(orders, today))).toEqual([
      ["Atrasados", ["late"]],
      // Without a time, at the end of its day.
      ["Hoy", ["today-early", "today-late", "today-no-time"]],
      ["Mañana", ["tomorrow"]],
      ["Esta semana", ["saturday", "sunday"]],
      ["Más adelante", ["later"]],
    ]);
    expect(groupOrders(orders, today)[0].id).toBe("overdue");
  });

  it("does not call a delivered or cancelled order late", () => {
    const orders = [
      order({ id: "old-delivered", dueDate: "2026-10-01", status: "delivered" }),
      order({ id: "old-cancelled", dueDate: "2026-10-15", status: "cancelled" }),
      order({ id: "today-delivered", dueDate: today, status: "delivered" }),
    ];
    expect(ids(groupOrders(orders, today))).toEqual([
      ["Hoy", ["today-delivered"]],
      // Most recent first.
      ["Anteriores", ["old-cancelled", "old-delivered"]],
    ]);
  });

  it("has no Esta semana when tomorrow is already Sunday", () => {
    const saturday = "2026-10-24";
    const orders = [
      order({ id: "sunday", dueDate: "2026-10-25" }),
      order({ id: "monday", dueDate: "2026-10-26" }),
    ];
    expect(ids(groupOrders(orders, saturday))).toEqual([
      ["Mañana", ["sunday"]],
      ["Más adelante", ["monday"]],
    ]);
  });
});
