"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { grantFor, isOwner, loadBoard } from "@/lib/access";

export type SectionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireOwner(slug: string) {
  const board = await loadBoard(slug);
  if (!board) return { ok: false as const, error: "Board not found" };
  if (!isOwner(await grantFor(board))) {
    return { ok: false as const, error: "Owner access required" };
  }
  return { ok: true as const, board };
}

async function sectionsOf(boardId: string) {
  const { data } = await db
    .from("sections")
    .select("id, name, group_name, position")
    .eq("board_id", boardId)
    .order("position");
  return (data ?? []) as {
    id: string;
    name: string;
    group_name: string | null;
    position: number;
  }[];
}

export async function addSection(
  slug: string,
  _prev: SectionResult | null,
  formData: FormData,
): Promise<SectionResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const name = String(formData.get("name") ?? "").trim();
  const group = String(formData.get("group_name") ?? "").trim();
  if (!name) return { ok: false, error: "Name the section" };
  if (name.length > 60) return { ok: false, error: "That name is too long" };

  const existing = await sectionsOf(auth.board.id);

  // Slot a new section at the end of its group rather than the end of the
  // board, so adding "Side Special 2" lands with the other specials.
  const last = group
    ? existing.filter((s) => s.group_name === group).at(-1)
    : undefined;
  const position = last ? last.position + 1 : (existing.at(-1)?.position ?? -1) + 1;

  if (last) {
    // Push everything after the group down to make room.
    const after = existing.filter((s) => s.position >= position);
    for (const section of after) {
      await db
        .from("sections")
        .update({ position: section.position + 1 })
        .eq("id", section.id);
    }
  }

  const { error } = await db.from("sections").insert({
    board_id: auth.board.id,
    name,
    group_name: group || null,
    position,
  });
  if (error) return { ok: false, error: "Could not add that section" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: `Added ${name}.` };
}

export async function renameSection(
  slug: string,
  sectionId: string,
  name: string,
  groupName: string,
): Promise<SectionResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name the section" };
  if (trimmed.length > 60) return { ok: false, error: "That name is too long" };

  const { error } = await db
    .from("sections")
    .update({ name: trimmed, group_name: groupName.trim() || null })
    .eq("id", sectionId)
    .eq("board_id", auth.board.id);
  if (error) return { ok: false, error: "Could not rename that section" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: "Renamed." };
}

export async function setSectionHidden(
  slug: string,
  sectionId: string,
  hidden: boolean,
): Promise<SectionResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const { error } = await db
    .from("sections")
    .update({ is_hidden: hidden })
    .eq("id", sectionId)
    .eq("board_id", auth.board.id);
  if (error) return { ok: false, error: "Could not update that section" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: hidden ? "Hidden." : "Shown again." };
}

/**
 * Move a section one place up or down.
 *
 * Positions are rewritten from scratch afterwards, so a board that was
 * seeded with gaps or duplicates straightens itself out on first move.
 */
export async function moveSection(
  slug: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<SectionResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  const order = await sectionsOf(auth.board.id);
  const index = order.findIndex((s) => s.id === sectionId);
  if (index === -1) return { ok: false, error: "Section not found" };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return { ok: true };

  [order[index], order[target]] = [order[target], order[index]];

  for (const [position, section] of order.entries()) {
    if (section.position !== position) {
      await db.from("sections").update({ position }).eq("id", section.id);
    }
  }

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true };
}

export async function deleteSection(
  slug: string,
  sectionId: string,
): Promise<SectionResult> {
  const auth = await requireOwner(slug);
  if (!auth.ok) return auth;

  // Cards cascade from the section, so this is not recoverable. The UI asks
  // for confirmation and shows the count first.
  const { error } = await db
    .from("sections")
    .delete()
    .eq("id", sectionId)
    .eq("board_id", auth.board.id);
  if (error) return { ok: false, error: "Could not delete that section" };

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: "Section deleted." };
}
