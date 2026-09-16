"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { hashSecret } from "@/lib/hash";
import { currentAccount } from "@/lib/auth";

export type CreateResult =
  | { ok: true; slug: string; ownerSecret: string }
  | { ok: false; error: string };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export async function createBoard(
  _prev: CreateResult | null,
  formData: FormData,
): Promise<CreateResult> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "Sign in to create a board" };

  const name = String(formData.get("name") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const templateSlug = String(formData.get("template") ?? "");
  const visibility = String(formData.get("visibility") ?? "public");
  const password = String(formData.get("password") ?? "");

  if (!name) return { ok: false, error: "Give the board a name" };

  const slug = slugify(name);
  if (!slug) return { ok: false, error: "That name has no usable characters" };

  if (visibility !== "public" && !password) {
    return { ok: false, error: "A password is required for this visibility" };
  }
  if (!["public", "protected", "private"].includes(visibility)) {
    return { ok: false, error: "Unknown visibility" };
  }

  const { data: existing } = await db
    .from("boards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { ok: false, error: `The slug "${slug}" is taken` };

  const { data: template } = await db
    .from("templates")
    .select("id")
    .eq("slug", templateSlug)
    .maybeSingle<{ id: string }>();
  if (!template) return { ok: false, error: "Unknown template" };

  const { data: templateSections } = await db
    .from("template_sections")
    .select("group_name, name, position")
    .eq("template_id", template.id)
    .order("position");

  // The board belongs to the account, so this is a recovery code rather than
  // the way in. Shown once and never stored in plain text.
  const ownerSecret = crypto.randomUUID().slice(0, 8);

  const { data: board, error } = await db
    .from("boards")
    .insert({
      slug,
      name,
      subtitle: subtitle || null,
      template_id: template.id,
      visibility,
      access_hash: password ? await hashSecret(password) : null,
      owner_hash: await hashSecret(ownerSecret),
      owner_user_id: account.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !board) {
    return { ok: false, error: "Could not create that board" };
  }

  if (templateSections?.length) {
    await db.from("sections").insert(
      templateSections.map((s) => ({
        board_id: board.id,
        group_name: s.group_name,
        name: s.name,
        position: s.position,
      })),
    );
  }

  revalidatePath("/");
  return { ok: true, slug, ownerSecret };
}
