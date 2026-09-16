"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { hashSecret } from "@/lib/hash";
import { currentAccount, findAccount } from "@/lib/auth";
import {
  administersOrg,
  loadOrg,
  lockOrg,
  unlockOrg,
  type OrgRow,
} from "@/lib/access";

export type OrgResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

// Reserved because /o/new is a real route and would shadow the board list.
const RESERVED = new Set(["new", "settings"]);

async function requireAdmin(
  slug: string,
): Promise<{ ok: true; org: OrgRow } | { ok: false; error: string }> {
  const org = await loadOrg(slug);
  if (!org) return { ok: false, error: "Organization not found" };

  const account = await currentAccount();
  if (!account || !(await administersOrg(org.id, account.id))) {
    return { ok: false, error: "Organization admin access required" };
  }
  return { ok: true, org };
}

export async function createOrg(
  _prev: OrgResult | null,
  formData: FormData,
): Promise<OrgResult> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "Sign in to create an organization" };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name) return { ok: false, error: "Give the organization a name" };

  const slug = slugify(name);
  if (!slug || RESERVED.has(slug)) {
    return { ok: false, error: "Pick a different name" };
  }

  const { data: taken } = await db
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (taken) return { ok: false, error: `The name "${slug}" is taken` };

  const { error } = await db.from("organizations").insert({
    slug,
    name,
    description: description || null,
    owner_user_id: account.id,
    access_hash: password ? await hashSecret(password) : null,
  });
  if (error) return { ok: false, error: "Could not create that organization" };

  revalidatePath("/", "layout");
  redirect(`/o/${slug}/settings`);
}

export async function updateOrg(
  slug: string,
  _prev: OrgResult | null,
  formData: FormData,
): Promise<OrgResult> {
  const auth = await requireAdmin(slug);
  if (!auth.ok) return auth;

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { ok: false, error: "Give the organization a name" };

  const { error } = await db
    .from("organizations")
    .update({ name, description: description || null })
    .eq("id", auth.org.id);
  if (error) return { ok: false, error: "Could not save that" };

  revalidatePath(`/o/${slug}`, "layout");
  return { ok: true, message: "Details updated." };
}

/**
 * Set or clear the shared password.
 *
 * Clearing it does not close the boards inside: each one still answers to its
 * own visibility and password. It only removes the shortcut.
 */
export async function updateOrgPassword(
  slug: string,
  _prev: OrgResult | null,
  formData: FormData,
): Promise<OrgResult> {
  const auth = await requireAdmin(slug);
  if (!auth.ok) return auth;

  const password = String(formData.get("password") ?? "");
  const clear = formData.get("clear_password") === "on";

  if (!password && !clear) {
    return { ok: false, error: "Enter a password, or tick remove" };
  }

  const { error } = await db
    .from("organizations")
    .update({ access_hash: password ? await hashSecret(password) : null })
    .eq("id", auth.org.id);
  if (error) return { ok: false, error: "Could not save that" };

  revalidatePath(`/o/${slug}`, "layout");
  return {
    ok: true,
    message: password
      ? "Password set. It opens every board in this organization."
      : "Password removed. Boards now answer only to their own rules.",
  };
}

export async function addOrgAdmin(
  slug: string,
  _prev: OrgResult | null,
  formData: FormData,
): Promise<OrgResult> {
  const auth = await requireAdmin(slug);
  if (!auth.ok) return auth;

  const me = await currentAccount();
  if (!me) return { ok: false, error: "Sign in first" };

  const query = String(formData.get("who") ?? "").trim();
  if (!query) return { ok: false, error: "Enter a GitHub username" };

  const invitee = await findAccount(query);
  if (!invitee) {
    return {
      ok: false,
      error: "Nobody by that name has signed in to Patch Board yet.",
    };
  }
  if (invitee.id === auth.org.owner_user_id) {
    return { ok: false, error: "That account already owns this organization" };
  }

  const { error } = await db
    .from("org_admins")
    .upsert(
      { org_id: auth.org.id, user_id: invitee.id, added_by: me.id },
      { onConflict: "org_id,user_id" },
    );
  if (error) return { ok: false, error: "Could not add that admin" };

  revalidatePath(`/o/${slug}`, "layout");
  return {
    ok: true,
    message: `${invitee.label} can now administer every board in this organization.`,
  };
}

export async function removeOrgAdmin(
  slug: string,
  userId: string,
): Promise<OrgResult> {
  const auth = await requireAdmin(slug);
  if (!auth.ok) return auth;

  const { error } = await db
    .from("org_admins")
    .delete()
    .eq("org_id", auth.org.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Could not remove that admin" };

  revalidatePath(`/o/${slug}`, "layout");
  return { ok: true, message: "Admin removed." };
}

/** Move a board in or out. Requires admin on the organization either way. */
export async function setBoardOrg(
  slug: string,
  boardId: string,
  join: boolean,
): Promise<OrgResult> {
  const auth = await requireAdmin(slug);
  if (!auth.ok) return auth;

  const { error } = await db
    .from("boards")
    .update({ org_id: join ? auth.org.id : null })
    .eq("id", boardId)
    // Leaving is only allowed for boards already in this organization, so an
    // admin here cannot detach a board that belongs to someone else.
    .eq(join ? "id" : "org_id", join ? boardId : auth.org.id);
  if (error) return { ok: false, error: "Could not move that board" };

  revalidatePath("/", "layout");
  return { ok: true, message: join ? "Board added." : "Board removed." };
}

export async function submitOrgPassword(
  slug: string,
  _prev: OrgResult | null,
  formData: FormData,
): Promise<OrgResult> {
  const org = await loadOrg(slug);
  if (!org) return { ok: false, error: "Organization not found" };

  const password = String(formData.get("password") ?? "");
  if (!password) return { ok: false, error: "Enter the password" };

  const grant = await unlockOrg(org, password);
  if (grant === "none") return { ok: false, error: "That password is wrong" };

  revalidatePath(`/o/${slug}`, "layout");
  return { ok: true };
}

export async function signOutOfOrg(slug: string) {
  const org = await loadOrg(slug);
  if (org) await lockOrg(org);
  revalidatePath(`/o/${slug}`, "layout");
}

export async function deleteOrg(
  slug: string,
  _prev: OrgResult | null,
  formData: FormData,
): Promise<OrgResult> {
  const auth = await requireAdmin(slug);
  if (!auth.ok) return auth;

  const me = await currentAccount();
  if (!me || auth.org.owner_user_id !== me.id) {
    return { ok: false, error: "Only the owner can delete an organization" };
  }
  if (String(formData.get("confirm") ?? "").trim() !== auth.org.name) {
    return { ok: false, error: `Type "${auth.org.name}" to confirm` };
  }

  // Boards survive: org_id is set null rather than cascading, so they simply
  // go back to standing alone.
  const { error } = await db
    .from("organizations")
    .delete()
    .eq("id", auth.org.id);
  if (error) return { ok: false, error: "Could not delete that organization" };

  revalidatePath("/", "layout");
  redirect("/");
}
