"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth";

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

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
