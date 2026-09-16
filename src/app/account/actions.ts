"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authClient, currentAccount, isProvider } from "@/lib/auth";

/**
 * Where OAuth should return to. Vercel sets VERCEL_URL per deployment, so
 * this follows preview builds without hardcoding a domain. Set
 * NEXT_PUBLIC_SITE_URL to pin it to the real one.
 */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Only ever return inside this site, never to a URL taken from a form. */
function safeNext(value: FormDataEntryValue | null): string {
  const raw = String(value ?? "/");
  return raw.startsWith("/") ? raw : "/";
}

/**
 * Start sign in with GitHub or Discord.
 *
 * Nothing here stores a password, so there is nothing to reset and no
 * credential of ours to leak.
 */
export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (!isProvider(provider)) redirect("/account/sign-in?error=provider");

  const next = safeNext(formData.get("next"));

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl()}/account/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) redirect("/account/sign-in?error=start");
  redirect(data.url);
}

/**
 * Attach a second provider to the account already signed in.
 *
 * This is how one person stays one account. Without it, signing in with
 * Discord after GitHub creates a separate account that owns none of your
 * boards, which is exactly the trap worth avoiding.
 */
export async function linkProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (!isProvider(provider)) redirect("/account?error=provider");

  const account = await currentAccount();
  if (!account) redirect("/account/sign-in?next=%2Faccount");
  if (account.providers.includes(provider)) redirect("/account");

  // Remember who started this. If the round trip comes back as somebody
  // else, the link did not happen and we signed into a new account instead,
  // which is worth catching rather than silently swapping accounts.
  const jar = await cookies();
  jar.set("pb_linking", account.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const supabase = await authClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo: `${siteUrl()}/account/callback?next=%2Faccount`,
    },
  });

  // Carry the real reason through rather than a generic failure. Manual
  // linking being switched off is only one of several things that land here,
  // and guessing wastes everyone's time.
  if (error || !data?.url) {
    const reason = error?.message ?? "No redirect URL came back";
    console.error("[link]", provider, reason);
    redirect(`/account?error=linking&why=${encodeURIComponent(reason)}`);
  }
  redirect(data.url);
}

export async function unlinkProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (!isProvider(provider)) redirect("/account?error=provider");

  const account = await currentAccount();
  if (!account) redirect("/account/sign-in?next=%2Faccount");

  // Removing the only way in would lock the account out of its own boards.
  if (account.providers.length < 2) redirect("/account?error=last");

  const supabase = await authClient();
  const { data } = await supabase.auth.getUserIdentities();
  const identity = data?.identities?.find((i) => i.provider === provider);
  if (identity) await supabase.auth.unlinkIdentity(identity);

  revalidatePath("/account", "layout");
  redirect("/account");
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
