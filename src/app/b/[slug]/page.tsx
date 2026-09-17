import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { canRead, canWrite, grantFor, isOwner, loadBoard } from "@/lib/access";
import { currentAccount } from "@/lib/auth";
import type { Card, Section } from "@/lib/cards";
import { PasswordGate } from "@/components/PasswordGate";
import { BoardGrid } from "@/components/BoardGrid";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const board = await loadBoard(slug);
  if (!board) notFound();

  const grant = await grantFor(board);

  if (!canRead(grant)) {
    return (
      <main className="mx-auto w-full max-w-lg px-6 py-20">
        <PasswordGate slug={slug} boardName={board.name} reason="read" />
      </main>
    );
  }

  const [{ data: sectionRows }, { data: cardRows }] = await Promise.all([
    db
      .from("sections")
      .select("id, group_name, name, position, is_hidden")
      .eq("board_id", board.id)
      .eq("is_hidden", false)
      .order("position"),
    db
      .from("cards")
      .select(
        "id, section_id, type, status, title, body, media_url, author_name, author_key, vote_count, created_at, updated_at",
      )
      .eq("board_id", board.id)
      .order("vote_count", { ascending: false }),
  ]);

  const sections = (sectionRows ?? []) as Section[];
  const cards = (cardRows ?? []) as Card[];
  const owner = isOwner(grant);
  const unclaimed = !board.owner_user_id;
  const account = await currentAccount();

  const { data: org } = board.org_id
    ? await db
        .from("organizations")
        .select("slug, name")
        .eq("id", board.org_id)
        .maybeSingle<{ slug: string; name: string }>()
    : { data: null };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-8">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; All boards
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            {org && (
              <Link
                href={`/o/${org.slug}`}
                className="mb-1 block text-xs font-medium uppercase tracking-widest text-muted transition hover:text-foreground"
              >
                {org.name}
              </Link>
            )}
            <h1 className="text-3xl font-semibold tracking-tight">
              {board.name}
            </h1>
            {board.subtitle && (
              <p className="mt-1 text-muted">{board.subtitle}</p>
            )}
          </div>
          <div className="flex items-baseline gap-3 text-sm text-muted">
            <span>
              {cards.length} {cards.length === 1 ? "note" : "notes"} across{" "}
              {sections.length} sections
            </span>
            {owner ? (
              <Link
                href={`/b/${slug}/settings`}
                className="rounded border border-edge px-2 py-0.5 text-xs text-foreground"
              >
                Board settings
              </Link>
            ) : unclaimed ? (
              <Link
                href={`/b/${slug}/claim`}
                className="text-xs hover:text-foreground"
              >
                {account ? "Claim this board" : "Own this board?"}
              </Link>
            ) : null}
          </div>
        </div>

        {!canWrite(grant) && (
          <div className="mt-5">
            <PasswordGate slug={slug} boardName={board.name} reason="write" />
          </div>
        )}
      </header>

      <BoardGrid slug={slug} sections={sections} cards={cards} />
    </main>
  );
}
