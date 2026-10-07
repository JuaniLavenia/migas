import { createIdbImageStore } from "./idbImageStore";

export { ImageStoreError, toImageStoreError } from "./imageStoreErrors";

// Port for recipe images. Recipes only keep an `imageId`; the image bytes
// live behind this contract, so the browser adapter (IndexedDB) can be
// replaced by an in-memory one in tests or a backend one later without
// touching the UI.
//
// An image store is an object with:
// - isAvailable(): Promise<boolean> — false when images cannot be stored at
//   all (no IndexedDB, private mode, blocked storage). Never throws.
// - save(blob): Promise<string> — stores the blob under a new id.
// - get(id): Promise<Blob | null> — null when the id is unknown.
// - remove(id): Promise<void> — removing an unknown id is a no-op.
// - list(): Promise<Array<{ id: string, size: number }>> — every image.
//
// Failing operations reject with an ImageStoreError (imageStoreErrors.js).

let current = createIdbImageStore();

// The adapter used by the app. Read it at call time (not at import time) so
// a swapped adapter is always honored.
export function getImageStore() {
  return current;
}

export function setImageStore(store) {
  current = store;
}
