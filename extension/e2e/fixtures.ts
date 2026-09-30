import { test as base, type BrowserContext, type Worker } from "@playwright/test";
import path from "node:path";

const unpackedBuild = path.resolve(__dirname, "..", "dist");

// ADR-0003 decision 4. An unpacked extension loads only into a persistent context, and only in
// Playwright's own chromium: branded Chrome ignores --load-extension, and the headless shell
// cannot run extensions.
export const test = base.extend<{ context: BrowserContext; serviceWorker: Worker }>({
  context: async ({ playwright }, use) => {
    const context = await playwright.chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: true,
      args: [`--disable-extensions-except=${unpackedBuild}`, `--load-extension=${unpackedBuild}`],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    await use(worker);
  },
});

export { expect } from "@playwright/test";
