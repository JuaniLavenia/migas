import { COLLECTIONS, fromRow, toRow } from "./rows";
import { RepositoryError } from "./repository";

// In-memory repository for tests. `failNext(n)` makes the next n writes
// reject, as a dropped connection would. `writes` records every save/remove.
export function createMemoryRepository({ businessId = "business-1", data } = {}) {
  const tables = Object.fromEntries(
    COLLECTIONS.map((collection) => [collection, new Map()]),
  );
  const writes = [];
  let failures = 0;

  function seed(source = {}) {
    COLLECTIONS.forEach((collection) => {
      tables[collection].clear();
      (source[collection] ?? []).forEach((record, index) => {
        tables[collection].set(
          record.id,
          toRow(collection, record, businessId, index),
        );
      });
    });
  }
  seed(data);

  function maybeFail() {
    if (failures > 0) {
      failures -= 1;
      throw new RepositoryError("network error", "network");
    }
  }

  return {
    writes,
    failNext(count = 1) {
      failures = count;
    },
    // What the database holds now, in the app's shape and order.
    snapshot() {
      return Object.fromEntries(
        COLLECTIONS.map((collection) => [
          collection,
          [...tables[collection].values()]
            .sort((a, b) => a.position - b.position)
            .map((row) => fromRow(collection, row)),
        ]),
      );
    },
    seed,
    async ensureBusiness() {
      return businessId;
    },
    async load() {
      return this.snapshot();
    },
    async save(id, collection, rows) {
      maybeFail();
      writes.push({ type: "save", collection, ids: rows.map((row) => row.id) });
      rows.forEach((row) => tables[collection].set(row.id, row));
    },
    async remove(id, collection, ids) {
      maybeFail();
      writes.push({ type: "remove", collection, ids });
      ids.forEach((recordId) => tables[collection].delete(recordId));
    },
    async uploadLocalData(id, source) {
      maybeFail();
      const empty = COLLECTIONS.every((collection) => !tables[collection].size);
      if (!empty) {
        throw new RepositoryError("business_not_empty", "business_not_empty");
      }
      seed(source);
    },
  };
}
