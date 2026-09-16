"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { hashSecret } from "@/lib/hash";
import { grantFor, isOwner, loadBoard, lockBoard } from "@/lib/access";

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
