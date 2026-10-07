// code: "quota" (no space left), "unavailable" (storage cannot be used) or
// "unknown".
export class ImageStoreError extends Error {
  constructor(code, options) {
    super(`image store: ${code}`, options);
    this.name = "ImageStoreError";
    this.code = code;
  }
}

function isQuotaError(error) {
  if (!error) return false;
  if (error.name === "QuotaExceededError") return true;
  // IndexedDB reports a full disk as an aborted transaction whose own error
  // is the QuotaExceededError.
  return (
    error.name === "AbortError" &&
    error.target?.error?.name === "QuotaExceededError"
  );
}

export function toImageStoreError(error) {
  if (error instanceof ImageStoreError) return error;
  if (isQuotaError(error)) return new ImageStoreError("quota", { cause: error });
  return new ImageStoreError("unknown", { cause: error });
}
