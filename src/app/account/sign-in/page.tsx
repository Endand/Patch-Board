import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { AuthForm } from "../AuthForm";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await currentAccount()) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-20">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mb-5 text-sm text-muted">
        An account is only for running boards. Reading and posting never needs
        one.
      </p>
      <AuthForm mode="sign-in" />
    </main>
  );
}
