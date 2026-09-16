import { db } from "@/lib/supabase";
import { NewBoardForm } from "./NewBoardForm";

export const dynamic = "force-dynamic";

export default async function NewBoardPage() {
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
        Creating a board needs the site admin secret. Everything else on Patch
        Board stays open.
      </p>
      <div className="mt-6">
        <NewBoardForm templates={templates} />
      </div>
    </main>
  );
}
