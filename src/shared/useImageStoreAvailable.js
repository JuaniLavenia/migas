import { useEffect, useState } from "react";
import { getImageStore } from "../lib/images/imageStore";

// Whether images can be stored in this browser: null while checking, then
// true or false (no IndexedDB, private mode, blocked storage).
function useImageStoreAvailable() {
  const [available, setAvailable] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getImageStore()
      .isAvailable()
      .then(
        (result) => !cancelled && setAvailable(result),
        () => !cancelled && setAvailable(false),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}

export default useImageStoreAvailable;
