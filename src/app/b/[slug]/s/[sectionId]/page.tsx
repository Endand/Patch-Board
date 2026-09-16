import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { canRead, canWrite, grantFor, isOwner, loadBoard } from "@/lib/access";
import { CARD_TYPE_META, type Card, type Section } from "@/lib/cards";
import { CardComposer } from "@/components/CardComposer";
import { CardItem } from "@/components/CardItem";
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

  const { data: cardRows } = await db
    .from("cards")
    .select(
      "id, section_id, type, status, title, body, media_url, author_name, author_key, vote_count, created_at",
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

      <header className="mt-3 mb-6">
        {section.group_name && (
          <p className="text-xs uppercase tracking-widest text-muted">
            {section.group_name}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">
          {section.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {cards.length} {cards.length === 1 ? "note" : "notes"}
        </p>
      </header>

      <div className="mb-8">
        {writable ? (
          <CardComposer
            slug={slug}
            sectionId={section.id}
            sectionName={section.name}
          />
        ) : (
          <PasswordGate slug={slug} boardName={board.name} reason="write" />
        )}
      </div>

      {cards.length === 0 ? (
        <p className="text-muted">
          Nothing here yet. {writable && "Be the first."}
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              slug={slug}
              canVote={writable}
              isOwner={isOwner(grant)}
            />
          ))}
        </div>
      )}

      <footer className="mt-12 flex flex-wrap gap-3 text-xs text-muted">
        {Object.values(CARD_TYPE_META).map((meta) => (
          <span key={meta.label} className="inline-flex items-center gap-1">
            <span aria-hidden>{meta.glyph}</span>
            {meta.label}
          </span>
        ))}
      </footer>
    </main>
  );
}
