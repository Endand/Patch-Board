"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { verifySecret } from "@/lib/hash";
import { currentAccount } from "@/lib/auth";
import { loadBoard } from "@/lib/access";

export type ClaimResult = { ok: true } | { ok: false; error: string };

/**
 * Take ownership of a board that predates accounts, by proving you hold its
 * owner secret.
 *
 * Only works while the board is unclaimed, so a leaked secret cannot take a
 * board away from an owner who already has it.
 */
export async function claimBoard(
  slug: string,
  _prev: ClaimResult | null,
  formData: FormData,
): Promise<ClaimResult> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "Sign in first" };

  const board = await loadBoard(slug);
  if (!board) return { ok: false, error: "Board not found" };

  if (board.owner_user_id) {
    return {
      ok: false,
      error:
        board.owner_user_id === account.id
          ? "You already own this board"
          : "This board already has an owner",
    };
  }

  const secret = String(formData.get("password") ?? "");
  if (!secret) return { ok: false, error: "Enter the owner secret" };

  if (!(await verifySecret(secret, board.owner_hash))) {
    return { ok: false, error: "That secret is wrong" };
  }

  const { error } = await db
    .from("boards")
    .update({ owner_user_id: account.id })
    .eq("id", board.id)
    // Refuse if someone claimed it between the check above and now.
    .is("owner_user_id", null);
  if (error) return { ok: false, error: "Could not claim that board" };

  revalidatePath(`/b/${slug}`, "layout");
  redirect(`/b/${slug}/settings`);
}
