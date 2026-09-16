"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth";

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

/**
 * Start GitHub sign in.
 *
 * GitHub is the only way in. Nothing here stores a password, so there is
 * nothing to reset, no confirmation mail to deliver, and no credential of
 * ours to leak.
 */
export async function signInWithGitHub(formData: FormData) {
  const requested = String(formData.get("next") ?? "/");
  // Only ever return inside this site, never to a URL from the form.
  const next = requested.startsWith("/") ? requested : "/";

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${siteUrl()}/account/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) redirect("/account/sign-in?error=start");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
