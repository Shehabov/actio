import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Every run loads a build made from the source under test, never a stale dist/.
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"]],
  forbidOnly: true,
  retries: 0,
  use: { trace: "retain-on-failure" },
  // ADR-0003 decision 4: one project. The extension has no surface, so it has nothing to lay
  // out at a width, a theme or a direction.
  projects: [{ name: "chromium-extension" }],
});
