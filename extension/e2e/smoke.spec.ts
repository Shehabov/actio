import http from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "./fixtures";

test("the unpacked build loads with no permission, no surface and no egress, in one project and not the width, theme and locale matrix, because it has no surface to lay out (ADR-0003 decision 4)", async ({ context, serviceWorker }) => {
  // 1. The build loads, and its one entry point is the background service worker.
  expect(serviceWorker.url()).toMatch(/^chrome-extension:\/\/[a-p]{32}\/background\.js$/);

  // 2. The manifest as Chrome parsed it carries exactly the keys ADR-0003 decision 3 allows.
  const manifest = await serviceWorker.evaluate(() => chrome.runtime.getManifest());
  expect(Object.keys(manifest).sort()).toEqual([
    "background",
    "content_security_policy",
    "manifest_version",
    "name",
    "version",
  ]);
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.name).toBe("Lumofy Actio");

  // 3. Chrome granted the extension no permission and no host.
  const granted = await serviceWorker.evaluate(() => chrome.permissions.getAll());
  expect(granted).toEqual({ permissions: [], origins: [] });

  // 4. No surface: the extension opened no page of its own.
  expect(context.pages().map((page) => page.url())).toEqual(["about:blank"]);

  // 5. No egress: the content security policy refuses a request from the worker before it is
  // sent, so a local server that counts requests receives none.
  let received = 0;
  const server = http.createServer((_request, response) => {
    received += 1;
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const outcome = await serviceWorker.evaluate(
    (url) => fetch(url, { mode: "no-cors" }).then(() => "sent", () => "refused"),
    `http://127.0.0.1:${port}/`,
  );
  await new Promise<void>((resolve) => server.close(() => resolve()));
  expect(outcome).toBe("refused");
  expect(received).toBe(0);
});
