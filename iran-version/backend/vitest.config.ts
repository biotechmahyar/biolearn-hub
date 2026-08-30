import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setup: ["./src/__tests__/setup.ts"],
    globalSetup: ["./src/__tests__/global-pg-setup.ts"],
    testTimeout: 15000,
    hookTimeout: 60000,
    pool: "forks",
    sequence: { concurrent: false },
  },
});
