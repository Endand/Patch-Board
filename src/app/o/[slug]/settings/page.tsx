import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { grantForOrg, isOwner, loadOrg } from "@/lib/access";
import { accountsById, currentAccount } from "@/lib/auth";
import type { Board } from "@/lib/cards";
import { OrgSettings } from "./OrgSettings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Organization settings" };

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await loadOrg(slug);
  if (!org) notFound();
  if (!isOwner(await grantForOrg(org))) redirect(`/o/${slug}`);

  const me = await currentAccount();

  const [{ data: adminRows }, { data: inRows }, { data: mineRows }] =
    await Promise.all([
      db.from("org_admins").select("user_id").eq("org_id", org.id),
      db
        .from("boards")
        .select("id, slug, name, subtitle, visibility")
        .eq("org_id", org.id)
        .order("created_at"),
      // Only boards this account owns outright can be pulled in, so joining
      // an organization is always the board owner's decision.
      db
        .from("boards")
        .select("id, slug, name, subtitle, visibility, org_id")
        .eq("owner_user_id", me?.id ?? "")
        .is("org_id", null)
        .order("created_at"),
    ]);

  const adminIds = (adminRows ?? []).map((r) => r.user_id as string);
  const people = await accountsById(
    org.owner_user_id ? [org.owner_user_id, ...adminIds] : adminIds,
  );
  const label = (id: string) => people.get(id)?.label ?? "Unknown account";

  const admins = [
    ...(org.owner_user_id
      ? [{ id: org.owner_user_id, label: label(org.owner_user_id), primary: true }]
      : []),
    ...adminIds.map((id) => ({ id, label: label(id), primary: false })),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href={`/o/${slug}`}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; {org.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Organization settings
      </h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Everything here applies to all {(inRows ?? []).length} boards inside.
      </p>

      <OrgSettings
        slug={slug}
        name={org.name}
        description={org.description}
        hasPassword={Boolean(org.access_hash)}
        admins={admins}
        currentUserId={me?.id ?? null}
        boardsIn={(inRows ?? []) as Board[]}
        boardsAvailable={(mineRows ?? []) as Board[]}
      />
    </main>
  );
}
