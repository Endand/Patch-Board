import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service role client. Bypasses RLS completely, so it must never be imported
 * from a client component. The `server-only` import above turns that mistake
 * into a build error rather than a leak.
 *
 * Every table has RLS on with no policies, so this is the only way to read or
 * write anything. That is deliberate: it forces board password checks to
 * happen in server code where they cannot be skipped.
 */
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
