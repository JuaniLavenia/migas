import { createStore, del, entries, get, set } from "idb-keyval";
import { v4 as uuidv4 } from "uuid";
import { ImageStoreError, toImageStoreError } from "./imageStoreErrors";

const DB_NAME = "miga-images";
const STORE_NAME = "images";

// IndexedDB adapter of the image store port (see imageStore.js). Each record
// is { blob, size, type } so listing sizes does not depend on reading blobs.
// The database is opened lazily: creating the adapter never touches storage.
export function createIdbImageStore({ createId = uuidv4 } = {}) {
  let database = null;

  async function db() {
    if (!database) {
      if (typeof globalThis.indexedDB === "undefined") {
        throw new ImageStoreError("unavailable");
      }
      try {
        database = createStore(DB_NAME, STORE_NAME);
      } catch (error) {
        throw new ImageStoreError("unavailable", { cause: error });
      }
    }
    return database;
  }

  async function run(operation) {
    try {
      return await operation(await db());
    } catch (error) {
      throw toImageStoreError(error);
    }
  }

  return {
    async isAvailable() {
      try {
        // A read forces the database to open (private modes fail here).
        await get("__probe__", await db());
        return true;
      } catch {
        // Retry opening next time: availability can change (e.g. a blocked
        // upgrade that later succeeds).
        database = null;
        return false;
      }
    },
    save(blob) {
      return run(async (store) => {
        const id = createId();
        await set(id, { blob, size: blob.size, type: blob.type }, store);
        return id;
      });
    },
    get(id) {
      return run(async (store) => {
        const record = await get(id, store);
        return record?.blob ?? null;
      });
    },
    remove(id) {
      return run((store) => del(id, store));
    },
    list() {
      return run(async (store) =>
        (await entries(store)).map(([id, record]) => ({
          id: String(id),
          size: record?.size ?? 0,
        })),
      );
    },
  };
}
