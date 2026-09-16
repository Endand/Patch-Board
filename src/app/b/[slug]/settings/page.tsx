import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { grantFor, isOwner, loadBoard } from "@/lib/access";
import { accountsById, currentAccount, listAccounts } from "@/lib/auth";
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

  // An unclaimed board can still be taken over with its owner secret.
  // Anything else belongs to someone, so there is nothing to offer here.
  if (!isOwner(await grantFor(board))) {
    redirect(board.owner_user_id ? `/b/${slug}` : `/b/${slug}/claim`);
  }

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

  const [{ data: adminRows }, accounts, me] = await Promise.all([
    db.from("board_admins").select("user_id").eq("board_id", board.id),
    listAccounts(),
    currentAccount(),
  ]);

  const adminIds = (adminRows ?? []).map((r) => r.user_id as string);
  const emails = await accountsById(
    board.owner_user_id ? [board.owner_user_id, ...adminIds] : adminIds,
  );

  const admins = [
    ...(board.owner_user_id
      ? [
          {
            id: board.owner_user_id,
            email: emails.get(board.owner_user_id) ?? "Unknown account",
            primary: true,
          },
        ]
      : []),
    ...adminIds.map((id) => ({
      id,
      email: emails.get(id) ?? "Unknown account",
      primary: false,
    })),
  ];

  const candidates = accounts.filter(
    (a) => a.id !== board.owner_user_id && !adminIds.includes(a.id),
  );

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
        fields={{
          authorName: board.author_name_mode,
          body: board.body_mode,
          mediaUrl: board.media_url_mode,
        }}
        admins={admins}
        candidates={candidates}
        currentUserId={me?.id ?? null}
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
