import { defineConfig } from "vitest/config";

// Separate from vite.config.js: @vitejs/plugin-react 3 injects the Fast
// Refresh preamble check, which breaks under Vitest. Tests only need the
// automatic JSX runtime, which esbuild provides directly.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    // Pure helpers keep the fast node environment; UI tests (.test.jsx) run
    // in jsdom.
    environmentMatchGlobs: [["src/**/*.test.jsx", "jsdom"]],
    setupFiles: ["src/test/setup.js"],
  },
});
