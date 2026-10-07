// Characterization tests: they pin the behavior of recipeMath, including its
// fallbacks, so later refactors cannot change costs silently.
// Phase 1 (T1.5) intentionally changed one fallback: an invalid pack size
// (0, missing, negative) no longer falls back to 1; the ingredient has no unit
// price and its lines cost 0 (and are reported as invalid).
import { describe, expect, it } from "vitest";
import {
  countRecipesUsingIngredient,
  indexIngredients,
  ingredientCost,
  recipeTotals,
  unitPrice,
} from "./recipeMath";

// Shapes mirror the demo data in src/stores/useRecipeStore.js.
const ingredients = [
  { id: "harina", name: "Harina 0000", unit: "g", packSize: 1000, packCost: 1250 },
  { id: "manteca", name: "Manteca", unit: "g", packSize: 200, packCost: 2100 },
  { id: "azucar", name: "Azúcar", unit: "g", packSize: 1000, packCost: 980 },
  { id: "huevos", name: "Huevos", unit: "un", packSize: 12, packCost: 2400 },
  { id: "chocolate", name: "Chocolate cobertura", unit: "g", packSize: 500, packCost: 4600 },
];

const cookies = {
  id: "cookies",
  yield: 18,
  margin: 65,
  extras: 180,
  items: [
    { ingredientId: "harina", quantity: 280 },
    { ingredientId: "manteca", quantity: 120 },
    { ingredientId: "azucar", quantity: 160 },
    { ingredientId: "huevos", quantity: 2 },
    { ingredientId: "chocolate", quantity: 180 },
  ],
};

describe("ingredientCost", () => {
  it("prorates the pack cost by quantity", () => {
    expect(ingredientCost(ingredients[0], 280)).toBeCloseTo(350);
    expect(ingredientCost(ingredients[3], 2)).toBeCloseTo(400);
  });

  it.each([
    ["0", 0],
    ["missing", undefined],
    ["negative", -10],
  ])("costs 0 when packSize is %s", (_label, packSize) => {
    expect(ingredientCost({ packSize, packCost: 100 }, 3)).toBe(0);
  });

  it("treats a missing packCost as 0", () => {
    expect(ingredientCost({ packSize: 1000 }, 500)).toBe(0);
  });

  it("coerces numeric strings", () => {
    expect(ingredientCost({ packSize: "200", packCost: "2100" }, "120")).toBeCloseTo(1260);
  });
});

describe("unitPrice", () => {
  it("divides the pack cost by the pack size", () => {
    expect(unitPrice({ packSize: 200, packCost: 2100 })).toBeCloseTo(10.5);
  });

  it("coerces numeric strings", () => {
    expect(unitPrice({ packSize: "500", packCost: "4600" })).toBeCloseTo(9.2);
  });

  it("treats a missing packCost as 0", () => {
    expect(unitPrice({ packSize: 1000 })).toBe(0);
  });

  it.each([
    ["0", 0],
    ["missing", undefined],
    ["negative", -1],
    ["non-numeric", "abc"],
  ])("returns null when packSize is %s", (_label, packSize) => {
    expect(unitPrice({ packSize, packCost: 100 })).toBeNull();
  });
});

