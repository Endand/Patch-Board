import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { canWrite, grantForOrg, isOwner, loadOrg } from "@/lib/access";
import type { Board } from "@/lib/cards";
import { OrgPasswordGate } from "./OrgPasswordGate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const org = await loadOrg((await params).slug);
  return { title: org?.name ?? "Organization" };
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await loadOrg(slug);
  if (!org) notFound();

  const grant = await grantForOrg(org);
  const admin = isOwner(grant);
  // Entering the organization password is what earns a look at everything
  // inside it. Without it, a visitor sees only the boards they could have
  // found anyway, so a private board's name does not leak from this page.
  const seesEverything = admin || canWrite(grant);

  const { data } = await db
    .from("boards")
    .select("id, slug, name, subtitle, visibility")
    .eq("org_id", org.id)
    .order("created_at");

  const all = (data ?? []) as Board[];
  const boards = seesEverything
    ? all
    : all.filter((b) => b.visibility !== "private");
  const hidden = all.length - boards.length;

  const ids = boards.map((b) => b.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: cards } = await db
      .from("cards")
      .select("board_id")
      .in("board_id", ids);
    for (const card of cards ?? []) {
      const id = card.board_id as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8 border-b border-edge pb-6">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; All boards
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted">
              Organization
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {org.name}
            </h1>
            {org.description && (
              <p className="mt-1 text-muted">{org.description}</p>
            )}
          </div>
          <div className="flex items-baseline gap-3 text-sm text-muted">
            <span>
              {boards.length} {boards.length === 1 ? "board" : "boards"}
            </span>
            {admin && (
              <Link
                href={`/o/${slug}/settings`}
                className="rounded border border-edge px-2 py-0.5 text-xs text-foreground"
              >
                Manage
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* The password is a shortcut into every board at once. Someone who has
          not used it can still open any board they have access to directly. */}
      {!admin && org.access_hash && grant === "none" && (
        <div className="mb-8">
          <OrgPasswordGate slug={slug} name={org.name} />
        </div>
      )}

      {boards.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-medium">
            {hidden > 0 ? "Nothing public in here" : "No boards in here yet"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {hidden > 0
              ? "This organization's boards are private. Enter the password above to see them."
              : admin
                ? "Add boards you own from the manage screen."
                : "Nothing has been added to this organization."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            const count = counts.get(board.id) ?? 0;
            return (
              <li key={board.id}>
                <Link
                  href={`/b/${board.slug}`}
                  className="panel lift flex h-full flex-col p-5"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium">{board.name}</span>
                    {board.visibility !== "public" && (
                      <span className="rounded-full border border-edge px-1.5 py-0.5 text-[11px] text-muted">
                        {board.visibility === "private" ? "Private" : "Locked"}
                      </span>
                    )}
                  </span>
                  {board.subtitle && (
                    <span className="mt-0.5 text-sm text-muted">
                      {board.subtitle}
                    </span>
                  )}
                  <span className="mt-4 text-xs text-muted">
                    {count === 0
                      ? "No feedback yet"
                      : `${count} ${count === 1 ? "note" : "notes"}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
