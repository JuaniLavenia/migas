import { afterEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createIdbImageStore } from "./idbImageStore";
import { describeImageStoreContract } from "../../test/imageStoreContract";

// The node environment has no IndexedDB: each test gets a fresh in-memory one
// from fake-indexeddb.
const realIndexedDB = globalThis.indexedDB;
afterEach(() => {
  globalThis.indexedDB = realIndexedDB;
});

describeImageStoreContract("IndexedDB image store", () => {
  globalThis.indexedDB = new IDBFactory();
  return createIdbImageStore();
});

describe("IndexedDB image store availability", () => {
  it("is unavailable when the browser has no IndexedDB", async () => {
    delete globalThis.indexedDB;
    const store = createIdbImageStore();
    expect(await store.isAvailable()).toBe(false);
    await expect(store.save(new Blob(["x"]))).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("is unavailable when opening the database fails (e.g. private mode)", async () => {
    globalThis.indexedDB = {
      open() {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    const store = createIdbImageStore();
    expect(await store.isAvailable()).toBe(false);
  });

  it("keeps images across store instances on the same database", async () => {
    globalThis.indexedDB = new IDBFactory();
    const id = await createIdbImageStore().save(
      new Blob(["abc"], { type: "image/webp" }),
    );
    const blob = await createIdbImageStore().get(id);
    expect(blob.size).toBe(3);
  });
});
