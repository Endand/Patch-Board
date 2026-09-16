import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { grantFor, isOwner, loadBoard } from "@/lib/access";
import type { Card, Section } from "@/lib/cards";
import { BoardSettings } from "./BoardSettings";
import { ModerationQueue } from "./ModerationQueue";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const board = await loadBoard(slug);
  if (!board) notFound();

  // Anyone who is not already the owner is sent to sign in, rather than shown
  // a 404, so the owner of a public board can find their way in.
  if (!isOwner(await grantFor(board))) redirect(`/b/${slug}/owner`);

  const [{ data: sectionRows }, { data: cardRows }] = await Promise.all([
    db
      .from("sections")
      .select("id, group_name, name, position, is_hidden")
      .eq("board_id", board.id)
      .order("position"),
    db
      .from("cards")
      .select(
        "id, section_id, type, status, title, body, media_url, author_name, author_key, vote_count, created_at",
      )
      .eq("board_id", board.id)
      .order("created_at", { ascending: false }),
  ]);

  const sections = (sectionRows ?? []) as Section[];
  const cards = (cardRows ?? []) as Card[];
  const sectionNames = new Map(sections.map((s) => [s.id, s.name]));

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href={`/b/${slug}`}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; {board.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Board settings
      </h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        You are signed in as the owner of {board.name}.
      </p>

      <BoardSettings
        slug={slug}
        name={board.name}
        subtitle={board.subtitle}
        visibility={board.visibility}
        hasPassword={Boolean(board.access_hash)}
      />

      <section className="mt-12">
        <h2 className="mb-1 text-lg font-medium">Feedback</h2>
        <p className="mb-4 text-sm text-muted">
          {cards.length} {cards.length === 1 ? "card" : "cards"}. Set a status
          or remove anything that does not belong.
        </p>
        <ModerationQueue
          slug={slug}
          cards={cards}
          sectionNames={Object.fromEntries(sectionNames)}
        />
      </section>
    </main>
  );
}
