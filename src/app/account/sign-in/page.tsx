import { redirect } from "next/navigation";
import { currentAccount, PROVIDERS, PROVIDER_LABEL } from "@/lib/auth";
import { ProviderMark } from "@/components/ProviderMark";
import { signInWithProvider } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

const MESSAGE: Record<string, string> = {
  start: "Could not reach that service. Try again.",
  link: "That sign in link had expired. Try again.",
  provider: "Unknown sign in method.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await currentAccount()) redirect("/");

  const { next, error } = await searchParams;
  const destination = next?.startsWith("/") ? next : "/";

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-20 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mb-5 text-sm text-muted">
        An account is only for running boards. Reading and posting never needs
        one.
      </p>

      <div className="panel space-y-2 p-5">
        {PROVIDERS.map((provider) => (
          <form key={provider} action={signInWithProvider}>
            <input type="hidden" name="provider" value={provider} />
            <input type="hidden" name="next" value={destination} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-surface-2 px-4 py-2.5 text-sm font-medium transition hover:border-edge-strong"
            >
              <ProviderMark provider={provider} />
              Continue with {PROVIDER_LABEL[provider]}
            </button>
          </form>
        ))}

        {error && MESSAGE[error] && (
          <p className="pt-1 text-sm text-rose-500" role="alert">
            {MESSAGE[error]}
          </p>
        )}

        <p className="pt-2 text-xs text-muted">
          No password to set or lose. Patch Board sees your username and
          nothing else. Already have an account? Sign in the same way you did
          before, then link the other service from your account page.
        </p>
      </div>
    </main>
  );
}
