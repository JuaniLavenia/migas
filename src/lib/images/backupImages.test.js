import { describe, expect, it, vi } from "vitest";
import {
  blobToDataUrl,
  collectBackupImages,
  dataUrlToBlob,
  isImageDataUrl,
  restoreBackupImages,
} from "./backupImages";
import { createMemoryImageStore } from "./memoryImageStore";
import { ImageStoreError } from "./imageStoreErrors";

// "abc" in base64.
const WEBP = "data:image/webp;base64,YWJj";
const PNG = "data:image/png;base64,iVBORw0KGgo=";

const recipe = (id, imageId) => ({
  id,
  name: id,
  yield: 1,
  margin: 0,
  extras: 0,
  updatedAt: 1,
  items: [],
  ...(imageId ? { imageId } : {}),
});

describe("isImageDataUrl", () => {
  it.each([WEBP, PNG, "data:image/jpeg;base64,/9j/4AAQ"])("accepts %s", (url) => {
    expect(isImageDataUrl(url)).toBe(true);
  });

  it.each([
    ["not a string", 42],
    ["another MIME type", "data:text/plain;base64,YWJj"],
    ["SVG (can carry scripts, never exported)", "data:image/svg+xml;base64,YWJj"],
    ["no base64 marker", "data:image/png,abc"],
    ["characters outside base64", "data:image/png;base64,YW*j"],
    ["a length that is not a multiple of 4", "data:image/png;base64,YWJ"],
    ["an empty payload", "data:image/png;base64,"],
    ["a plain URL", "https://example.com/foto.png"],
  ])("rejects %s", (_label, value) => {
    expect(isImageDataUrl(value)).toBe(false);
  });
});

describe("data URL conversion", () => {
  it("round-trips a blob through a data URL", async () => {
    const blob = new Blob([new Uint8Array([0, 1, 2, 250, 255])], {
      type: "image/webp",
    });
    const url = await blobToDataUrl(blob);
    expect(url).toMatch(/^data:image\/webp;base64,/);
    const back = dataUrlToBlob(url);
    expect(back.type).toBe("image/webp");
    expect([...new Uint8Array(await back.arrayBuffer())]).toEqual([
      0, 1, 2, 250, 255,
    ]);
  });

  it("refuses to convert an invalid data URL", () => {
    expect(() => dataUrlToBlob("data:text/plain;base64,YWJj")).toThrow();
  });
});

describe("collectBackupImages", () => {
  it("exports each referenced image once, keyed by its id", async () => {
    const store = createMemoryImageStore();
    const shared = await store.save(new Blob(["abc"], { type: "image/webp" }));
    await store.save(new Blob(["unused"], { type: "image/webp" }));
    const images = await collectBackupImages(
      [recipe("a", shared), recipe("b", shared), recipe("c"), recipe("d", "gone")],
      store,
    );
    expect(images).toEqual({ [shared]: WEBP });
  });

  it("exports nothing when the store is unavailable", async () => {
    const store = createMemoryImageStore({ available: false });
    expect(await collectBackupImages([recipe("a", "x")], store)).toEqual({});
  });
});

describe("restoreBackupImages", () => {
  it("stores the images under new ids and points the recipes to them", async () => {
    const store = createMemoryImageStore();
    const result = await restoreBackupImages(
      [recipe("a", "old-1"), recipe("b", "old-1"), recipe("c")],
      { "old-1": WEBP, unreferenced: PNG },
      store,
    );
    const listed = await store.list();
    expect(listed).toHaveLength(1);
    const [{ id }] = listed;
    expect(id).not.toBe("old-1");
    expect(result.recipes.map((entry) => entry.imageId)).toEqual([
      id,
      id,
      undefined,
    ]);
    expect(result.recipes[2]).not.toHaveProperty("imageId");
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("imports recipes without the photo when it is invalid or missing, and counts it", async () => {
    const store = createMemoryImageStore();
    const result = await restoreBackupImages(
      [recipe("a", "bad"), recipe("b", "missing"), recipe("c", "ok")],
      { bad: "data:text/html;base64,YWJj", ok: WEBP },
      store,
    );
    expect(result.recipes.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(result.recipes[0]).not.toHaveProperty("imageId");
    expect(result.recipes[1]).not.toHaveProperty("imageId");
    expect(result.recipes[2].imageId).toEqual(expect.any(String));
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(2);
  });

  it("works with old backups that have no images", async () => {
    const store = createMemoryImageStore();
    const recipes = [recipe("a"), recipe("b")];
    const result = await restoreBackupImages(recipes, undefined, store);
    expect(result).toEqual({ recipes, imported: 0, skipped: 0 });
  });

  it("counts images the store cannot save (no space, unavailable)", async () => {
    const store = createMemoryImageStore();
    store.save = vi.fn(async () => {
      throw new ImageStoreError("quota");
    });
    const result = await restoreBackupImages(
      [recipe("a", "x")],
      { x: WEBP },
      store,
    );
    expect(result.recipes[0]).not.toHaveProperty("imageId");
    expect(result.skipped).toBe(1);

    const unavailable = createMemoryImageStore({ available: false });
    const none = await restoreBackupImages(
      [recipe("a", "x")],
      { x: WEBP },
      unavailable,
    );
    expect(none.recipes[0]).not.toHaveProperty("imageId");
    expect(none.skipped).toBe(1);
  });
});
