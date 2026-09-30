// The one place web/ reads the Supabase project's URL and client key (ADR-0002 decision 8).
//
// Both are the low-privilege values the database constrains with RLS and revokes: the project
// URL and its publishable key. No other key is ever read in web/ (boundary B8).
//
// Nothing here runs at import. The environment is validated when supabaseEnv() is called, so
// `next build` passes with no .env.local, and a missing variable fails at the point of use with
// the variable's name. An error names variables, never their values.

export const SUPABASE_ENV_NAMES = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
} as const;

export type SupabaseEnvName = (typeof SUPABASE_ENV_NAMES)[keyof typeof SUPABASE_ENV_NAMES];

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

type RawSupabaseEnv = {
  url: string | undefined;
  publishableKey: string | undefined;
};

// A developer-facing configuration error. It is never rendered to a reader, and it is not the
// API error shape, which lands with the first data client.
export class SupabaseEnvError extends Error {
  readonly code = "supabase_env_missing";
  readonly missing: readonly SupabaseEnvName[];

  constructor(missing: readonly SupabaseEnvName[]) {
    super(`Missing Supabase environment variables: ${missing.join(", ")}. Set them in web/.env.local.`);
    this.name = "SupabaseEnvError";
    this.missing = missing;
  }
}

// Returns both values trimmed. Throws SupabaseEnvError when either is absent, empty or only
// whitespace, listing the absent names in the order URL, then key.
export function readSupabaseEnv(values: RawSupabaseEnv): SupabaseEnv {
  const url = values.url?.trim() ?? "";
  const publishableKey = values.publishableKey?.trim() ?? "";

  const missing: SupabaseEnvName[] = [];
  if (url === "") missing.push(SUPABASE_ENV_NAMES.url);
  if (publishableKey === "") missing.push(SUPABASE_ENV_NAMES.publishableKey);
  if (missing.length > 0) throw new SupabaseEnvError(missing);

  return { url, publishableKey };
}

// Each variable is written out as a static property access, because the framework inlines a
// NEXT_PUBLIC_ value into the browser bundle only when it is spelled literally. A computed
// process.env[name] reads undefined in the browser.
export function supabaseEnv(): SupabaseEnv {
  return readSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
