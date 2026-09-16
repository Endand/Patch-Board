import Link from "next/link";
import { db } from "@/lib/supabase";
import { currentAccount } from "@/lib/auth";
import { CARD_TYPES, CARD_TYPE_META, type Board } from "@/lib/cards";

export const dynamic = "force-dynamic";

type BoardWithCount = Board & { cardCount: number };

export default async function Home() {
  const { data } = await db
    .from("boards")
    .select("id, slug, name, subtitle, visibility")
    .eq("is_listed", true)
    // Private boards stay off the index. Their name alone is a leak, and
    // anyone meant to see one has the link.
    .neq("visibility", "private")
    .order("created_at", { ascending: true });

  const boards = (data ?? []) as Board[];

  const account = await currentAccount();
  const mine = account
    ? (((
        await db
          .from("boards")
          .select("id, slug, name, subtitle, visibility")
          .eq("owner_user_id", account.id)
          .order("created_at", { ascending: true })
      ).data ?? []) as Board[])
    : [];

  // One query for the counts rather than one per board.
  const ids = [...new Set([...boards, ...mine].map((b) => b.id))];
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

  const withCounts = (list: Board[]): BoardWithCount[] =>
    list.map((b) => ({ ...b, cardCount: counts.get(b.id) ?? 0 }));

  return (
    <main>
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden className="hero-grid absolute inset-0" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            No account needed to post
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Feedback that lands where it belongs.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Every board is broken into the parts that matter, and every note is
            colour coded by what it actually is. See at a glance what is praised,
            what is broken, and what still needs a decision.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/new"
              className="btn-primary rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              Create a board
            </Link>
            {boards.length > 0 && (
              <a
                href="#boards"
                className="rounded-lg border border-edge bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-edge-strong"
              >
                Browse boards
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        {mine.length > 0 && (
          <BoardSection
            id="mine"
            title="Your boards"
            boards={withCounts(mine)}
            showVisibility
          />
        )}

        <BoardSection
          id="boards"
          title={mine.length > 0 ? "All boards" : "Boards"}
          boards={withCounts(boards)}
          empty={
            <div className="panel px-6 py-12 text-center">
              <p className="font-medium">No boards yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                A board is generated from a template, so you get every section
                ready to fill the moment you make one.
              </p>
              <Link
                href="/new"
                className="btn-primary mt-5 inline-block rounded-lg px-4 py-2 text-sm font-medium"
              >
                Create the first board
              </Link>
            </div>
          }
        />

        <section className="mt-16">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted">
            Feedback types
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Every note carries one of these. Filter a board by any combination
            to see only what you are looking for.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CARD_TYPES.map((type) => {
              const meta = CARD_TYPE_META[type];
              return (
                <li key={type} className="panel p-4">
                  <span
                    className={`chip ${meta.tone} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium`}
                  >
                    <span aria-hidden>{meta.glyph}</span>
                    {meta.label}
                  </span>
                  <p className="mt-2.5 text-sm text-muted">{meta.hint}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}

function BoardSection({
  id,
  title,
  boards,
  empty,
  showVisibility = false,
}: {
  id: string;
  title: string;
  boards: BoardWithCount[];
  empty?: React.ReactNode;
  showVisibility?: boolean;
}) {
  if (boards.length === 0 && !empty) return null;

  return (
    <section id={id} className="mb-14 scroll-mt-20">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted">
        {title}
      </h2>
      {boards.length === 0 ? (
        empty
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/b/${board.slug}`}
                className="panel lift flex h-full flex-col p-5"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium">{board.name}</span>
                  {showVisibility && board.visibility !== "public" && (
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
                  {board.cardCount === 0
                    ? "No feedback yet"
                    : `${board.cardCount} ${board.cardCount === 1 ? "note" : "notes"}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
