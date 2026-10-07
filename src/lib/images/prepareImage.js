// Turns a photo picked by the user into the blob that gets stored: scaled
// down to MAX_IMAGE_DIMENSION on its long side and re-encoded as WebP (JPEG
// when the browser cannot encode WebP). A 4000x3000 phone photo of several
// MB ends up around 100–300 KB.

export const MAX_IMAGE_DIMENSION = 1200;
// Larger files are rejected before decoding: decoding them can exhaust the
// memory of a phone and no recipe photo needs it.
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const IMAGE_QUALITY = 0.8;

// code: "not-image", "too-large", "decode" or "encode".
export class ImagePreparationError extends Error {
  constructor(code, options) {
    super(`image preparation: ${code}`, options);
    this.name = "ImagePreparationError";
    this.code = code;
  }
}

// Size that fits `width` x `height` inside a `max` x `max` box keeping the
// aspect ratio. Never upscales.
export function fitWithin(width, height, max = MAX_IMAGE_DIMENSION) {
  if (!(width > 0) || !(height > 0)) {
    throw new RangeError("image size must be positive");
  }
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// Browser decoder: { image, width, height, close } for drawImage. EXIF
// orientation is applied by default in current browsers.
async function decodeInBrowser(file) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function createBrowserCanvas() {
  return document.createElement("canvas");
}

function encode(canvas, type) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, IMAGE_QUALITY);
  });
}

// Rejects with an ImagePreparationError. `decode` and `createCanvas` are
// injectable because test environments have no image decoder or canvas.
export async function prepareImage(
  file,
  { decode = decodeInBrowser, createCanvas = createBrowserCanvas } = {},
) {
  if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
    throw new ImagePreparationError("not-image");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImagePreparationError("too-large");
  }

  let decoded;
  try {
    decoded = await decode(file);
  } catch (error) {
    throw new ImagePreparationError("decode", { cause: error });
  }

  try {
    const { width, height } = fitWithin(decoded.width, decoded.height);
    const canvas = createCanvas();
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    // Transparent areas would turn black in the JPEG fallback.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.image, 0, 0, width, height);

    // Browsers that cannot encode a type return PNG (or null) instead.
    for (const type of ["image/webp", "image/jpeg"]) {
      const blob = await encode(canvas, type);
      if (blob?.type === type) return blob;
    }
    throw new ImagePreparationError("encode");
  } catch (error) {
    if (error instanceof ImagePreparationError) throw error;
    throw new ImagePreparationError("decode", { cause: error });
  } finally {
    decoded.close?.();
  }
}
