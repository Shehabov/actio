// The end-to-end suite (ADR-0002 decision 7). The project matrix is the testing doctrine's, in
// actio-test-protocol "Automation with Playwright": generated from three lists, never typed out
// one project at a time. The doctrine's gate command overrides the reporter, trace and output
// settings below on its own command line.
import { defineConfig, devices, type Project } from "@playwright/test";

const baseURL = "http://localhost:3000";

// CLAUDE.md hard rule 9: every surface is verified at these widths.
const widths = [320, 360, 768, 1024, 1440];
const themes = ["light", "dark"] as const;
const locales = ["en", "ar"];

// The phone widths take the low-cost Android descriptor, so the context is mobile and touch.
const phoneWidths = new Set([320, 360]);

function descriptorFor(width: number) {
  return phoneWidths.has(width) ? devices["Moto G4"] : devices["Desktop Chrome"];
}

const projects: Project[] = widths.flatMap((width) =>
  themes.flatMap((theme) =>
    locales.map((locale) => {
      const descriptor = descriptorFor(width);
      return {
        name: `${width}-${theme}-${locale}`,
        use: {
          ...descriptor,
          viewport: { width, height: descriptor.viewport.height },
          colorScheme: theme,
          locale,
        },
      };
    }),
  ),
);

export default defineConfig({
  testDir: "./e2e",
  // A stray .only fails the run, and a failure is never retried into a pass.
  forbidOnly: true,
  retries: 0,
  // The list reporter only: an HTML report that serves itself never returns in a non-interactive shell.
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    // The production server, built from source, so the suite works from a fresh clone.
    command: "npm run build && npm run start",
    url: baseURL,
    // If something already holds the port, the run fails rather than testing another server.
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects,
});
