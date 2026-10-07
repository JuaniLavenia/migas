// Recipe photos in backups. The backup JSON carries them as
// `images: { [imageId]: "data:image/...;base64,..." }`; recipes keep pointing
// to them by `imageId`. Imports store each photo under a NEW id and remap the
// recipes, so an import can never collide with (or overwrite) a photo that
// is already stored.

// Raster images only: SVG can carry scripts and the app never produces it.
const DATA_URL = /^data:(image\/(?!svg)[a-z0-9.+-]+);base64,([a-z0-9+/]+={0,2})$/i;

export function isImageDataUrl(value) {
  if (typeof value !== "string") return false;
  const match = DATA_URL.exec(value);
  return Boolean(match) && match[2].length % 4 === 0;
}

// Throws when `dataUrl` is not a valid image data URL.
export function dataUrlToBlob(dataUrl) {
  if (!isImageDataUrl(dataUrl)) throw new Error("invalid image data URL");
  const [, type, payload] = DATA_URL.exec(dataUrl);
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: type.toLowerCase() });
}

function readBytes(blob) {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  // Environments whose Blob lacks arrayBuffer (jsdom).
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await readBytes(blob));
  let binary = "";
  // Chunked: String.fromCharCode with too many arguments overflows the stack.
  const CHUNK = 0x8000;
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return `data:${blob.type || "image/webp"};base64,${btoa(binary)}`;
}

function referencedIds(recipes) {
  return [...new Set(recipes.map((recipe) => recipe?.imageId).filter(Boolean))];
}

// `{ [imageId]: dataURL }` of the images the recipes reference. Missing or
// unreadable images are left out (the recipe keeps its imageId; on import it
// just has no photo).
export async function collectBackupImages(recipes, store) {
  const images = {};
  if (!(await store.isAvailable())) return images;
  for (const id of referencedIds(recipes)) {
    try {
      const blob = await store.get(id);
      if (blob) images[id] = await blobToDataUrl(blob);
    } catch {
      // Exported without this photo.
    }
  }
  return images;
}

function withoutImage(recipe) {
  const { imageId: _dropped, ...rest } = recipe;
  return rest;
}

// Saves the photos of the imported recipes and returns
// { recipes, imported, skipped }: recipes point to the new ids, and those
// whose photo is invalid, missing or could not be saved come without
// `imageId` (they are still imported). `skipped` counts those photos.
export async function restoreBackupImages(recipes, images, store) {
  const ids = referencedIds(recipes);
  if (!ids.length) return { recipes, imported: 0, skipped: 0 };
  const source =
    typeof images === "object" && images !== null && !Array.isArray(images)
      ? images
      : {};
  const available = await store.isAvailable();
  const newIds = new Map();
  let skipped = 0;
  for (const id of ids) {
    try {
      if (!available) throw new Error("image store unavailable");
      const blob = dataUrlToBlob(source[id]);
      newIds.set(id, await store.save(blob));
    } catch {
      skipped += 1;
    }
  }
  return {
    recipes: recipes.map((recipe) => {
      if (!recipe.imageId) return recipe;
      const newId = newIds.get(recipe.imageId);
      return newId ? { ...recipe, imageId: newId } : withoutImage(recipe);
    }),
    imported: newIds.size,
    skipped,
  };
}
