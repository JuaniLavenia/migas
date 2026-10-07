import { create } from "zustand";

// One transient message at a time. Each toast gets a new id so showing the
// same text twice restarts its timer. Not persisted.
const useToastStore = create((set) => ({
  toast: null,
  showToast: (message) =>
    set((state) => ({ toast: { message, id: (state.toast?.id ?? 0) + 1 } })),
  clearToast: () => set({ toast: null }),
}));

export default useToastStore;
