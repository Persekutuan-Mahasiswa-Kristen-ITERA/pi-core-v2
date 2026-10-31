import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Service-role client. BYPASSES RLS. Server-only (the `server-only` import makes a client-bundle
 * import a build error). Use it only for Auth admin operations (create user, set password, ban)
 * and the single post-password-change flag reset — never for ordinary CRUD.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY (server-only). See .env.example.");
  return createClient<Database>(publicEnv.supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** A throwaway anon client used to check a password without touching the caller's cookies. */
export function createStatelessAuthClient() {
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
