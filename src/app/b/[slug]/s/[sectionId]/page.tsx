import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { canRead, canWrite, grantFor, isOwner, loadBoard } from "@/lib/access";
import type { Card, Section } from "@/lib/cards";
import { CardComposer } from "@/components/CardComposer";
import { SectionCards } from "@/components/SectionCards";
import { PasswordGate } from "@/components/PasswordGate";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string; sectionId: string }>;
}) {
  const { slug, sectionId } = await params;

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

  const { data: section } = await db
    .from("sections")
    .select("id, group_name, name, position, is_hidden")
    .eq("id", sectionId)
    .eq("board_id", board.id)
    .maybeSingle<Section>();
  if (!section) notFound();

  const { data: allSections } = await db
    .from("sections")
    .select("id, group_name, name, position, is_hidden")
    .eq("board_id", board.id)
    .order("position");

  const { data: cardRows } = await db
    .from("cards")
    .select(
      "id, section_id, type, status, title, body, media_url, author_name, author_key, vote_count, created_at, updated_at",
    )
    .eq("section_id", section.id)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  const cards = (cardRows ?? []) as Card[];
  const writable = canWrite(grant);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href={`/b/${slug}`}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; {board.name}
      </Link>

      <header className="mt-3 mb-7 border-b border-edge pb-6">
        {section.group_name && (
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted">
            {section.group_name}
          </p>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {section.name}
          </h1>
          <p className="text-sm text-muted">
            {cards.length} {cards.length === 1 ? "note" : "notes"}
          </p>
        </div>
      </header>

      <div className="mb-8">
        {writable ? (
          <CardComposer
            slug={slug}
            sectionId={section.id}
            sectionName={section.name}
            fields={{
              authorName: board.author_name_mode,
              body: board.body_mode,
              mediaUrl: board.media_url_mode,
            }}
          />
        ) : (
          <PasswordGate slug={slug} boardName={board.name} reason="write" />
        )}
      </div>

      {cards.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-medium">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted">
            {writable
              ? "Be the first to leave feedback on this one."
              : "Unlock the board above to post the first note."}
          </p>
        </div>
      ) : (
        <SectionCards
          slug={slug}
          cards={cards}
          sections={(allSections ?? []) as Section[]}
          canVote={writable}
          isOwner={isOwner(grant)}
        />
      )}
    </main>
  );
}
