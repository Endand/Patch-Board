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
  author_name_mode: FieldMode;
  body_mode: FieldMode;
  media_url_mode: FieldMode;
};

export type Grant = "none" | "read" | "write" | "owner";

const RANK: Record<Grant, number> = { none: 0, read: 1, write: 2, owner: 3 };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

/**
 * Board grants live in a signed cookie rather than a session table, so there
 * is nothing to expire or clean up. The signature covers the board id and the
 * grant level, so a cookie cannot be moved between boards or upgraded.
 */
function sign(boardId: string, grant: Grant): string {
  const payload = `${boardId}.${grant}`;
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${grant}.${mac}`;
}

function readCookieGrant(boardId: string, raw: string | undefined): Grant {
  if (!raw) return "none";
  const [grant, mac] = raw.split(".");
  if (!grant || !mac) return "none";
  if (!(grant in RANK)) return "none";

  const expected = createHmac("sha256", secret())
    .update(`${boardId}.${grant}`)
    .digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "none";

  return grant as Grant;
}

const cookieName = (boardId: string) => `pb_b_${boardId.slice(0, 8)}`;

export async function loadBoard(slug: string): Promise<BoardRow | null> {
  const { data } = await db
    .from("boards")
    .select(
      "id, slug, name, subtitle, visibility, access_hash, owner_hash, owner_user_id, author_name_mode, body_mode, media_url_mode",
    )
    .eq("slug", slug)
    .maybeSingle<BoardRow>();
  return data ?? null;
}

/**
 * What the current visitor may do on this board.
 *
 * Ownership comes from the signed in account. Everything else is anonymous:
 * public boards grant write to everyone, protected boards are readable by
 * anyone but need the password to post, and private boards need it to see
 * anything. The password cookie can raise that, and on a board nobody has
 * claimed yet the owner secret still grants ownership so it can be claimed.
 */
export async function grantFor(board: BoardRow): Promise<Grant> {
  if (board.owner_user_id) {
    const account = await currentAccount();
    if (account && (await administers(board, account.id))) return "owner";
  }

  const jar = await cookies();
  const fromCookie = readCookieGrant(
    board.id,
    jar.get(cookieName(board.id))?.value,
  );

  // An owner cookie on a board that now belongs to an account is stale: the
  // account is the only thing that confers ownership from here on.
  const effective: Grant =
    fromCookie === "owner" && board.owner_user_id ? "write" : fromCookie;

  const base: Grant =
    board.visibility === "public"
      ? "write"
      : board.visibility === "protected"
        ? "read"
        : "none";

  return RANK[effective] > RANK[base] ? effective : base;
}

/**
 * The primary owner, or anyone they have added as an admin.
 *
 * The primary owner is the account that created or claimed the board. They
 * can never be removed from the admin list, so a board cannot end up with
 * nobody in charge.
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
  return Boolean(data);
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
  jar.set(cookieName(board.id), sign(board.id, grant), {
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
  jar.delete(cookieName(board.id));
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
