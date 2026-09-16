"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { hashSecret } from "@/lib/hash";
import { grantFor, isOwner, loadBoard, lockBoard } from "@/lib/access";
import { accountByEmail, currentAccount } from "@/lib/auth";

export type SettingsResult =
  | { ok: true; message: string; ownerSecret?: string }
  | { ok: false; error: string };

const VISIBILITIES = ["public", "protected", "private"] as const;
type Visibility = (typeof VISIBILITIES)[number];

async function requireOwner(slug: string) {
  const board = await loadBoard(slug);
  if (!board) return { ok: false as const, error: "Board not found" };

  const grant = await grantFor(board);
  if (!isOwner(grant)) {
    return { ok: false as const, error: "Owner access required" };
  }
  return { ok: true as const, board };
}

/**
 * Change who can see and post on the board, and optionally set a new access
 * password at the same time.
 *
 * A board that is not public must end up with a password. If it already has
 * one, leaving the field blank keeps it.
 */
export async function updateAccess(
  slug: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const visibility = String(formData.get("visibility") ?? "") as Visibility;
  if (!VISIBILITIES.includes(visibility)) {
    return { ok: false, error: "Unknown visibility" };
  }

  const password = String(formData.get("password") ?? "");
  const clear = formData.get("clear_password") === "on";

  if (visibility !== "public" && !password && !auth.board.access_hash) {
    return { ok: false, error: "This visibility needs a password" };
  }
  if (visibility !== "public" && clear && !password) {
    return { ok: false, error: "This visibility needs a password" };
  }

  const update: Record<string, unknown> = { visibility };
  if (password) update.access_hash = await hashSecret(password);
  else if (clear) update.access_hash = null;

  const { error } = await db.from("boards").update(update).eq("id", auth.board.id);
  if (error) return { ok: false, error: "Could not save that" };

  revalidatePath(`/b/${slug}`, "layout");
  return {
    ok: true,
    message: password
      ? "Visibility and password updated. Everyone will need the new password."
      : "Visibility updated.",
  };
}

export async function updateDetails(
  slug: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const name = String(formData.get("name") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  if (!name) return { ok: false, error: "The board needs a name" };

  const { error } = await db
    .from("boards")
    .update({ name, subtitle: subtitle || null })
    .eq("id", auth.board.id);
  if (error) return { ok: false, error: "Could not save that" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: "Board details updated." };
}

/**
 * Issue a new owner secret. The old one stops working immediately, which is
 * the way to recover a board whose secret leaked.
 */
export async function rotateOwnerSecret(
  slug: string,
): Promise<SettingsResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const ownerSecret = crypto.randomUUID().slice(0, 8);
  const { error } = await db
    .from("boards")
    .update({ owner_hash: await hashSecret(ownerSecret) })
    .eq("id", auth.board.id);
  if (error) return { ok: false, error: "Could not rotate the secret" };

  revalidatePath(`/b/${slug}`, "layout");
  return {
    ok: true,
    message: "New owner secret. The old one no longer works.",
    ownerSecret,
  };
}

export async function signOut(slug: string): Promise<SettingsResult> {
  const board = await loadBoard(slug);
  if (board) await lockBoard(board);
  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: "Signed out of this board." };
}

const FIELD_MODES = ["required", "optional", "hidden"] as const;
type FieldMode = (typeof FIELD_MODES)[number];

function readMode(formData: FormData, key: string): FieldMode | null {
  const value = String(formData.get(key) ?? "");
  return FIELD_MODES.includes(value as FieldMode) ? (value as FieldMode) : null;
}

/**
 * Decide which parts of a card this board asks for. Applies to everyone
 * posting, and is enforced again when the card is submitted.
 */
export async function updateFields(
  slug: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const author = readMode(formData, "author_name_mode");
  const body = readMode(formData, "body_mode");
  const media = readMode(formData, "media_url_mode");
  if (!author || !body || !media) {
    return { ok: false, error: "Unknown option" };
  }

  const { error } = await db
    .from("boards")
    .update({
      author_name_mode: author,
      body_mode: body,
      media_url_mode: media,
    })
    .eq("id", auth.board.id);
  if (error) return { ok: false, error: "Could not save that" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: "Card fields updated." };
}

export async function addAdmin(
  slug: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const me = await currentAccount();
  if (!me) return { ok: false, error: "Sign in first" };

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Enter an email address" };

  const invitee = await accountByEmail(email);
  // Says the same thing whether the address is unknown or simply has no
  // account, so this cannot be used to probe who has signed up.
  if (!invitee) {
    return {
      ok: false,
      error: "No account with that address. They need to sign up first.",
    };
  }

  const userId = invitee.id;
  if (userId === auth.board.owner_user_id) {
    return { ok: false, error: "That account already owns this board" };
  }

  const { error } = await db
    .from("board_admins")
    .upsert(
      { board_id: auth.board.id, user_id: userId, added_by: me.id },
      { onConflict: "board_id,user_id" },
    );
  if (error) return { ok: false, error: "Could not add that admin" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: `${invitee.email} can now administer this board.` };
}

export async function removeAdmin(
  slug: string,
  userId: string,
): Promise<SettingsResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  // The primary owner is not in this table, so there is no way to remove
  // them and leave the board unattended.
  const { error } = await db
    .from("board_admins")
    .delete()
    .eq("board_id", auth.board.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Could not remove that admin" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: "Admin removed." };
}

/**
 * Delete a board and everything on it.
 *
 * Restricted to the primary owner rather than any admin: an admin can be
 * added by another admin, and this is the one action with nothing to undo it.
 * The name has to be typed back, so it cannot happen on a stray click.
 *
 * Sections, cards, votes and the admin list all cascade from the board row.
 */
export async function deleteBoard(
  slug: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const me = await currentAccount();
  if (!me || auth.board.owner_user_id !== me.id) {
    return {
      ok: false,
      error: "Only the board owner can delete it",
    };
  }

  const typed = String(formData.get("confirm") ?? "").trim();
  if (typed !== auth.board.name) {
    return { ok: false, error: `Type "${auth.board.name}" to confirm` };
  }

  const { error } = await db.from("boards").delete().eq("id", auth.board.id);
  if (error) return { ok: false, error: "Could not delete that board" };

  revalidatePath("/", "layout");
  redirect("/");
}
