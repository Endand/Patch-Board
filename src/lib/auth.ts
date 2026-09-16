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

async function adminApi(query: string): Promise<{ id: string; email?: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const res = await fetch(`${url}/auth/v1/admin/users?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const body = (await res.json()) as { users?: { id: string; email?: string }[] };
  return body.users ?? [];
}

/**
 * Find one account by its exact address.
 *
 * Deliberately a lookup rather than a list. Returning every registered
 * address to anyone who administers a board would let any board owner
 * enumerate every user, so admins are invited by typing an address they
 * already know.
 */
export async function accountByEmail(email: string): Promise<Account | null> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;

  const users = await adminApi(
    `filter=${encodeURIComponent(wanted)}&per_page=20`,
  );
  const match = users.find((u) => u.email?.toLowerCase() === wanted);
  return match?.email ? { id: match.id, email: match.email } : null;
}

/**
 * The addresses behind a set of ids, so the admin list can show who is on it.
 * Only ever called with ids that are already admins of the board being
 * viewed, so it reveals nothing the viewer should not see.
 */
export async function accountsById(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const wanted = new Set(ids);
  const users = await adminApi("per_page=200");
  return new Map(
    users
      .filter((u) => wanted.has(u.id) && u.email)
      .map((u) => [u.id, u.email!]),
  );
}
