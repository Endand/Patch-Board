"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth";

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Where reset links should point back to. Vercel sets VERCEL_URL per
 * deployment, so this follows previews without hardcoding a domain. Set
 * NEXT_PUBLIC_SITE_URL to pin it to your real one.
 */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUp(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email) return { ok: false, error: "Enter an email address" };
  if (password.length < 8) {
    return { ok: false, error: "Use at least 8 characters" };
  }

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { ok: false, error: error.message };

  // With email confirmation switched on, signUp returns a user but no
  // session. Say so rather than silently landing on a signed out page.
  if (!data.session) {
    return {
      ok: true,
      message: "Check your email for a confirmation link, then sign in.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signIn(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { ok: false, error: "Enter your email and password" };
  }

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Supabase returns the same message for a wrong password and an unknown
  // address, which is what we want: it does not reveal who has an account.
  if (error) return { ok: false, error: "Wrong email or password" };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Start a password reset.
 *
 * Always reports success, whether or not the address has an account. Saying
 * "no such user" would turn this form into a way to test which addresses are
 * registered.
 */
export async function requestReset(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Enter an email address" };

  const supabase = await authClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/account/callback?next=/account/reset`,
  });

  return {
    ok: true,
    message: "If that address has an account, a reset link is on its way.",
  };
}

/** Finish a reset. Only works while the link's session is active. */
export async function setPassword(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { ok: false, error: "Use at least 8 characters" };
  }

  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "That reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}
