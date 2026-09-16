import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import {
  currentAccount,
  PROVIDERS,
  PROVIDER_LABEL,
  type Provider,
} from "@/lib/auth";
import { ProviderMark } from "@/components/ProviderMark";
import { linkProvider, signOut, unlinkProvider } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your account" };

const MESSAGE: Record<string, string> = {
  linking: "Could not start linking.",
  refused:
    "Nothing was linked. This usually means that service already belongs to another Patch Board account. Sign in to that account and remove it there first, or delete it if it holds nothing you need.",
  last: "That is the only way into this account, so it cannot be removed.",
  provider: "Unknown sign in method.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; why?: string }>;
}) {
  const account = await currentAccount();
  if (!account) redirect("/account/sign-in?next=%2Faccount");

  const { error, why } = await searchParams;

  const [{ count: boardCount }, { count: orgCount }] = await Promise.all([
    db
      .from("boards")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", account.id),
    db
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", account.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        {account.label}
        {account.email && account.handle ? ` · ${account.email}` : ""}
      </p>

      {error && MESSAGE[error] && (
        <div
          className="mb-6 rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-500"
          role="alert"
        >
          <p>{MESSAGE[error]}</p>
          {why && (
            <p className="mt-1 font-mono text-xs opacity-80">{why}</p>
          )}
        </div>
      )}

      <section className="panel p-5">
        <h2 className="mb-1 text-lg font-medium">Ways to sign in</h2>
        <p className="mb-4 text-sm text-muted">
          Link both and either one gets you into this same account, with the
          same boards. Signing in with an unlinked service creates a separate
          account instead.
        </p>

        <ul className="space-y-2">
          {PROVIDERS.map((provider: Provider) => {
            const linked = account.providers.includes(provider);
            return (
              <li
                key={provider}
                className="flex flex-wrap items-center gap-3 rounded border border-edge bg-background px-3 py-2.5 text-sm"
              >
                <ProviderMark provider={provider} />
                <span className="font-medium">{PROVIDER_LABEL[provider]}</span>
                {linked ? (
                  <>
                    <span className="text-xs text-muted">Linked</span>
                    {account.providers.length > 1 && (
                      <form action={unlinkProvider} className="ml-auto">
                        <input type="hidden" name="provider" value={provider} />
                        <button
                          type="submit"
                          className="text-xs text-muted transition hover:text-rose-500"
                        >
                          Unlink
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <form action={linkProvider} className="ml-auto">
                    <input type="hidden" name="provider" value={provider} />
                    <button
                      type="submit"
                      className="btn-primary rounded px-2.5 py-1 text-xs font-medium"
                    >
                      Link
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="mb-4 text-lg font-medium">What you run</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted">Boards owned</dt>
            <dd className="mt-0.5 text-2xl font-semibold tabular-nums">
              {boardCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Organizations</dt>
            <dd className="mt-0.5 text-2xl font-semibold tabular-nums">
              {orgCount ?? 0}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/new"
            className="rounded-lg border border-edge px-3 py-1.5 text-sm transition hover:border-edge-strong"
          >
            New board
          </Link>
          <Link
            href="/o/new"
            className="rounded-lg border border-edge px-3 py-1.5 text-sm transition hover:border-edge-strong"
          >
            New organization
          </Link>
        </div>
      </section>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="rounded-lg border border-edge px-3 py-1.5 text-sm transition hover:border-edge-strong"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
