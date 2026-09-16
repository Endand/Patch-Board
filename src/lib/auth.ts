import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type Account = { id: string; email: string };

/**
 * Auth client, using the anon key and the visitor's own session cookies.
 *
 * This is separate from the service role client in supabase.ts on purpose:
 * this one acts as whoever is signed in and is only ever used for auth, while
 * that one bypasses RLS and does all the reading and writing.
 */
export async function authClient() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              jar.set(name, value, options);
            }
          } catch {
            // Cookies cannot be written while rendering a Server Component.
            // Sessions are refreshed in server actions and middleware, so a
            // failure here is expected and harmless.
          }
        },
      },
    },
  );
}

/** The signed in account, or null. Never throws. */
export async function currentAccount(): Promise<Account | null> {
  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  return { id: user.id, email: user.email };
}

/**
 * Every registered account, for the admin picker on board settings.
 *
 * Uses the service role, so it deliberately sidesteps the session. Note that
 * this exposes every user's email address to anyone who administers a board.
 * If Patch Board ever has users who are not known to each other, this should
 * become an invite by exact address instead of a list.
 */
export async function listAccounts(): Promise<Account[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const body = (await res.json()) as { users?: { id: string; email?: string }[] };
  return (body.users ?? [])
    .filter((u): u is { id: string; email: string } => Boolean(u.email))
    .map((u) => ({ id: u.id, email: u.email }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Look up the addresses behind a set of ids, for display. */
export async function accountsById(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const all = await listAccounts();
  const wanted = new Set(ids);
  return new Map(
    all.filter((a) => wanted.has(a.id)).map((a) => [a.id, a.email]),
  );
}
