import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import {
  CARD_TYPES,
  CARD_TYPE_META,
  groupSections,
  type Board,
  type Card,
  type CardType,
  type Section,
} from "@/lib/cards";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: board } = await db
    .from("boards")
    .select("id, slug, name, subtitle, visibility")
    .eq("slug", slug)
    .maybeSingle<Board>();

  if (!board) notFound();

  // Private boards are gated in a later pass. Until the password flow exists,
  // refuse to render them rather than leaking their contents.
  if (board.visibility === "private") notFound();

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
        "id, section_id, type, status, title, body, author_name, vote_count, created_at",
      )
      .eq("board_id", board.id)
      .order("vote_count", { ascending: false }),
  ]);

  const sections = (sectionRows ?? []) as Section[];
  const cards = (cardRows ?? []) as Card[];

  const bySection = new Map<string, Card[]>();
  for (const card of cards) {
    const list = bySection.get(card.section_id);
    if (list) list.push(card);
    else bySection.set(card.section_id, [card]);
  }

  const totals = CARD_TYPES.map((type) => ({
    type,
    count: cards.filter((c) => c.type === type).length,
  })).filter((t) => t.count > 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; All boards
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {board.name}
            </h1>
            {board.subtitle && (
              <p className="mt-1 text-muted">{board.subtitle}</p>
            )}
          </div>
          <p className="text-sm text-muted">
            {cards.length} {cards.length === 1 ? "note" : "notes"} across{" "}
            {sections.length} sections
          </p>
        </div>

        {totals.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {totals.map(({ type, count }) => (
              <li
                key={type}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${CARD_TYPE_META[type].chip}`}
              >
                <span aria-hidden>{CARD_TYPE_META[type].glyph}</span>
                {CARD_TYPE_META[type].label}
                <span className="opacity-70">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="space-y-10">
        {groupSections(sections).map((group, i) => (
          <section key={group.name ?? `ungrouped-${i}`}>
            {group.name && (
              <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
                {group.name}
              </h2>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  cards={bySection.get(section.id) ?? []}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function SectionCard({ section, cards }: { section: Section; cards: Card[] }) {
  const counts = new Map<CardType, number>();
  for (const card of cards) {
    counts.set(card.type, (counts.get(card.type) ?? 0) + 1);
  }

  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{section.name}</h3>
        <span className="text-xs text-muted">{cards.length || ""}</span>
      </div>

      {cards.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No feedback yet.</p>
      ) : (
        <>
          <ul className="mt-2 flex flex-wrap gap-1">
            {CARD_TYPES.filter((t) => counts.has(t)).map((type) => (
              <li
                key={type}
                title={`${counts.get(type)} ${CARD_TYPE_META[type].label}`}
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${CARD_TYPE_META[type].chip}`}
              >
                <span aria-hidden>{CARD_TYPE_META[type].glyph}</span>
                {counts.get(type)}
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-2">
            {cards.slice(0, 4).map((card) => (
              <li
                key={card.id}
                className="relative overflow-hidden rounded border border-edge bg-background py-1.5 pl-3 pr-2 text-sm"
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-0.5 ${CARD_TYPE_META[card.type].edge}`}
                />
                {card.title}
              </li>
            ))}
          </ul>
          {cards.length > 4 && (
            <p className="mt-2 text-xs text-muted">
              +{cards.length - 4} more
            </p>
          )}
        </>
      )}
    </div>
  );
}
