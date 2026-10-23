// A recipe photo is a link to an image hosted elsewhere (Cloudinary). Only
// http(s) links are accepted: anything else (text, javascript:, data:) is
// null.
export function normalizePhotoUrl(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? trimmed : null;
  } catch {
    return null;
  }
}
