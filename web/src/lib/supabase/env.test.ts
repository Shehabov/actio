// The environment reader's contract, ADR-0002 decision 8. Fixture values are placeholders that
// match no real key format and name no project.
import { afterEach, describe, expect, it, vi } from "vitest";
import { readSupabaseEnv, SupabaseEnvError, supabaseEnv } from "./env";

const url = "https://example.supabase.co";
const publishableKey = "test-publishable-key";

function errorFrom(read: () => unknown): SupabaseEnvError {
  try {
    read();
  } catch (error) {
    if (error instanceof SupabaseEnvError) return error;
    throw error;
  }
  throw new Error("expected SupabaseEnvError, and nothing was thrown");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readSupabaseEnv", () => {
  it("throws supabase_env_missing naming both variables, URL first, when both are absent", () => {
    const error = errorFrom(() => readSupabaseEnv({ url: undefined, publishableKey: undefined }));
    expect(error.code).toBe("supabase_env_missing");
    expect(error.missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  });

  it("treats a blank key as absent and names the key", () => {
    const error = errorFrom(() => readSupabaseEnv({ url, publishableKey: "   " }));
    expect(error.missing).toEqual(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
    expect(error.message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("treats an empty URL as absent and names the URL", () => {
    const error = errorFrom(() => readSupabaseEnv({ url: "", publishableKey }));
    expect(error.missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
    expect(error.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("returns both values unchanged when both are present", () => {
    expect(readSupabaseEnv({ url, publishableKey })).toEqual({ url, publishableKey });
  });

  it("never puts a value into the error message", () => {
    const error = errorFrom(() => readSupabaseEnv({ url, publishableKey: "" }));
    expect(error.message).not.toContain(url);
  });
});

describe("supabaseEnv", () => {
  it("reads both values from the environment", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
    expect(supabaseEnv()).toEqual({ url, publishableKey });
  });

  it("fails when called, not when imported, if the environment is empty", () => {
    // The import at the top of this file has already run without throwing.
    expect(typeof supabaseEnv).toBe("function");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => supabaseEnv()).toThrow(SupabaseEnvError);
  });
});
