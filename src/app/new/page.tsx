import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { currentAccount } from "@/lib/auth";
import { NewBoardForm } from "./NewBoardForm";

export const dynamic = "force-dynamic";

export default async function NewBoardPage() {
  const account = await currentAccount();
  if (!account) redirect("/account/sign-in?next=%2Fnew");

  const { data } = await db
    .from("templates")
    .select("slug, name, description")
    .order("name");

  const templates = (data ?? []) as {
    slug: string;
    name: string;
    description: string | null;
  }[];

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-14">
      <h1 className="text-2xl font-semibold tracking-tight">New board</h1>
      <p className="mt-2 text-sm text-muted">
        The board will belong to {account.email}. Anyone can read and post on
        it without an account.
      </p>
      <div className="mt-6">
        <NewBoardForm templates={templates} />
      </div>
    </main>
  );
}
