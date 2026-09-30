import { describe, expect, it } from "vitest";
import manifest from "../public/manifest.json";

describe("the committed manifest, ADR-0003 decision 3", () => {
  it("carries the five keys the decision allows and no other, so no permission, host, icon, description or key", () => {
    expect(Object.keys(manifest).sort()).toEqual([
      "background",
      "content_security_policy",
      "manifest_version",
      "name",
      "version",
    ]);
  });

  it("is Manifest V3", () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it("takes its name from the primary lockup in BRAND.md section 0", () => {
    expect(manifest.name).toBe("Lumofy Actio");
  });

  it("has one entry point, a module service worker", () => {
    expect(manifest.background).toEqual({ service_worker: "background.js", type: "module" });
  });

  it("closes extension pages to every source but the extension itself", () => {
    expect(manifest.content_security_policy).toEqual({
      extension_pages: "default-src 'none'; script-src 'self'; object-src 'none'",
    });
  });
});
