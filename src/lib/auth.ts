import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Sign in is through GitHub or Discord. Neither stores a password here, so
 * there is nothing to reset or leak, and no mail to deliver.
 *
 * Either provider can withhold an address, so `email` may be null. The handle
 * is what people recognise each other by, so `label` prefers it.
 */
export const PROVIDERS = ["github", "discord"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  github: "GitHub",
  discord: "Discord",
};

export function isProvider(value: unknown): value is Provider {
  return PROVIDERS.includes(value as Provider);
}

export type Account = {
  id: string;
  email: string | null;
  handle: string | null;
  label: string;
  /** Every provider linked to this account, so one person is one account. */
  providers: Provider[];
};

type RawUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: { provider?: string | null }[] | null;
};

/** Providers spell the username differently, so try each in turn. */
function handleFrom(meta: Record<string, unknown>): string | null {
  for (const key of ["user_name", "preferred_username", "name", "full_name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function toAccount(user: RawUser): Account {
  const handle = handleFrom(user.user_metadata ?? {});
  const email = user.email ?? null;

  return {
    id: user.id,
    email,
    handle,
    label: handle ? `@${handle}` : (email ?? "Unknown account"),
    providers: (user.identities ?? [])
      .map((i) => i.provider)
      .filter(isProvider),
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
