import { COLLECTIONS, toRow } from "./rows";

// Keeps the cloud in line with the store. The store's actions stay plain
// state updates: this watches every change, works out per collection which
// records changed (by object identity), were removed or moved, and saves
// them through the repository after `delay` ms without further changes, so
// typing in a field becomes one write. A failed write is kept and retried
// after `retryDelay` ms. `onStatus` receives "saving", "saved" or "error".
//
// `store` is a zustand store holding the collections in rows.js.
export function createCloudSync({
  store,
  repository,
  businessId,
  onStatus = () => {},
  delay = 800,
  retryDelay = 5000,
}) {
  const pick = (state) =>
    Object.fromEntries(COLLECTIONS.map((collection) => [collection, state[collection]]));
  const emptyPending = () =>
    Object.fromEntries(
      COLLECTIONS.map((collection) => [
        collection,
        { save: new Set(), remove: new Set() },
      ]),
    );

  let baseline = pick(store.getState());
  let pending = emptyPending();
  let timer = null;
  let applying = false;
  let running = Promise.resolve();

  function track(collection, previous = [], next = []) {
    if (previous === next) return;
    const queue = pending[collection];
    const before = new Map(previous.map((record) => [record.id, record]));
    const nextIds = new Set(next.map((record) => record.id));
    // Positions are indexes. A removal leaves a gap but keeps the order, so
    // nothing else is rewritten; a move or an insertion renumbers every
    // record, which keeps two records from ever sharing a position.
    const kept = previous.filter((record) => nextIds.has(record.id));
    const inserted = next.some((record) => !before.has(record.id));
    const moved =
      inserted ||
      next.some((record, index) => kept[index]?.id !== record.id);
    next.forEach((record) => {
      if (moved || before.get(record.id) !== record) {
        queue.save.add(record.id);
        queue.remove.delete(record.id);
      }
    });
    previous.forEach((record) => {
      if (!nextIds.has(record.id)) {
        queue.remove.add(record.id);
        queue.save.delete(record.id);
      }
    });
  }

  function hasPending() {
    return COLLECTIONS.some(
      (collection) => pending[collection].save.size || pending[collection].remove.size,
    );
  }

  function schedule(wait) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, wait);
  }

  async function write(batch) {
    const state = store.getState();
    for (const collection of COLLECTIONS) {
      const { save, remove } = batch[collection];
      if (remove.size) {
        await repository.remove(businessId, collection, [...remove]);
      }
      if (save.size) {
        const rows = [];
        state[collection].forEach((record, index) => {
          if (save.has(record.id)) {
            rows.push(toRow(collection, record, businessId, index));
          }
        });
        await repository.save(businessId, collection, rows);
      }
    }
  }

  // Writes everything pending now. Flushes run one after the other.
  function flush() {
    clearTimeout(timer);
    timer = null;
    running = running.then(async () => {
      if (!hasPending()) return;
      const batch = pending;
      pending = emptyPending();
      onStatus("saving");
      try {
        await write(batch);
        onStatus(hasPending() ? "saving" : "saved");
      } catch {
        // Put the batch back under anything newer, then try again later.
        COLLECTIONS.forEach((collection) => {
          const queue = pending[collection];
          batch[collection].save.forEach((id) => {
            if (!queue.remove.has(id)) queue.save.add(id);
          });
          batch[collection].remove.forEach((id) => {
            if (!queue.save.has(id)) queue.remove.add(id);
          });
        });
        onStatus("error");
        schedule(retryDelay);
      }
    });
    return running;
  }

  const unsubscribe = store.subscribe((state) => {
    if (applying) return;
    const next = pick(state);
    COLLECTIONS.forEach((collection) =>
      track(collection, baseline[collection], next[collection]),
    );
    baseline = next;
    if (hasPending()) schedule(delay);
  });

  return {
    flush,
    hasPending,
    // Puts data read from the cloud in the store without saving it back.
    replaceData(data) {
      applying = true;
      try {
        store.setState(pick(data));
      } finally {
        applying = false;
      }
      baseline = pick(store.getState());
    },
    stop() {
      clearTimeout(timer);
      unsubscribe();
    },
  };
}
