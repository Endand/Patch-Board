"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { isCardType, CARD_STATUSES, type CardStatus } from "@/lib/cards";
import type { BoardRow, FieldMode, Grant } from "@/lib/access";
import {
  canWrite,
  grantFor,
  ipHash,
  isOwner,
  loadBoard,
  lockBoard,
  unlockBoard,
} from "@/lib/access";

export type ActionResult = { ok: true } | { ok: false; error: string };

type Authorized =
  | { ok: true; board: BoardRow; grant: Grant }
  | { ok: false; error: string };

/** Every action re-derives the grant server side. Never trust the form. */
async function authorize(
  slug: string,
  need: "write" | "owner",
): Promise<Authorized> {
  const board = await loadBoard(slug);
  if (!board) return { ok: false, error: "Board not found" };

  const grant = await grantFor(board);
  const allowed = need === "owner" ? isOwner(grant) : canWrite(grant);
  if (!allowed) {
    return {
      ok: false,
      error:
        need === "owner"
          ? "Owner access required"
          : "This board needs a password to post on",
    };
  }
  return { ok: true, board, grant };
}

export async function submitPassword(
  slug: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const board = await loadBoard(slug);
  if (!board) return { ok: false, error: "Board not found" };

  const password = String(formData.get("password") ?? "");
  if (!password) return { ok: false, error: "Enter a password" };

  const grant = await unlockBoard(board, password);
  if (grant === "none") return { ok: false, error: "That password is wrong" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true };
}

export async function signOutOfBoard(slug: string) {
  const board = await loadBoard(slug);
  if (board) await lockBoard(board);
  revalidatePath(`/b/${slug}`, "layout");
}

export async function createCard(
  slug: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await authorize(slug, "write");
  if (!auth.ok) return auth;

  const sectionId = String(formData.get("section_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const mediaUrl = String(formData.get("media_url") ?? "").trim();
  const authorName = String(formData.get("author_name") ?? "").trim();
  const authorKey = String(formData.get("author_key") ?? "").trim();

  if (!isCardType(type)) return { ok: false, error: "Pick a feedback type" };
  if (!title) return { ok: false, error: "Give it a title" };
  if (title.length > 200) return { ok: false, error: "Title is too long" };
  if (body.length > 5000) return { ok: false, error: "Body is too long" };

  if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) {
    return { ok: false, error: "Link must start with http:// or https://" };
  }

  // The board decides which optional parts of a card are required. Checked
  // here rather than only in the form, which can be bypassed.
  const rules: [FieldMode, string, string][] = [
    [auth.board.author_name_mode, authorName, "a name"],
    [auth.board.body_mode, body, "some detail"],
    [auth.board.media_url_mode, mediaUrl, "a link"],
  ];
  for (const [mode, value, label] of rules) {
    if (mode === "required" && !value) {
      return { ok: false, error: `This board asks for ${label}` };
    }
  }

  // A hidden field is never stored, even if something posts one anyway.
  const keep = (mode: FieldMode, value: string) =>
    mode === "hidden" ? "" : value;

  // The section has to belong to this board, or a forged id could post onto
  // a board the visitor has no grant for.
  const { data: section } = await db
    .from("sections")
    .select("id")
    .eq("id", sectionId)
    .eq("board_id", auth.board.id)
    .maybeSingle();
  if (!section) return { ok: false, error: "Unknown section" };

  const { error } = await db.from("cards").insert({
    board_id: auth.board.id,
    section_id: sectionId,
    type,
    title,
    body: keep(auth.board.body_mode, body) || null,
    media_url: keep(auth.board.media_url_mode, mediaUrl) || null,
    author_name:
      keep(auth.board.author_name_mode, authorName).slice(0, 40) || null,
    author_key: authorKey || null,
    ip_hash: await ipHash(),
  });
  if (error) return { ok: false, error: "Could not save that, try again" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true };
}

export async function deleteCard(
  slug: string,
  cardId: string,
  authorKey: string,
): Promise<ActionResult> {
  const board = await loadBoard(slug);
  if (!board) return { ok: false, error: "Board not found" };

  const grant = await grantFor(board);
  const { data: card } = await db
    .from("cards")
    .select("id, author_key")
    .eq("id", cardId)
    .eq("board_id", board.id)
    .maybeSingle<{ id: string; author_key: string | null }>();
  if (!card) return { ok: false, error: "Card not found" };

  // Owners may remove anything. Otherwise the browser has to present the same
  // author key the card was written with. That is forgeable, which is why it
  // only ever gates a delete the author could have done anyway.
  const mine = Boolean(authorKey) && card.author_key === authorKey;
  if (!isOwner(grant) && !mine) {
    return { ok: false, error: "That is not your card" };
  }

  await db.from("cards").delete().eq("id", cardId);
  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true };
}

export async function setCardStatus(
  slug: string,
  cardId: string,
  status: string,
): Promise<ActionResult> {
  const auth = await authorize(slug, "owner");
  if (!auth.ok) return auth;
  if (!CARD_STATUSES.includes(status as CardStatus)) {
    return { ok: false, error: "Unknown status" };
  }

  await db
    .from("cards")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("board_id", auth.board.id);

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true };
}

export async function toggleVote(
  slug: string,
  cardId: string,
  voterKey: string,
): Promise<ActionResult> {
  const auth = await authorize(slug, "write");
  if (!auth.ok) return auth;
  if (!voterKey) return { ok: false, error: "No voter key" };

  const { data: card } = await db
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("board_id", auth.board.id)
    .maybeSingle();
  if (!card) return { ok: false, error: "Card not found" };

  const { data: existing } = await db
    .from("votes")
    .select("card_id")
    .eq("card_id", cardId)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (existing) {
    await db
      .from("votes")
      .delete()
      .eq("card_id", cardId)
      .eq("voter_key", voterKey);
  } else {
    await db.from("votes").insert({ card_id: cardId, voter_key: voterKey });
  }

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true };
}
