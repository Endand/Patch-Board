import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { AuthForm } from "../AuthForm";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await currentAccount()) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-20">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Create an account
      </h1>
      <p className="mb-5 text-sm text-muted">
        Accounts exist so you can own and moderate boards. Anyone can read and
        post without one.
      </p>
      <AuthForm mode="sign-up" />
    </main>
  );
}
