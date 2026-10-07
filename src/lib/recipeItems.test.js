import { describe, expect, it } from "vitest";
import { addNextItem, removeItemAt, updateItemAt } from "./recipeItems";

const ingredients = [
  { id: "harina", name: "Harina" },
  { id: "manteca", name: "Manteca" },
  { id: "azucar", name: "Azúcar" },
];

const items = [
  { ingredientId: "harina", quantity: 100 },
  { ingredientId: "manteca", quantity: 50 },
];

describe("updateItemAt", () => {
  it("replaces one field of the item at the index", () => {
    const next = updateItemAt(items, 1, "ingredientId", "azucar");
    expect(next).toEqual([
      { ingredientId: "harina", quantity: 100 },
      { ingredientId: "azucar", quantity: 50 },
    ]);
    expect(next).not.toBe(items);
    expect(next[0]).toBe(items[0]);
    expect(items[1].ingredientId).toBe("manteca");
  });

  it("stores the quantity as a number", () => {
    expect(updateItemAt(items, 0, "quantity", "250")[0].quantity).toBe(250);
  });

  it("keeps other fields as given", () => {
    expect(updateItemAt(items, 0, "ingredientId", "7")[0].ingredientId).toBe(
      "7",
    );
  });
});

describe("addNextItem", () => {
  it("appends the first ingredient not used yet, with quantity 0", () => {
    expect(addNextItem(items, ingredients)).toEqual([
      ...items,
      { ingredientId: "azucar", quantity: 0 },
    ]);
  });

  it("falls back to the first ingredient when all are used", () => {
    const all = ingredients.map((ingredient) => ({
      ingredientId: ingredient.id,
      quantity: 1,
    }));
    expect(addNextItem(all, ingredients).at(-1)).toEqual({
      ingredientId: "harina",
      quantity: 0,
    });
  });

  it("returns the same array when there are no ingredients", () => {
    expect(addNextItem(items, [])).toBe(items);
  });
});

describe("removeItemAt", () => {
  it("removes only the item at the index", () => {
    expect(removeItemAt(items, 0)).toEqual([items[1]]);
    expect(items).toHaveLength(2);
  });
});
