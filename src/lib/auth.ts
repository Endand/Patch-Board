import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Sign in is GitHub only. There is no password to store, reset or leak, and
 * no email to deliver, which is the whole reason for choosing it.
 *
 * A GitHub account can keep its address private, so `email` may be null. The
 * handle is what people recognise each other by, so `label` prefers it.
 */
export type Account = {
  id: string;
  email: string | null;
  handle: string | null;
  label: string;
};

type RawUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function toAccount(user: RawUser): Account {
  const meta = user.user_metadata ?? {};
  const handle =
    typeof meta.user_name === "string"
      ? meta.user_name
      : typeof meta.preferred_username === "string"
        ? meta.preferred_username
        : null;

  const email = user.email ?? null;
  return {
    id: user.id,
    email,
    handle,
    label: handle ? `@${handle}` : (email ?? "Unknown account"),
  };
}

/**
 * Auth client, using the anon key and the visitor's own session cookies.
 *
 * Separate from the service role client in supabase.ts on purpose: this one
 * acts as whoever is signed in and is only used for auth, while that one
 * bypasses RLS and does all the reading and writing.
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
            // Sessions are refreshed in route handlers and server actions, so
            // a failure here is expected and harmless.
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

  return user ? toAccount(user as RawUser) : null;
}

async function adminApi(query: string): Promise<RawUser[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const res = await fetch(`${url}/auth/v1/admin/users?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const body = (await res.json()) as { users?: RawUser[] };
  return body.users ?? [];
}

/**
 * Find one account by GitHub handle or email address.
 *
 * Deliberately a lookup rather than a list. Handing back every registered
 * account would let anyone who runs a board enumerate every user, so admins
 * are invited by typing something the inviter already knows.
 */
export async function findAccount(query: string): Promise<Account | null> {
  const wanted = query.trim().replace(/^@/, "").toLowerCase();
  if (!wanted) return null;

  const users = await adminApi("per_page=200");
  return (
    users
      .map(toAccount)
      .find(
        (a) =>
          a.handle?.toLowerCase() === wanted || a.email?.toLowerCase() === wanted,
      ) ?? null
  );
}

/**
 * The accounts behind a set of ids, so the admin list can show who is on it.
 * Only ever called with ids that already administer the board being viewed.
 */
export async function accountsById(
  ids: string[],
): Promise<Map<string, Account>> {
  if (ids.length === 0) return new Map();

  const wanted = new Set(ids);
  const users = await adminApi("per_page=200");
  return new Map(
    users
      .filter((u) => wanted.has(u.id))
      .map((u) => [u.id, toAccount(u)] as const),
  );
}
