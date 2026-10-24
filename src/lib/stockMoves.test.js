import { describe, expect, it } from "vitest";
import {
  applyMove,
  cancelMove,
  planPreparation,
  shoppingList,
  stockTransition,
  undoMove,
} from "./stockMoves";

const TODAY = "2026-10-23";
const ids = () => {
  let next = 0;
  return () => `nuevo-${++next}`;
};

// A batch of 21 cookies takes 1000 g of flour and 200 g of butter.
const harina = { id: "harina", name: "Harina", category: "Secos", unit: "g", packSize: 1000, packCost: 1000, stock: 2500 };
const manteca = { id: "manteca", name: "Manteca", category: "Lácteos", unit: "g", packSize: 200, packCost: 2000, stock: 500 };
const cookies = {
  id: "cookies",
  name: "Cookies",
  yield: 21,
  items: [
    { ingredientId: "harina", quantity: 1000 },
    { ingredientId: "manteca", quantity: 200 },
  ],
};
const box = { id: "box", name: "Box x8", packSize: 10, packCost: 9000, stock: 3 };

const data = (fields = {}) => ({
  recipes: [cookies],
  ingredients: [harina, manteca],
  packaging: [box],
  finishedGoods: [],
  ...fields,
});

const order = (fields = {}) => ({
  id: "o",
  status: "confirmed",
  items: [{ recipeId: "cookies", quantity: 16 }],
  packagingItems: [{ packagingId: "box", quantity: 2 }],
  ...fields,
});

const stockOf = (list, id) => list.find((item) => item.id === id)?.stock;

