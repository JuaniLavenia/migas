import { afterEach, describe, expect, it } from "vitest";
import {
  ImageStoreError,
  getImageStore,
  setImageStore,
  toImageStoreError,
} from "./imageStore";
import { createMemoryImageStore } from "./memoryImageStore";

describe("imageStore port", () => {
  const original = getImageStore();
  afterEach(() => setImageStore(original));

  it("lets an adapter be swapped in (tests, a future backend)", () => {
    const memory = createMemoryImageStore();
    setImageStore(memory);
    expect(getImageStore()).toBe(memory);
  });

  it("classifies a quota error", () => {
    const error = toImageStoreError(
      new DOMException("full", "QuotaExceededError"),
    );
    expect(error).toBeInstanceOf(ImageStoreError);
    expect(error.code).toBe("quota");
  });

  it("classifies an aborted transaction caused by quota", () => {
    const error = toImageStoreError({
      name: "AbortError",
      target: { error: { name: "QuotaExceededError" } },
    });
    expect(error.code).toBe("quota");
  });

  it("keeps an existing ImageStoreError and wraps anything else", () => {
    const known = new ImageStoreError("unavailable");
    expect(toImageStoreError(known)).toBe(known);
    expect(toImageStoreError(new Error("boom")).code).toBe("unknown");
  });
});
