import { describe, expect, it } from "vitest";
import { removeOrphanImages } from "./orphans";
import { createMemoryImageStore } from "./memoryImageStore";

const blob = () => new Blob(["x"], { type: "image/webp" });

describe("removeOrphanImages", () => {
  it("removes images no recipe references and keeps the rest", async () => {
    const store = createMemoryImageStore();
    const kept = await store.save(blob());
    await store.save(blob());
    await store.save(blob());
    const removed = await removeOrphanImages(store, () => [
      { id: "r1", imageId: kept },
      { id: "r2" },
    ]);
    expect(removed).toBe(2);
    expect(await store.list()).toEqual([{ id: kept, size: 1 }]);
  });

  it("reads the referenced ids after listing, so a just-attached image is kept", async () => {
    const store = createMemoryImageStore();
    const attached = await store.save(blob());
    let recipes = [];
    const originalList = store.list;
    store.list = async () => {
      const listed = await originalList();
      recipes = [{ id: "r1", imageId: attached }];
      return listed;
    };
    expect(await removeOrphanImages(store, () => recipes)).toBe(0);
  });

  it("does nothing when the store is unavailable", async () => {
    const store = createMemoryImageStore({ available: false });
    expect(await removeOrphanImages(store, () => [])).toBe(0);
  });

  it("keeps going when one removal fails", async () => {
    const store = createMemoryImageStore();
    await store.save(blob());
    await store.save(blob());
    const originalRemove = store.remove;
    let calls = 0;
    store.remove = async (id) => {
      calls += 1;
      if (calls === 1) throw new Error("locked");
      return originalRemove(id);
    };
    expect(await removeOrphanImages(store, () => [])).toBe(1);
  });
});
