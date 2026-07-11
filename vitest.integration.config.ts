import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    setupFiles: ["./tests/integration/setup.ts"],
    hookTimeout: 15_000,
    testTimeout: 15_000,
  },
});
