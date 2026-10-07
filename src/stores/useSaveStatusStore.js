import { create } from "zustand";

// Result of the last write of the recipe store to the browser storage:
// "saved" or "error" (quota exceeded, storage blocked). Not persisted.
const useSaveStatusStore = create(() => ({ status: "saved" }));

export function reportSaveResult(ok) {
  const status = ok ? "saved" : "error";
  if (useSaveStatusStore.getState().status !== status) {
    useSaveStatusStore.setState({ status });
  }
}

export default useSaveStatusStore;
