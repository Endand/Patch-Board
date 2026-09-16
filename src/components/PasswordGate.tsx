"use client";

import { useActionState } from "react";
import { submitPassword, type ActionResult } from "@/app/actions";

export function PasswordGate({
  slug,
  boardName,
  reason,
}: {
  slug: string;
  boardName: string;
  reason: "read" | "write";
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    (prev, formData) => submitPassword(slug, prev, formData),
    null,
  );

  return (
    <form
      action={action}
      className="rounded-lg border border-edge bg-surface p-5"
    >
      <h2 className="font-medium">
        {reason === "read"
          ? `${boardName} is private`
          : `Password needed to post`}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {reason === "read"
          ? "Enter the board password to view it."
          : "Anyone can read this board, but posting needs the password."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          name="password"
          type="password"
          required
          autoComplete="off"
          placeholder="Board password"
          className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Checking..." : "Unlock"}
        </button>
      </div>

      {state && !state.ok && (
        <p className="mt-2 text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        The owner secret also works here and unlocks moderation.
      </p>
    </form>
  );
}
