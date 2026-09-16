import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { NewOrgForm } from "./NewOrgForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "New organization" };

export default async function NewOrgPage() {
  const account = await currentAccount();
  if (!account) redirect("/account/sign-in?next=%2Fo%2Fnew");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        New organization
      </h1>
      <p className="mt-2 text-sm text-muted">
        Group boards so one password opens all of them and one admin list runs
        all of them. Boards keep their own settings and can still be shared on
        their own.
      </p>
      <div className="mt-6">
        <NewOrgForm />
      </div>
    </main>
  );
}
