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

async function sectionsOf(boardId: string): Promise<Row[]> {
  const { data } = await db
    .from("sections")
    .select("id, name, group_name, position")
    .eq("board_id", boardId)
    .order("position");
  return (data ?? []) as Row[];
}

type Row = {
  id: string;
  name: string;
  group_name: string | null;
  position: number;
};

/**
 * Put a section with its group and rewrite every position from scratch.
 *
 * Group headers are runs of neighbouring sections that share a name, so a
 * section is only "in" a group if it physically sits with the others. Moving
 * one into a group without repositioning it produces a second header with the
 * same name, which is what this exists to prevent.
 *
 * A section joining a group lands at the end of that group's run. One with no
 * group, or the first of a new group, goes to the end of the board.
 */
async function placeWithGroup(
  boardId: string,
  sectionId: string,
  group: string | null,
) {
  const order = await sectionsOf(boardId);
  const moving = order.find((s) => s.id === sectionId);
  if (!moving) return;

  const rest = order.filter((s) => s.id !== sectionId);
  const lastOfGroup = group
    ? rest.map((s) => s.group_name).lastIndexOf(group)
    : -1;

  const next: Row[] =
    lastOfGroup === -1
      ? [...rest, moving]
      : [
          ...rest.slice(0, lastOfGroup + 1),
          moving,
          ...rest.slice(lastOfGroup + 1),
        ];

  for (const [position, section] of next.entries()) {
    if (section.position !== position) {
      await db.from("sections").update({ position }).eq("id", section.id);
    }
  }
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

  const { data: created, error } = await db
    .from("sections")
    .insert({
      board_id: auth.board.id,
      name,
      group_name: group || null,
      position: (existing.at(-1)?.position ?? -1) + 1,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) {
    return { ok: false, error: "Could not add that section" };
  }

  // Slot it with its group rather than leaving it at the end of the board,
  // so adding "Side Special 2" lands with the other specials.
  if (group) await placeWithGroup(auth.board.id, created.id, group);

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

  const group = groupName.trim() || null;
  const before = (await sectionsOf(auth.board.id)).find(
    (s) => s.id === sectionId,
  );

  const { error } = await db
    .from("sections")
    .update({ name: trimmed, group_name: group })
    .eq("id", sectionId)
    .eq("board_id", auth.board.id);
  if (error) return { ok: false, error: "Could not rename that section" };

  // Changing group has to move the section too, or it becomes a second run
  // with the same heading rather than joining the existing one.
  if (before && before.group_name !== group) {
    await placeWithGroup(auth.board.id, sectionId, group);
  }

  revalidatePath(`/b/${slug}`, "layout");
  return { ok: true, message: group ? `Moved to ${group}.` : "Renamed." };
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
