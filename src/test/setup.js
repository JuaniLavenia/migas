import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library cannot register its own
// cleanup: unmount rendered trees after every UI test here instead.
if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
