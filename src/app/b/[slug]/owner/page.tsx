import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { grantFor, isOwner, loadBoard } from "@/lib/access";
import { PasswordGate } from "@/components/PasswordGate";

export const dynamic = "force-dynamic";

/**
 * Owner sign in. Public boards never show a password prompt of their own, so
 * without this page there would be no way to become the owner of one.
 */
export default async function OwnerSignInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const board = await loadBoard(slug);
  if (!board) notFound();

  if (isOwner(await grantFor(board))) redirect(`/b/${slug}/settings`);

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-20">
      <Link
        href={`/b/${slug}`}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; {board.name}
      </Link>
      <h1 className="mt-3 mb-1 text-2xl font-semibold tracking-tight">
        Owner sign in
      </h1>
      <p className="mb-5 text-sm text-muted">
        Enter the owner secret for {board.name}. It was shown once when the
        board was created.
      </p>
      <PasswordGate slug={slug} boardName={board.name} reason="owner" />
    </main>
  );
}
