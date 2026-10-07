import { useCallback, useSyncExternalStore } from "react";

// Whether `query` currently matches, kept in sync with viewport changes.
// False where matchMedia is unavailable (e.g. jsdom).
function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default useMediaQuery;
