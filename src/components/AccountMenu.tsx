import Link from "next/link";
import { currentAccount } from "@/lib/auth";
import { signOut } from "@/app/account/actions";

export async function AccountMenu() {
  const account = await currentAccount();

  if (!account) {
    return (
      <Link
        href="/account/sign-in"
        className="text-sm text-muted transition hover:text-foreground"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted sm:inline" title={account.email}>
        {account.email}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-muted transition hover:text-foreground"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
