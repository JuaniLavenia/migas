import { describe, expect, it } from "vitest";
import { normalizePhotoUrl } from "./photoUrl";

describe("normalizePhotoUrl", () => {
  it("accepts https links, trimmed", () => {
    expect(normalizePhotoUrl("  https://res.cloudinary.com/x/a.jpg ")).toBe(
      "https://res.cloudinary.com/x/a.jpg",
    );
  });

  it.each([
    "http://res.cloudinary.com/x/a.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "res.cloudinary.com/x/a.jpg",
    "",
    null,
  ])("rejects %s", (value) => {
    expect(normalizePhotoUrl(value)).toBeNull();
  });
});
