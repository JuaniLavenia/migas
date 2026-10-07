import { describe, expect, it, vi } from "vitest";
import {
  RECIPE_STORAGE_VERSION,
  createSafeStorage,
  migrateRecipeState,
} from "./recipeStorage";

const ingredient = {
  id: "harina",
  name: "Harina 0000",
  category: "Secos",
  unit: "g",
  packSize: 1000,
  packCost: 1250,
};

const legacyRecipe = {
  id: "cookies",
  name: "Cookies",
  yield: 18,
  margin: 65,
  extras: 180,
  updated: "Hoy",
  items: [{ ingredientId: "harina", quantity: 280 }],
};

const NOW = 1790000000000;

describe("migrateRecipeState", () => {
  it("targets version 1", () => {
    expect(RECIPE_STORAGE_VERSION).toBe(1);
  });

  it("keeps every unversioned (v0) ingredient and recipe", () => {
    const result = migrateRecipeState(
      { ingredients: [ingredient], recipes: [legacyRecipe] },
      0,
      NOW,
    );
    expect(result.ingredients).toEqual([ingredient]);
    expect(result.recipes).toHaveLength(1);
    expect(result.recipes[0]).toMatchObject({
      id: "cookies",
      name: "Cookies",
      yield: 18,
      margin: 65,
      extras: 180,
      items: legacyRecipe.items,
    });
  });

  it("replaces the v0 `updated` label with the migration time", () => {
    // Labels like "Hoy" or "Ayer" are relative to when they were written,
    // so they cannot be turned into a real date.
    const [recipe] = migrateRecipeState(
      { recipes: [legacyRecipe] },
      0,
      NOW,
    ).recipes;
    expect(recipe.updatedAt).toBe(NOW);
    expect(recipe).not.toHaveProperty("updated");
  });

  it("keeps a valid updatedAt and leaves non-object recipes alone", () => {
    const { updated, ...dated } = { ...legacyRecipe, updatedAt: 1000 };
    const result = migrateRecipeState({ recipes: [dated, null] }, 0, NOW);
    expect(result.recipes).toEqual([dated, null]);
  });

  it("does not touch data already at version 1", () => {
    const current = { ingredients: [ingredient], recipes: [legacyRecipe] };
    expect(migrateRecipeState(current, 1, NOW)).toEqual(current);
  });

  it("keeps only the data collections", () => {
    const result = migrateRecipeState(
      { ingredients: [], recipes: [], selectedId: "x", stale: true },
      0,
    );
    expect(result).toEqual({ ingredients: [], recipes: [] });
  });

  it("leaves a collection out when it is missing or not an array", () => {
    expect(migrateRecipeState({ ingredients: "broken" }, 0)).toEqual({});
  });

  it.each([null, undefined, "text", 42, []])(
    "returns no data for %s, so the defaults are kept",
    (persisted) => {
      expect(migrateRecipeState(persisted, 0)).toEqual({});
    },
  );
});

describe("createSafeStorage", () => {
  function fakeStorage() {
    const data = new Map();
    return {
      getItem: vi.fn((key) => (data.has(key) ? data.get(key) : null)),
      setItem: vi.fn((key, value) => data.set(key, value)),
      removeItem: vi.fn((key) => data.delete(key)),
    };
  }

  it("reads and writes through the given storage and reports success", () => {
    const storage = fakeStorage();
    const onWrite = vi.fn();
    const safe = createSafeStorage(() => storage, onWrite);
    safe.setItem("key", "value");
    expect(safe.getItem("key")).toBe("value");
    expect(onWrite).toHaveBeenCalledWith(true);
    safe.removeItem("key");
    expect(safe.getItem("key")).toBeNull();
  });

  it("reports a failed write instead of throwing", () => {
    const storage = fakeStorage();
    storage.setItem.mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const onWrite = vi.fn();
    const safe = createSafeStorage(() => storage, onWrite);
    expect(() => safe.setItem("key", "value")).not.toThrow();
    expect(onWrite).toHaveBeenCalledWith(false);
  });

  it("treats an unavailable storage as empty and unwritable", () => {
    const onWrite = vi.fn();
    const safe = createSafeStorage(() => {
      throw new Error("blocked");
    }, onWrite);
    expect(safe.getItem("key")).toBeNull();
    expect(() => safe.setItem("key", "value")).not.toThrow();
    expect(() => safe.removeItem("key")).not.toThrow();
    expect(onWrite).toHaveBeenCalledWith(false);
  });
});
