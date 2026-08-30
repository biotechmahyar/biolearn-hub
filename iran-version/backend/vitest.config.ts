import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setup: ["./src/__tests__/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 10000,
    pool: "forks",
    // Run tests sequentially to avoid port conflicts
    sequence: { concurrent: false },
  },
});
