import { COLLECTIONS, TABLES, fromRow } from "./rows";

// Port for the business data. The app only talks to this contract, so tests
// use the in-memory adapter (memoryRepository.js) instead of Supabase.
//
// A repository is an object with:
// - ensureBusiness(): Promise<string> — the signed-in user's business id,
//   created on their first sign-in.
// - load(businessId): Promise<{ recipeCategories, ingredients, recipes }> —
//   app records, each collection in its custom order.
// - loadBusinessName(businessId): Promise<string>
// - renameBusiness(businessId, name): Promise<void>
// - save(businessId, collection, rows): Promise<void> — upserts rows already
//   mapped with toRow (rows.js).
// - remove(businessId, collection, ids): Promise<void>
// - uploadLocalData(businessId, data): Promise<void> — the first upload of a
//   browser's data; all or nothing, and rejected unless the business is
//   empty (error code "business_not_empty").
//
// Failing operations reject with an Error.

export class RepositoryError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
  }
}

function check({ data, error }) {
  if (error) {
    const code = /business_not_empty/.test(error.message)
      ? "business_not_empty"
      : error.code;
    throw new RepositoryError(error.message, code);
  }
  return data;
}

export function createSupabaseRepository(client) {
  return {
    async ensureBusiness() {
      return check(await client.rpc("ensure_my_business"));
    },
    async load(businessId) {
      const entries = await Promise.all(
        COLLECTIONS.map(async (collection) => {
          const rows = check(
            await client
              .from(TABLES[collection])
              .select("*")
              .eq("business_id", businessId)
              .order("position", { ascending: true }),
          );
          return [collection, rows.map((row) => fromRow(collection, row))];
        }),
      );
      return Object.fromEntries(entries);
    },
    async loadBusinessName(businessId) {
      const row = check(
        await client.from("businesses").select("name").eq("id", businessId).single(),
      );
      return row.name;
    },
    async renameBusiness(businessId, name) {
      check(await client.from("businesses").update({ name }).eq("id", businessId));
    },
    async save(businessId, collection, rows) {
      if (!rows.length) return;
      check(await client.from(TABLES[collection]).upsert(rows));
    },
    async remove(businessId, collection, ids) {
      if (!ids.length) return;
      check(
        await client
          .from(TABLES[collection])
          .delete()
          .eq("business_id", businessId)
          .in("id", ids),
      );
    },
    async uploadLocalData(businessId, data) {
      check(
        await client.rpc("upload_local_data", {
          p_business: businessId,
          p_data: data,
        }),
      );
    },
  };
}
