import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service role client. Bypasses RLS completely, so it must never be imported
 * from a client component. The `server-only` import above turns that mistake
 * into a build error rather than a leak.
 *
 * Every table has RLS on with no policies, so this is the only way to read or
 * write anything. That is deliberate: it forces board password checks to
 * happen in server code where they cannot be skipped.
 *
 * Built on first use rather than at import time. `next build` evaluates these
 * modules while collecting page data, and a deploy that has not had its
 * environment set yet would otherwise fail the build with "supabaseUrl is
 * required" instead of saying what is actually missing.
 */
let client: SupabaseClient | null = null;

function connect(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Supabase is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  client = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const db = new Proxy({} as SupabaseClient, {
  get: (_target, property) => Reflect.get(connect(), property),
});
