import { describe, expect, it } from "vitest";
import {
  balanceDue,
  compareMonths,
  monthLabel,
  monthSummary,
  oldFinishedGoods,
  shiftMonth,
  topRecipes,
  upcomingDeliveries,
} from "./dashboard";

const harina = { id: "harina", name: "Harina", unit: "g", packSize: 1000, packCost: 1000 };
// Cookies cost 100 per unit and sell at 300; tortas cost 1000 and have no
// sale price (suggested at +100%: 2000).
const cookies = { id: "cookies", name: "Cookies", yield: 21, margin: 0, extras: 0, salePrice: 300, items: [{ ingredientId: "harina", quantity: 2100 }] };
const torta = { id: "torta", name: "Torta", yield: 1, margin: 100, extras: 0, items: [{ ingredientId: "harina", quantity: 1000 }] };
const box = { id: "box", name: "Box x8", packSize: 10, packCost: 9000 };
const catalog = { recipes: [cookies, torta], ingredients: [harina], packaging: [box] };

const order = (fields) => ({
  id: fields.id,
  client: fields.id,
  dueDate: "2026-10-10",
  dueTime: "",
  items: [],
  packagingItems: [],
  price: 0,
  paid: 0,
  status: "delivered",
  ...fields,
});

describe("monthSummary", () => {
  it("adds up what was collected from the delivered orders of the month, its cost and real profit", () => {
    const orders = [
      // Cost 16 × 100 + 2 boxes × 900 = 3400.
      order({ id: "a", items: [{ recipeId: "cookies", quantity: 16 }], packagingItems: [{ packagingId: "box", quantity: 2 }], price: 6000, paid: 6000 }),
      // Delivered but only half collected: cost 1000.
      order({ id: "b", items: [{ recipeId: "torta", quantity: 1 }], price: 3000, paid: 1500 }),
      // Not delivered yet: counts as an order, not as a sale.
      order({ id: "c", status: "confirmed", items: [{ recipeId: "torta", quantity: 1 }], price: 3000, paid: 1000 }),
      // Cancelled: nothing.
      order({ id: "d", status: "cancelled", price: 9000, paid: 9000 }),
      // Another month.
      order({ id: "e", dueDate: "2026-09-30", price: 9000, paid: 9000 }),
    ];
    expect(monthSummary(orders, catalog, "2026-10")).toEqual({
      sales: 7500,
      cost: 4400,
      profit: 3100,
      margin: 41,
      orderCount: 3,
    });
  });

  it("has no margin without sales", () => {
    expect(monthSummary([], catalog, "2026-10")).toEqual({
      sales: 0,
      cost: 0,
      profit: 0,
      margin: null,
      orderCount: 0,
    });
  });
});

describe("compareMonths", () => {
  it("gives the change of each number against the month before, in %", () => {
    const current = { sales: 112000, profit: 85000, orderCount: 10, margin: 76 };
    const previous = { sales: 100000, profit: 75893, orderCount: 0, margin: 76 };
    expect(compareMonths(current, previous)).toEqual({
      sales: 12,
      profit: 12,
      // No orders the month before: no percentage to show.
      orderCount: null,
    });
    expect(compareMonths({ sales: 50, profit: -10, orderCount: 1 }, { sales: 100, profit: 20, orderCount: 2 })).toEqual({
      sales: -50,
      profit: -150,
      orderCount: -50,
    });
  });
});

describe("months", () => {
  it("moves across years and names the month", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthLabel("2026-09")).toBe("Septiembre 2026");
  });
});

describe("balanceDue", () => {
  it("is what señados and delivered orders still owe, of any month", () => {
    const orders = [
      order({ id: "a", status: "confirmed", price: 5000, paid: 2000 }),
      order({ id: "b", dueDate: "2026-08-01", price: 4000, paid: 0 }),
      // Not señado and not delivered: nothing agreed to collect yet.
      order({ id: "c", status: "pending", price: 9000, paid: 0 }),
      order({ id: "d", status: "cancelled", price: 9000, paid: 1000 }),
      order({ id: "e", price: 3000, paid: 3000 }),
    ];
    expect(balanceDue(orders)).toBe(3000 + 4000);
  });
});

describe("upcomingDeliveries", () => {
  it("lists the open orders of the next 7 days, late ones first", () => {
    const today = "2026-10-24";
    const orders = [
      order({ id: "later", status: "confirmed", dueDate: "2026-10-31" }),
      order({ id: "last-day", status: "confirmed", dueDate: "2026-10-30" }),
      order({ id: "today", status: "ready", dueDate: today, dueTime: "18:00" }),
      order({ id: "late", status: "preparing", dueDate: "2026-10-22" }),
      order({ id: "done", status: "delivered", dueDate: today }),
    ];
    expect(
      upcomingDeliveries(orders, today).map((entry) => [entry.id, entry.late]),
    ).toEqual([
      ["late", true],
      ["today", false],
      ["last-day", false],
    ]);
  });
});

describe("oldFinishedGoods", () => {
  it("lists the batches made more than 3 days ago, oldest first", () => {
    const lots = [
      { id: "a", recipeId: "cookies", quantity: 5, madeAt: "2026-10-21" },
      { id: "b", recipeId: "cookies", quantity: 2, madeAt: "2026-10-20" },
      { id: "c", recipeId: "torta", quantity: 1, madeAt: "2026-10-12" },
    ];
    expect(oldFinishedGoods(lots, "2026-10-24").map((lot) => lot.id)).toEqual(["c", "b"]);
  });
});

describe("topRecipes", () => {
  it("ranks the month's delivered recipes by units and by profit, which can differ", () => {
    const orders = [
      order({ id: "a", items: [{ recipeId: "cookies", quantity: 30 }] }),
      order({ id: "b", items: [{ recipeId: "cookies", quantity: 10 }, { recipeId: "torta", quantity: 3 }] }),
      order({ id: "c", status: "confirmed", items: [{ recipeId: "torta", quantity: 50 }] }),
      order({ id: "d", items: [{ recipeId: "borrada", quantity: 99 }] }),
    ];
    const top = topRecipes(orders, catalog, "2026-10");
    expect(top.sold).toEqual([
      { recipeId: "cookies", name: "Cookies", units: 40 },
      { recipeId: "torta", name: "Torta", units: 3 },
    ]);
    // Cookies: 40 × (300 − 100) = 8000; torta: 3 × (2000 − 1000) = 3000.
    expect(top.profitable).toEqual([
      { recipeId: "cookies", name: "Cookies", profit: 8000 },
      { recipeId: "torta", name: "Torta", profit: 3000 },
    ]);
  });

  it("keeps the top 5", () => {
    const recipes = Array.from({ length: 7 }, (_, index) => ({ ...cookies, id: `r${index}`, name: `R${index}` }));
    const orders = recipes.map((recipe, index) =>
      order({ id: recipe.id, items: [{ recipeId: recipe.id, quantity: index + 1 }] }),
    );
    expect(topRecipes(orders, { ...catalog, recipes }, "2026-10").sold.map((entry) => entry.name)).toEqual([
      "R6",
      "R5",
      "R4",
      "R3",
      "R2",
    ]);
  });
});