describe("recipeTotals", () => {
  it("computes cost, unit cost and price for the demo cookies recipe", () => {
    // 350 + 1260 + 156.8 + 400 + 1656 = 3822.8, plus 180 extras.
    const totals = recipeTotals(cookies, ingredients);
    expect(totals.cost).toBeCloseTo(4002.8);
    expect(totals.unitCost).toBeCloseTo(4002.8 / 18);
    expect(totals.price).toBeCloseTo((4002.8 / 18) * 1.65);
  });

  it("ignores items whose ingredient does not exist", () => {
    const recipe = {
      yield: 1,
      items: [
        { ingredientId: "harina", quantity: 1000 },
        { ingredientId: "missing", quantity: 999 },
      ],
    };
    expect(recipeTotals(recipe, ingredients).cost).toBeCloseTo(1250);
  });

  it("counts lines whose ingredient does not exist as missing", () => {
    const recipe = {
      yield: 1,
      items: [
        { ingredientId: "harina", quantity: 1000 },
        { ingredientId: "missing", quantity: 999 },
        { ingredientId: "gone", quantity: 1 },
      ],
    };
    expect(recipeTotals(recipe, ingredients).missingCount).toBe(2);
  });

  it("counts lines whose ingredient has an invalid pack size as missing", () => {
    const broken = { id: "broken", packSize: 0, packCost: 100 };
    const recipe = {
      yield: 1,
      items: [
        { ingredientId: "broken", quantity: 5 },
        { ingredientId: "harina", quantity: 1000 },
      ],
    };
    const totals = recipeTotals(recipe, [...ingredients, broken]);
    expect(totals.missingCount).toBe(1);
    expect(totals.cost).toBeCloseTo(1250);
  });

  it("reports no missing lines for a complete recipe", () => {
    expect(recipeTotals(cookies, ingredients).missingCount).toBe(0);
  });

  it.each([
    ["missing", undefined],
    ["not an array", "harina"],
  ])("treats %s items as an empty list", (_label, items) => {
    const recipe = { yield: 1, extras: 50, items };
    expect(recipeTotals(recipe, ingredients).cost).toBeCloseTo(50);
  });

  it("adds extras to the cost", () => {
    const recipe = { yield: 1, extras: 50, items: [] };
    expect(recipeTotals(recipe, ingredients).cost).toBeCloseTo(50);
  });

  it("treats missing extras as 0", () => {
    const recipe = { yield: 1, items: [{ ingredientId: "harina", quantity: 1000 }] };
    expect(recipeTotals(recipe, ingredients).cost).toBeCloseTo(1250);
  });

  it.each([
    ["0", 0],
    ["missing", undefined],
    ["negative", -5],
    ["fractional below 1", 0.5],
  ])("clamps a %s yield to 1", (_label, yieldValue) => {
    const recipe = { yield: yieldValue, extras: 100, items: [] };
    expect(recipeTotals(recipe, ingredients).unitCost).toBeCloseTo(100);
  });

  it("applies the margin as a percentage over unit cost", () => {
    const recipe = { yield: 4, margin: 50, extras: 400, items: [] };
    const totals = recipeTotals(recipe, ingredients);
    expect(totals.unitCost).toBeCloseTo(100);
    expect(totals.price).toBeCloseTo(150);
  });

  it("treats a missing margin as 0", () => {
    const recipe = { yield: 2, extras: 100, items: [] };
    expect(recipeTotals(recipe, ingredients).price).toBeCloseTo(50);
  });

  it("coerces numeric strings in yield, margin, extras and quantity", () => {
    const recipe = {
      yield: "2",
      margin: "10",
      extras: "100",
      items: [{ ingredientId: "harina", quantity: "1000" }],
    };
    const totals = recipeTotals(recipe, ingredients);
    expect(totals.cost).toBeCloseTo(1350);
    expect(totals.unitCost).toBeCloseTo(675);
    expect(totals.price).toBeCloseTo(742.5);
  });

  it("gives the same totals with a prebuilt ingredient index", () => {
    expect(
      recipeTotals(cookies, ingredients, indexIngredients(ingredients)),
    ).toEqual(recipeTotals(cookies, ingredients));
  });
});

describe("indexIngredients", () => {
  it("maps each id to its ingredient", () => {
    const byId = indexIngredients(ingredients);
    expect(byId.size).toBe(ingredients.length);
    expect(byId.get("manteca")).toBe(ingredients[1]);
  });

  it("keeps the first ingredient of a repeated id, like Array#find", () => {
    const duplicate = { ...ingredients[0], packCost: 1 };
    expect(indexIngredients([...ingredients, duplicate]).get("harina")).toBe(
      ingredients[0],
    );
  });
});

describe("countRecipesUsingIngredient", () => {
  const recipes = [
    cookies,
    { id: "budin", items: [{ ingredientId: "harina", quantity: 300 }] },
    { id: "flan", items: [{ ingredientId: "huevos", quantity: 6 }] },
    { id: "roto" },
  ];

  it("counts each recipe that uses the ingredient once", () => {
    const repeated = {
      id: "doble",
      items: [
        { ingredientId: "harina", quantity: 1 },
        { ingredientId: "harina", quantity: 2 },
      ],
    };
    expect(countRecipesUsingIngredient([...recipes, repeated], "harina")).toBe(3);
  });

  it("returns 0 when no recipe uses the ingredient", () => {
    expect(countRecipesUsingIngredient(recipes, "sal")).toBe(0);
  });

  it("tolerates recipes without items", () => {
    expect(countRecipesUsingIngredient(recipes, "huevos")).toBe(2);
  });
});