describe("planPreparation", () => {
  it("uses the finished goods first, then full batches, and keeps the leftover", () => {
    // "Si quedan 5 cookies y el pedido es de 16, faltan 11 [...] 1 tanda de 21
    // [...] 21 − 11 = 10 cookies para el próximo pedido."
    const plan = planPreparation(
      order(),
      data({ finishedGoods: [{ id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" }] }),
      TODAY,
      ids(),
    );
    expect(plan.shortages).toEqual([]);
    expect(plan.problems).toEqual([]);
    expect(plan.move).toEqual({
      ingredients: [
        { ingredientId: "harina", quantity: 1000 },
        { ingredientId: "manteca", quantity: 200 },
      ],
      packaging: [{ packagingId: "box", quantity: 2 }],
      taken: [{ lotId: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" }],
      cooked: [{ recipeId: "cookies", quantity: 11 }],
      created: [{ lotId: "nuevo-1", recipeId: "cookies", quantity: 10, madeAt: TODAY }],
    });
  });

  it("takes the oldest batches first and needs no batch when they are enough", () => {
    const plan = planPreparation(
      order({ items: [{ recipeId: "cookies", quantity: 12 }], packagingItems: [] }),
      data({
        finishedGoods: [
          { id: "nuevo", recipeId: "cookies", quantity: 10, madeAt: "2026-10-22" },
          { id: "viejo", recipeId: "cookies", quantity: 8, madeAt: "2026-10-18" },
        ],
      }),
      TODAY,
      ids(),
    );
    expect(plan.move.taken).toEqual([
      { lotId: "viejo", recipeId: "cookies", quantity: 8, madeAt: "2026-10-18" },
      { lotId: "nuevo", recipeId: "cookies", quantity: 4, madeAt: "2026-10-22" },
    ]);
    expect(plan.move.ingredients).toEqual([]);
    expect(plan.move.cooked).toEqual([]);
    expect(plan.move.created).toEqual([]);
  });

  it("adds up repeated lines and counts several batches", () => {
    // 30 + 13 = 43 cookies: 3 batches of 21 (63), 20 left over.
    const plan = planPreparation(
      order({
        items: [
          { recipeId: "cookies", quantity: 30 },
          { recipeId: "cookies", quantity: 13 },
        ],
        packagingItems: [],
      }),
      data({ ingredients: [{ ...harina, stock: 5000 }, { ...manteca, stock: 1000 }] }),
      TODAY,
      ids(),
    );
    expect(plan.move.ingredients).toEqual([
      { ingredientId: "harina", quantity: 3000 },
      { ingredientId: "manteca", quantity: 600 },
    ]);
    expect(plan.move.created[0].quantity).toBe(20);
    expect(plan.move.cooked).toEqual([{ recipeId: "cookies", quantity: 43 }]);
  });

  it("lists what is missing instead of going below zero", () => {
    // 2 batches: 2000 g of flour (has 2500), 400 g of butter (has 500), 2 boxes (has 3).
    const enough = planPreparation(
      order({ items: [{ recipeId: "cookies", quantity: 30 }] }),
      data(),
      TODAY,
      ids(),
    );
    expect(enough.shortages).toEqual([]);
    const short = planPreparation(
      order({ items: [{ recipeId: "cookies", quantity: 50 }] }),
      data({ packaging: [{ ...box, stock: 1 }] }),
      TODAY,
      ids(),
    );
    // 3 batches: 3000 g of flour, 600 g of butter, 2 boxes.
    expect(short.shortages).toEqual([
      { kind: "ingredient", id: "harina", name: "Harina", unit: "g", need: 3000, have: 2500, missing: 500 },
      { kind: "ingredient", id: "manteca", name: "Manteca", unit: "g", need: 600, have: 500, missing: 100 },
      { kind: "packaging", id: "box", name: "Box x8", unit: "un", need: 2, have: 1, missing: 1 },
    ]);
  });

  it("cannot prepare an order with a deleted recipe or packaging", () => {
    const plan = planPreparation(
      order({
        items: [{ recipeId: "borrada", quantity: 2 }],
        packagingItems: [{ packagingId: "borrado", quantity: 1 }],
      }),
      data(),
      TODAY,
      ids(),
    );
    expect(plan.problems).toEqual([
      { kind: "recipe", id: "borrada" },
      { kind: "packaging", id: "borrado" },
    ]);
  });
});

describe("applyMove", () => {
  it("deducts the ingredients and packaging and updates the finished goods", () => {
    const before = data({
      finishedGoods: [
        { id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" },
        { id: "otro", recipeId: "torta", quantity: 1, madeAt: "2026-10-21" },
      ],
    });
    const { move } = planPreparation(order(), before, TODAY, ids());
    const after = applyMove(before, move);
    expect(stockOf(after.ingredients, "harina")).toBe(1500);
    expect(stockOf(after.ingredients, "manteca")).toBe(300);
    expect(stockOf(after.packaging, "box")).toBe(1);
    // The used batch is gone; the untouched one keeps its identity.
    expect(after.finishedGoods).toEqual([
      before.finishedGoods[1],
      { id: "nuevo-1", recipeId: "cookies", quantity: 10, madeAt: TODAY },
    ]);
    expect(after.finishedGoods[0]).toBe(before.finishedGoods[1]);
  });
});

describe("undoMove", () => {
  it("returns exactly what was deducted", () => {
    const before = data({
      finishedGoods: [{ id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" }],
    });
    const { move } = planPreparation(order(), before, TODAY, ids());
    const after = undoMove(applyMove(before, move), move, TODAY, ids());
    expect(after.ingredients).toEqual(before.ingredients);
    expect(after.packaging).toEqual(before.packaging);
    expect(after.finishedGoods).toEqual(before.finishedGoods);
  });

  it("keeps what was cooked as finished goods when its leftover was already used", () => {
    const before = data();
    const newId = ids();
    const { move } = planPreparation(order(), before, TODAY, newId);
    const prepared = applyMove(before, move);
    // Another order took 4 of the 5 leftover cookies.
    const used = {
      ...prepared,
      finishedGoods: prepared.finishedGoods.map((lot) => ({ ...lot, quantity: 1 })),
    };
    const after = undoMove(used, move, TODAY, newId);
    expect(stockOf(after.ingredients, "harina")).toBe(1500);
    expect(stockOf(after.packaging, "box")).toBe(3);
    expect(after.finishedGoods).toEqual([
      { id: "nuevo-1", recipeId: "cookies", quantity: 1, madeAt: TODAY },
      { id: "nuevo-2", recipeId: "cookies", quantity: 16, madeAt: TODAY },
    ]);
  });
});

describe("cancelMove", () => {
  it("keeps what was cooked as finished goods, returns the packaging, not the ingredients", () => {
    const before = data({
      finishedGoods: [{ id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" }],
    });
    const newId = ids();
    const { move } = planPreparation(order(), before, TODAY, newId);
    const after = cancelMove(applyMove(before, move), move, "2026-10-24", newId);
    expect(stockOf(after.ingredients, "harina")).toBe(1500);
    expect(stockOf(after.packaging, "box")).toBe(3);
    // The 5 it took keep their date; the 11 cooked for it are dated the day
    // it was cancelled; the 10 left over stay.
    expect(after.finishedGoods).toEqual([
      { id: "nuevo-1", recipeId: "cookies", quantity: 10, madeAt: TODAY },
      { id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" },
      { id: "nuevo-2", recipeId: "cookies", quantity: 11, madeAt: "2026-10-24" },
    ]);
  });
});

describe("stockTransition", () => {
  it("deducts when an order starts being prepared, even skipping a step", () => {
    expect(stockTransition("confirmed", "preparing", false)).toBe("deduct");
    expect(stockTransition("pending", "ready", false)).toBe("deduct");
    expect(stockTransition("pending", "delivered", false)).toBe("deduct");
    expect(stockTransition("cancelled", "preparing", false)).toBe("deduct");
  });

  it("does nothing between the prepared states or for orders that deducted nothing", () => {
    expect(stockTransition("preparing", "ready", true)).toBe("none");
    expect(stockTransition("ready", "delivered", true)).toBe("none");
    // Already prepared before automatic stock existed.
    expect(stockTransition("ready", "delivered", false)).toBe("none");
    expect(stockTransition("ready", "confirmed", false)).toBe("none");
    expect(stockTransition("pending", "confirmed", false)).toBe("none");
    expect(stockTransition("confirmed", "cancelled", false)).toBe("none");
  });

  it("undoes when going back and keeps the cooked goods when cancelled", () => {
    expect(stockTransition("preparing", "confirmed", true)).toBe("undo");
    expect(stockTransition("delivered", "pending", true)).toBe("undo");
    expect(stockTransition("preparing", "cancelled", true)).toBe("cancel");
  });
});

describe("shoppingList", () => {
  it("adds up the active orders not prepared yet, minus the finished goods, by full batches", () => {
    // "Si esta semana hay 30 cookies pedidas y 5 ya hechas, son 2 tandas."
    const list = shoppingList(
      data({
        finishedGoods: [{ id: "lote", recipeId: "cookies", quantity: 5, madeAt: "2026-10-20" }],
        orders: [
          order({ id: "a", status: "pending", items: [{ recipeId: "cookies", quantity: 18 }] }),
          order({ id: "b", status: "confirmed", items: [{ recipeId: "cookies", quantity: 12 }] }),
          // Already deducted, finished or cancelled: not counted.
          order({ id: "c", status: "preparing", stockMove: { ingredients: [] } }),
          order({ id: "d", status: "delivered" }),
          order({ id: "e", status: "cancelled" }),
        ],
      }),
    );
    expect(list.batches).toEqual([{ recipeId: "cookies", name: "Cookies", count: 2 }]);
    expect(list.groups).toEqual([
      {
        label: "Secos",
        items: [{ kind: "ingredient", id: "harina", name: "Harina", unit: "g", need: 2000, have: 2500, missing: 0 }],
      },
      {
        label: "Lácteos",
        items: [{ kind: "ingredient", id: "manteca", name: "Manteca", unit: "g", need: 400, have: 500, missing: 0 }],
      },
      {
        label: "Packaging",
        items: [{ kind: "packaging", id: "box", name: "Box x8", unit: "un", need: 4, have: 3, missing: 1 }],
      },
    ]);
  });

  it("is empty without active orders", () => {
    expect(shoppingList(data({ orders: [] }))).toEqual({ batches: [], groups: [] });
  });
});
