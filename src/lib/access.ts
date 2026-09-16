import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/supabase";
import { currentAccount } from "@/lib/auth";
import { verifySecret } from "@/lib/hash";
import type { Board } from "@/lib/cards";

export type FieldMode = "required" | "optional" | "hidden";

export type BoardRow = Board & {
  access_hash: string | null;
  owner_hash: string;
  owner_user_id: string | null;
  org_id: string | null;
  author_name_mode: FieldMode;
  body_mode: FieldMode;
  media_url_mode: FieldMode;
};

export type OrgRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_user_id: string | null;
  access_hash: string | null;
};

export type Grant = "none" | "read" | "write" | "owner";

const RANK: Record<Grant, number> = { none: 0, read: 1, write: 2, owner: 3 };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

/**
 * Grants live in a signed cookie rather than a session table, so there is
 * nothing to expire or clean up. The signature covers the scope, its id and
 * the grant level, so a cookie cannot be moved between boards, moved from an
 * organization to a board, or upgraded.
 */
function sign(scope: string, id: string, grant: Grant): string {
  const mac = createHmac("sha256", secret())
    .update(`${scope}.${id}.${grant}`)
    .digest("hex");
  return `${grant}.${mac}`;
}

function readCookieGrant(
  scope: string,
  id: string,
  raw: string | undefined,
): Grant {
  if (!raw) return "none";
  const [grant, mac] = raw.split(".");
  if (!grant || !mac) return "none";
  if (!(grant in RANK)) return "none";

  const expected = createHmac("sha256", secret())
    .update(`${scope}.${id}.${grant}`)
    .digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "none";

  return grant as Grant;
}

const cookieName = (scope: string, id: string) =>
  `pb_${scope}_${id.slice(0, 8)}`;

export async function loadBoard(slug: string): Promise<BoardRow | null> {
  const { data } = await db
    .from("boards")
    .select(
      "id, slug, name, subtitle, visibility, access_hash, owner_hash, owner_user_id, org_id, author_name_mode, body_mode, media_url_mode",
    )
    .eq("slug", slug)
    .maybeSingle<BoardRow>();
  return data ?? null;
}

const highest = (...grants: Grant[]): Grant =>
  grants.reduce((best, g) => (RANK[g] > RANK[best] ? g : best), "none");

/**
 * What the current visitor may do on this board.
 *
 * Four things can grant access and the strongest wins:
 *
 *   the board's own visibility, which is what anonymous visitors get;
 *   a password they have entered for this board;
 *   a password they have entered for the organization it belongs to;
 *   an account that administers either the board or that organization.
 *
 * Organizations only ever add access. A board in an organization is never
 * harder to reach than it would be alone.
 */
export async function grantFor(board: BoardRow): Promise<Grant> {
  const account = await currentAccount();
  if (account && (await administers(board, account.id))) return "owner";

  const jar = await cookies();

  const boardCookie = readCookieGrant(
    "b",
    board.id,
    jar.get(cookieName("b", board.id))?.value,
  );
  // An owner cookie on a board that now belongs to an account is stale: the
  // account is the only thing that confers ownership from here on.
  const fromBoard: Grant =
    boardCookie === "owner" && board.owner_user_id ? "write" : boardCookie;

  const fromOrg: Grant = board.org_id
    ? readCookieGrant(
        "o",
        board.org_id,
        jar.get(cookieName("o", board.org_id))?.value,
      )
    : "none";

  const base: Grant =
    board.visibility === "public"
      ? "write"
      : board.visibility === "protected"
        ? "read"
        : "none";

  return highest(base, fromBoard, fromOrg === "owner" ? "write" : fromOrg);
}

/**
 * Whether an account administers this board, directly or through the
 * organization it belongs to.
 *
 * The board's own owner can never be removed from its admin list, and an
 * organization's admins administer every board in it, which is the whole
 * point of grouping them.
 */
export async function administers(
  board: BoardRow,
  userId: string,
): Promise<boolean> {
  if (board.owner_user_id === userId) return true;

  const { data } = await db
    .from("board_admins")
    .select("user_id")
    .eq("board_id", board.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return true;

  return board.org_id ? administersOrg(board.org_id, userId) : false;
}

/** Whether an account administers an organization. */
export async function administersOrg(
  orgId: string,
  userId: string,
): Promise<boolean> {
  const { data: org } = await db
    .from("organizations")
    .select("owner_user_id")
    .eq("id", orgId)
    .maybeSingle<{ owner_user_id: string | null }>();
  if (org?.owner_user_id === userId) return true;

  const { data } = await db
    .from("org_admins")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function loadOrg(slug: string): Promise<OrgRow | null> {
  const { data } = await db
    .from("organizations")
    .select("id, slug, name, description, owner_user_id, access_hash")
    .eq("slug", slug)
    .maybeSingle<OrgRow>();
  return data ?? null;
}

/**
 * What the visitor may do across an organization: owner if they administer
 * it, write if they have entered its password, nothing otherwise.
 */
export async function grantForOrg(org: OrgRow): Promise<Grant> {
  const account = await currentAccount();
  if (account && (await administersOrg(org.id, account.id))) return "owner";

  const jar = await cookies();
  return readCookieGrant(
    "o",
    org.id,
    jar.get(cookieName("o", org.id))?.value,
  );
}

/** Check a password against an organization and remember it if it matches. */
export async function unlockOrg(
  org: OrgRow,
  password: string,
): Promise<Grant> {
  if (!(await verifySecret(password, org.access_hash))) return "none";

  const jar = await cookies();
  jar.set(cookieName("o", org.id), sign("o", org.id, "write"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return "write";
}

export async function lockOrg(org: OrgRow) {
  const jar = await cookies();
  jar.delete(cookieName("o", org.id));
}

export const canRead = (g: Grant) => RANK[g] >= RANK.read;
export const canWrite = (g: Grant) => RANK[g] >= RANK.write;
export const isOwner = (g: Grant) => g === "owner";

/**
 * Check a submitted password against the board and, on success, store the
 * grant it earns. The owner secret is tried first so an owner never gets
 * downgraded by also matching the access password.
 */
export async function unlockBoard(
  board: BoardRow,
  password: string,
): Promise<Grant> {
  let grant: Grant = "none";

  if (await verifySecret(password, board.owner_hash)) {
    grant = "owner";
  } else if (await verifySecret(password, board.access_hash)) {
    grant = "write";
  } else {
    return "none";
  }

  const jar = await cookies();
  jar.set(cookieName("b", board.id), sign("b", board.id, grant), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return grant;
}

export async function lockBoard(board: BoardRow) {
  const jar = await cookies();
  jar.delete(cookieName("b", board.id));
}

/**
 * Salted hash of the contributor's IP. Stored so rate limiting or a spam
 * cleanup can be added later without a schema migration. Never displayed.
 */
export async function ipHash(): Promise<string | null> {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) return null;

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  if (!ip) return null;

  return createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}
