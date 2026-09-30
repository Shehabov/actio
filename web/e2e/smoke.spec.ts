// The one smoke (ADR-0002 decision 7). It tests no surface: it proves that the production server
// boots and serves the root at every width, rendering nothing and requesting nothing off its own
// origin.
import { expect, test } from "@playwright/test";

test.skip(
  ({ colorScheme, locale }) => colorScheme !== "light" || locale !== "en",
  "ADR-0002 decision 7: the app sets no theme and no direction yet, so a dark or Arabic project would exercise nothing",
);

test("the app boots and serves / at the project width with no text, no dir and no request off its origin, in the light English projects only, because no theme or direction exists yet (ADR-0002 decision 7)", async ({
  page,
  baseURL,
  viewport,
}) => {
  if (!baseURL) throw new Error("use.baseURL is not set in playwright.config.ts");
  const appOrigin = new URL(baseURL).origin;

  const offOriginRequests: string[] = [];
  page.on("request", (request) => {
    const requested = new URL(request.url());
    const isWeb = requested.protocol === "http:" || requested.protocol === "https:";
    if (isWeb && requested.origin !== appOrigin) offOriginRequests.push(request.url());
  });

  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  expect(await page.evaluate(() => window.innerWidth)).toBe(viewport?.width);

  // The doctrine's direction assertions, set to what the scaffold renders. The locale routing run
  // replaces the first with ltr for en and rtl for ar.
  expect(await page.locator("html").getAttribute("dir")).toBeNull();
  expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe("ltr");

  expect(await page.locator("body").innerText()).toBe("");

  expect(offOriginRequests).toEqual([]);
  expect(errors).toEqual([]);
});
