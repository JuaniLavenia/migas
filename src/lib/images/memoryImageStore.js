import { v4 as uuidv4 } from "uuid";

// In-memory adapter of the image store port (see imageStore.js). Used by UI
// tests, where jsdom has no IndexedDB; nothing survives a reload.
export function createMemoryImageStore({ available = true } = {}) {
  const images = new Map();
  return {
    async isAvailable() {
      return available;
    },
    async save(blob) {
      const id = uuidv4();
      images.set(id, blob);
      return id;
    },
    async get(id) {
      return images.get(id) ?? null;
    },
    async remove(id) {
      images.delete(id);
    },
    async list() {
      return [...images].map(([id, blob]) => ({ id, size: blob.size }));
    },
  };
}
