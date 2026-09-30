// The Supabase client for server components, route handlers and server actions (ADR-0002
// decision 8).
//
// It uses the same publishable key as the browser client and the reader's session cookie, so it
// acts as anon or authenticated and never as anything elevated. Server code here is a renderer
// over the reader's session: it enforces no invariant and checks no permission of its own
// (ADR-0002 decision 10).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createServerSupabaseClient() {
  const { url, publishableKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component cannot write cookies; the session-refresh proxy refreshes them instead.
        }
      },
    },
  });
}
