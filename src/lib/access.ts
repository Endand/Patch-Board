import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/supabase";
import { verifySecret } from "@/lib/hash";
import type { Board } from "@/lib/cards";

export type BoardRow = Board & {
  access_hash: string | null;
  owner_hash: string;
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
    .select("id, slug, name, subtitle, visibility, access_hash, owner_hash")
    .eq("slug", slug)
    .maybeSingle<BoardRow>();
  return data ?? null;
}

/**
 * What the current visitor may do on this board.
 *
 * Public boards grant write to everyone. Protected boards are readable by
 * anyone but need the password to post. Private boards need it to see
 * anything. An owner cookie always outranks the rest.
 */
export async function grantFor(board: BoardRow): Promise<Grant> {
  const jar = await cookies();
  const fromCookie = readCookieGrant(
    board.id,
    jar.get(cookieName(board.id))?.value,
  );

  const base: Grant =
    board.visibility === "public"
      ? "write"
      : board.visibility === "protected"
        ? "read"
        : "none";

  return RANK[fromCookie] > RANK[base] ? fromCookie : base;
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
