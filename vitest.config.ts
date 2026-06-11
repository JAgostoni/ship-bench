import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  // Component tests opt into jsdom per-file via `// @vitest-environment jsdom`;
  // Vitest 4's oxc transform handles the automatic JSX runtime by default.
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
