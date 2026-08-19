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
    // These tests share one real, unnamespaced Mongo + MinIO (see
    // docs/05-testing-strategy.md) — no per-file isolation. publish-run.test.ts
    // and publish-status.test.ts both call the real runPublish(), which reads
    // and writes every collection plus the global "latest successful publish"
    // record; running files in parallel let one file's publish land in the
    // middle of another file's before/after assertions (KAN-32). Files are
    // fast (~2s total), so running them sequentially costs little.
    fileParallelism: false,
  },
});
