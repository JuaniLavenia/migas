import { describe, expect, it, vi } from "vitest";
import {
  MAX_SOURCE_BYTES,
  fitWithin,
  prepareImage,
} from "./prepareImage";

describe("fitWithin", () => {
  it("scales a landscape image down to the max on its long side", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1200, height: 900 });
  });

  it("scales a portrait image down to the max on its long side", () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 900, height: 1200 });
  });

  it("never upscales a smaller image", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1200, 1200)).toEqual({ width: 1200, height: 1200 });
  });

  it("accepts a custom max and rounds to whole pixels (at least 1)", () => {
    expect(fitWithin(1000, 333, 500)).toEqual({ width: 500, height: 167 });
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });

  it("rejects sizes that are not positive numbers", () => {
    expect(() => fitWithin(0, 100)).toThrow(RangeError);
    expect(() => fitWithin(100, Number.NaN)).toThrow(RangeError);
  });
});

// jsdom/node have no real canvas or image decoder: prepareImage takes both
// as dependencies and these fakes stand in for them. Real encoding size is
// verified manually in the browser.
function fakeDecode(width = 4000, height = 3000) {
  const close = vi.fn();
  const decode = vi.fn(async () => ({ image: "bitmap", width, height, close }));
  return { decode, close };
}

function fakeCanvasFactory(encodableTypes = ["image/webp", "image/jpeg"]) {
  const canvases = [];
  const createCanvas = () => {
    const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
    const canvas = {
      width: 0,
      height: 0,
      context,
      getContext: () => context,
      // Like browsers: an unsupported type silently falls back to PNG.
      toBlob: vi.fn((callback, type) => {
        const encoded = encodableTypes.includes(type) ? type : "image/png";
        callback(new Blob(["encoded"], { type: encoded }));
      }),
    };
    canvases.push(canvas);
    return canvas;
  };
  return { createCanvas, canvases };
}

function photo(type = "image/jpeg", size = 4 * 1024 * 1024) {
  return { type, size, name: "foto.jpg" };
}

describe("prepareImage", () => {
  it("draws the photo at the fitted size and encodes it as WebP 0.8", async () => {
    const { decode, close } = fakeDecode(4000, 3000);
    const { createCanvas, canvases } = fakeCanvasFactory();
    const blob = await prepareImage(photo(), { decode, createCanvas });
    expect(blob.type).toBe("image/webp");
    const [canvas] = canvases;
    expect(canvas).toMatchObject({ width: 1200, height: 900 });
    expect(canvas.context.drawImage).toHaveBeenCalledWith(
      "bitmap",
      0,
      0,
      1200,
      900,
    );
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/webp",
      0.8,
    );
    expect(close).toHaveBeenCalled();
  });

  it("falls back to JPEG when the browser cannot encode WebP", async () => {
    const { decode } = fakeDecode();
    const { createCanvas, canvases } = fakeCanvasFactory(["image/jpeg"]);
    const blob = await prepareImage(photo(), { decode, createCanvas });
    expect(blob.type).toBe("image/jpeg");
    expect(canvases[0].toBlob).toHaveBeenLastCalledWith(
      expect.any(Function),
      "image/jpeg",
      0.8,
    );
  });

  it("rejects files that are not images", async () => {
    const { decode } = fakeDecode();
    await expect(
      prepareImage(photo("application/pdf"), { decode }),
    ).rejects.toMatchObject({ code: "not-image" });
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects source files above the size cap", async () => {
    const { decode } = fakeDecode();
    await expect(
      prepareImage(photo("image/jpeg", MAX_SOURCE_BYTES + 1), { decode }),
    ).rejects.toMatchObject({ code: "too-large" });
    expect(decode).not.toHaveBeenCalled();
  });

  it("reports images the browser cannot decode", async () => {
    const decode = vi.fn(async () => {
      throw new Error("bad data");
    });
    await expect(prepareImage(photo(), { decode })).rejects.toMatchObject({
      code: "decode",
    });
  });

  it("reports when neither WebP nor JPEG can be encoded", async () => {
    const { decode, close } = fakeDecode();
    const { createCanvas } = fakeCanvasFactory([]);
    await expect(
      prepareImage(photo(), { decode, createCanvas }),
    ).rejects.toMatchObject({ code: "encode" });
    expect(close).toHaveBeenCalled();
  });
});
