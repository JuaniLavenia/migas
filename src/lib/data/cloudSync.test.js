import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import { createCloudSync } from "./cloudSync";
import { createMemoryRepository } from "./memoryRepository";

const recipe = (id, name = id) => ({
  id,
  name,
  yield: 1,
  margin: 0,
  extras: 0,
  updatedAt: 1000,
  items: [],
});
const ingredient = (id) => ({
  id,
  name: id,
  category: "Secos",
  unit: "g",
  packSize: 1000,
  packCost: 100,
});

const initial = {
  recipeCategories: [],
  ingredients: [ingredient("harina"), ingredient("azucar")],
  recipes: [recipe("a"), recipe("b"), recipe("c")],
};

let store;
let repository;
let statuses;
let sync;

beforeEach(() => {
  vi.useFakeTimers();
  store = create(() => ({ ...initial, unrelated: 0 }));
  repository = createMemoryRepository({ data: initial });
  statuses = [];
  sync = createCloudSync({
    store,
    repository,
    businessId: "business-1",
    onStatus: (status) => statuses.push(status),
    delay: 500,
    retryDelay: 3000,
  });
});

afterEach(() => {
  sync.stop();
  vi.useRealTimers();
});

function renameRecipe(id, name) {
  store.setState((state) => ({
    recipes: state.recipes.map((entry) =>
      entry.id === id ? { ...entry, name } : entry,
    ),
  }));
}

describe("cloud sync", () => {
  it("groups quick edits of a record into one save after a pause", async () => {
    renameRecipe("b", "B");
    renameRecipe("b", "Br");
    renameRecipe("b", "Bro");
    expect(repository.writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.writes).toEqual([
      { type: "save", collection: "recipes", ids: ["b"] },
    ]);
    expect(repository.snapshot().recipes[1].name).toBe("Bro");
    expect(statuses).toEqual(["saving", "saved"]);
  });

  it("removes deleted records", async () => {
    store.setState((state) => ({
      ingredients: state.ingredients.filter((item) => item.id !== "harina"),
    }));
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.writes).toEqual([
      { type: "remove", collection: "ingredients", ids: ["harina"] },
    ]);
    expect(repository.snapshot().ingredients.map((item) => item.id)).toEqual([
      "azucar",
    ]);
  });

  it("saves the new positions when the order changes", async () => {
    store.setState((state) => ({
      recipes: [state.recipes[2], state.recipes[0], state.recipes[1]],
    }));
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.snapshot().recipes.map((entry) => entry.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("saves new records and ignores state outside the data", async () => {
    store.setState((state) => ({
      recipes: [...state.recipes, recipe("d")],
      unrelated: 1,
    }));
    await vi.advanceTimersByTimeAsync(500);
    // An insertion renumbers the collection.
    expect(repository.writes).toEqual([
      { type: "save", collection: "recipes", ids: ["a", "b", "c", "d"] },
    ]);
    expect(repository.snapshot().recipes.map((entry) => entry.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    store.setState({ unrelated: 2 });
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.writes).toHaveLength(1);
  });

  it("does not write data that came from the cloud", async () => {
    sync.replaceData({ ...initial, recipes: [recipe("z")] });
    expect(store.getState().recipes.map((entry) => entry.id)).toEqual(["z"]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(repository.writes).toEqual([]);
  });

  it("flushes pending changes right away when asked", async () => {
    renameRecipe("a", "Ahora");
    await sync.flush();
    expect(repository.snapshot().recipes[0].name).toBe("Ahora");
    expect(sync.hasPending()).toBe(false);
  });

  it("reports a failed save and retries it until it goes through", async () => {
    repository.failNext(1);
    renameRecipe("a", "Reintento");
    await vi.advanceTimersByTimeAsync(500);
    expect(statuses).toEqual(["saving", "error"]);
    expect(sync.hasPending()).toBe(true);
    expect(repository.snapshot().recipes[0].name).toBe("a");

    await vi.advanceTimersByTimeAsync(3000);
    expect(statuses).toEqual(["saving", "error", "saving", "saved"]);
    expect(repository.snapshot().recipes[0].name).toBe("Reintento");
  });

  it("keeps the order after a removal followed by an insertion", async () => {
    store.setState((state) => ({
      recipes: state.recipes.filter((entry) => entry.id !== "b"),
    }));
    await vi.advanceTimersByTimeAsync(500);
    store.setState((state) => ({ recipes: [...state.recipes, recipe("d")] }));
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.snapshot().recipes.map((entry) => entry.id)).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("keeps a record deleted while its save was pending deleted", async () => {
    renameRecipe("a", "Casi");
    store.setState((state) => ({
      recipes: state.recipes.filter((entry) => entry.id !== "a"),
    }));
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.snapshot().recipes.map((entry) => entry.id)).toEqual([
      "b",
      "c",
    ]);
  });
});
