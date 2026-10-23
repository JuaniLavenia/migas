// A recipe photo is a link to an image hosted elsewhere (Cloudinary). Only
// https links are accepted: the app is served over https, where http images
// are blocked, and anything else (text, javascript:, data:) is null.
export function normalizePhotoUrl(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}
