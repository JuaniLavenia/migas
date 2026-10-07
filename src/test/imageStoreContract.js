import { beforeEach, describe, expect, it } from "vitest";

function imageBlob(bytes, type = "image/webp") {
  return new Blob([new Uint8Array(bytes)], { type });
}

// Behavior every image store adapter must honor (see lib/images/imageStore).
// `makeStore` returns a fresh, empty, available store for each test.
export function describeImageStoreContract(name, makeStore) {
  describe(`${name} (image store contract)`, () => {
    let store;
    beforeEach(async () => {
      store = await makeStore();
    });

    it("reports itself available", async () => {
      expect(await store.isAvailable()).toBe(true);
    });

    it("saves a blob under a new id and returns it back", async () => {
      const id = await store.save(imageBlob(10));
      expect(typeof id).toBe("string");
      expect(id).not.toBe("");
      const blob = await store.get(id);
      expect(blob.size).toBe(10);
      expect(blob.type).toBe("image/webp");
    });

    it("gives each saved image its own id", async () => {
      const first = await store.save(imageBlob(1));
      const second = await store.save(imageBlob(2));
      expect(first).not.toBe(second);
    });

    it("returns null for an unknown id", async () => {
      expect(await store.get("missing")).toBeNull();
    });

    it("removes an image, and removing an unknown id is a no-op", async () => {
      const id = await store.save(imageBlob(4));
      await store.remove(id);
      await store.remove("missing");
      expect(await store.get(id)).toBeNull();
    });

    it("lists every image with its size", async () => {
      const small = await store.save(imageBlob(3));
      const big = await store.save(imageBlob(7, "image/jpeg"));
      const listed = await store.list();
      expect(listed).toHaveLength(2);
      expect(listed).toEqual(
        expect.arrayContaining([
          { id: small, size: 3 },
          { id: big, size: 7 },
        ]),
      );
    });
  });
}
