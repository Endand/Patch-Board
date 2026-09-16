import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { signInWithGitHub } from "../actions";

export const dynamic = "force-dynamic";

const MESSAGE: Record<string, string> = {
  start: "Could not reach GitHub. Try again.",
  link: "That sign in link had expired. Try again.",
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
    <main className="mx-auto w-full max-w-sm px-6 py-20">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mb-5 text-sm text-muted">
        An account is only for running boards. Reading and posting never needs
        one.
      </p>

      <form
        action={signInWithGitHub}
        className="panel p-5"
      >
        <input type="hidden" name="next" value={destination} />
        <button
          type="submit"
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          <GitHubMark />
          Continue with GitHub
        </button>

        {error && MESSAGE[error] && (
          <p className="mt-3 text-sm text-rose-500" role="alert">
            {MESSAGE[error]}
          </p>
        )}

        <p className="mt-4 text-xs text-muted">
          There is no password to set or lose. Patch Board sees your GitHub
          username and nothing else.
        </p>
      </form>
    </main>
  );
}

function GitHubMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
