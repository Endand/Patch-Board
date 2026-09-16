import Link from "next/link";
import { db } from "@/lib/supabase";
import { CARD_TYPES, CARD_TYPE_META, type Board } from "@/lib/cards";

export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">Patch Board</h1>
        <p className="mt-2 max-w-xl text-muted">
          Pick a character and leave feedback on any move. No account, no signup.
        </p>
      </header>

      <section className="mb-14">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted">
          Boards
        </h2>
        {boards.length === 0 ? (
          <p className="text-muted">No boards yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={`/b/${board.slug}`}
                  className="block rounded-lg border border-edge bg-surface p-4 transition hover:border-zinc-600"
                >
                  <span className="font-medium">{board.name}</span>
                  {board.subtitle && (
                    <span className="mt-0.5 block text-sm text-muted">
                      {board.subtitle}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted">
          Feedback types
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CARD_TYPES.map((type) => {
            const meta = CARD_TYPE_META[type];
            return (
              <li key={type} className="flex items-baseline gap-3 text-sm">
                <span
                  className={`chip ${meta.tone} inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium`}
                >
                  <span aria-hidden>{meta.glyph}</span>
                  {meta.label}
                </span>
                <span className="text-muted">{meta.hint}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
