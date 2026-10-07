import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One config for the app and Vitest: plugin-react 6 no longer breaks tests
// with the Fast Refresh preamble, so tests use the same JSX transform as the
// app.
export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["src/test/setup.js"],
    // Pure helpers (.test.js) keep the fast node environment; UI tests
    // (.test.jsx) run in jsdom. Each project inherits the settings above.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.js"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          include: ["src/**/*.test.jsx"],
          environment: "jsdom",
        },
      },
    ],
  },
});
