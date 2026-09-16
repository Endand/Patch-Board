import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { ResetForm } from "../ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPage() {
  // The reset link signs you in briefly. No session means the link expired,
  // was already used, or somebody navigated here directly.
  const account = await currentAccount();
  if (!account) redirect("/account/forgot?expired=1");

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-20">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      <p className="mb-5 text-sm text-muted">Signed in as {account.email}.</p>
      <ResetForm mode="set" />
    </main>
  );
}
