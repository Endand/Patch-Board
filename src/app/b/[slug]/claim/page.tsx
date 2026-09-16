import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadBoard } from "@/lib/access";
import { currentAccount } from "@/lib/auth";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const board = await loadBoard(slug);
  if (!board) notFound();

  const account = await currentAccount();
  if (!account) {
    redirect(`/account/sign-in?next=${encodeURIComponent(`/b/${slug}/claim`)}`);
  }
  if (board.owner_user_id) redirect(`/b/${slug}`);

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-20">
      <Link
        href={`/b/${slug}`}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; {board.name}
      </Link>
      <h1 className="mt-3 mb-1 text-2xl font-semibold tracking-tight">
        Claim {board.name}
      </h1>
      <p className="mb-5 text-sm text-muted">
        This board was made before accounts existed. Enter its owner secret to
        attach it to {account.label}.
      </p>
      <ClaimForm slug={slug} />
    </main>
  );
}
