// Unit tests only (ADR-0002 decision 7). The include pattern keeps Vitest away from e2e/, whose
// specs belong to Playwright. The .mts name loads this file as ESM with no warning.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
