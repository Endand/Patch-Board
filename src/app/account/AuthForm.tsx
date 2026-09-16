"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthResult } from "./actions";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    mode === "sign-up" ? signUp : signIn,
    null,
  );

  return (
    <form
      action={action}
      className="rounded-lg border border-edge bg-surface p-5"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-sm font-medium">
          Password
          {mode === "sign-up" && (
            <span className="ml-2 text-xs font-normal text-muted">
              At least 8 characters
            </span>
          )}
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "sign-up" ? 8 : undefined}
          autoComplete={
            mode === "sign-up" ? "new-password" : "current-password"
          }
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </label>

      {state && !state.ok && (
        <p className="mt-3 text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p className="mt-3 text-sm text-muted" role="status">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending
          ? "Working..."
          : mode === "sign-up"
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="mt-4 text-sm text-muted">
        {mode === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link href="/account/sign-in" className="underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account?{" "}
            <Link href="/account/sign-up" className="underline">
              Create one
            </Link>
            {" · "}
            <Link href="/account/forgot" className="underline">
              Forgot password
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
