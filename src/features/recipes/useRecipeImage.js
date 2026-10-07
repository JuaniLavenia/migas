import { useEffect, useState } from "react";
import { getImageStore } from "../../lib/images/imageStore";

const NO_IMAGE = { status: "none", url: null };

// Loads the image of a recipe and exposes it as an object URL, revoked when
// the image changes or the component unmounts. status: "none" (no imageId),
// "loading", "ready", "missing" (the id points to nothing) or "error".
function useRecipeImage(imageId) {
  const [state, setState] = useState({ imageId: null, ...NO_IMAGE });

  useEffect(() => {
    if (!imageId) return undefined;
    let cancelled = false;
    let url = null;
    setState({ imageId, status: "loading", url: null });
    getImageStore()
      .get(imageId)
      .then(
        (blob) => {
          if (cancelled) return;
          if (!blob) {
            setState({ imageId, status: "missing", url: null });
            return;
          }
          url = URL.createObjectURL(blob);
          setState({ imageId, status: "ready", url });
        },
        () => {
          if (!cancelled) setState({ imageId, status: "error", url: null });
        },
      );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageId]);

  // Never hand out the URL of a previous image while the new one loads.
  if (!imageId) return NO_IMAGE;
  if (state.imageId !== imageId) return { status: "loading", url: null };
  return { status: state.status, url: state.url };
}

export default useRecipeImage;
