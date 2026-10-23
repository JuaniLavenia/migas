import { create } from "zustand";

// Whether the last changes reached the cloud: "saved", "saving" or "error"
// (reported by cloudSync; the app retries on its own). Not persisted.
const useSaveStatusStore = create(() => ({ status: "saved" }));

export default useSaveStatusStore;
