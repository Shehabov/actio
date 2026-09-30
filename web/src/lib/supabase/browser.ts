// The Supabase client for code that runs in the browser (ADR-0002 decision 8).
//
// It holds the publishable key only, and acts as the reader's own session, so every permission is
// decided in the database (boundary B8). The values are inlined at build time, so a change to
// .env.local needs a rebuild or a dev server restart.
import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient(url, publishableKey);
}
