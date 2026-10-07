import { useCallback, useEffect, useState } from "react";
import { getImageStore } from "../../lib/images/imageStore";

function storageManager() {
  return typeof navigator !== "undefined" ? navigator.storage : undefined;
}

async function readImages() {
  const store = getImageStore();
  if (!(await store.isAvailable())) return { available: false };
  try {
    const listed = await store.list();
    return {
      available: true,
      count: listed.length,
      size: listed.reduce((total, image) => total + (image.size || 0), 0),
    };
  } catch {
    return { available: false };
  }
}

// { usage, quota } or null when the browser does not report it.
async function readEstimate() {
  const storage = storageManager();
  if (typeof storage?.estimate !== "function") return null;
  try {
    const { usage, quota } = await storage.estimate();
    return Number.isFinite(quota) && quota > 0 ? { usage: usage || 0, quota } : null;
  } catch {
    return null;
  }
}

// true / false, or null when the browser cannot protect the storage.
async function readPersisted() {
  const storage = storageManager();
  if (typeof storage?.persisted !== "function") return null;
  try {
    return await storage.persisted();
  } catch {
    return null;
  }
}

// Storage facts for the settings panel, read on mount and on refresh().
// Each field is undefined while loading. persist() asks the browser to
// protect the data and resolves to whether it was granted.
function useStorageInfo() {
  const [info, setInfo] = useState({});

  const refresh = useCallback(async () => {
    const [images, estimate, persisted] = await Promise.all([
      readImages(),
      readEstimate(),
      readPersisted(),
    ]);
    setInfo({
      images,
      estimate,
      persisted,
      canPersist: typeof storageManager()?.persist === "function",
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(async () => {
    let granted = false;
    try {
      granted = await storageManager().persist();
    } catch {
      granted = false;
    }
    setInfo((current) => ({ ...current, persisted: granted }));
    return granted;
  }, []);

  return { ...info, refresh, persist };
}

export default useStorageInfo;
