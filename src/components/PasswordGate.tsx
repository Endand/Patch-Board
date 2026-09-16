"use client";

import { useActionState } from "react";
import { submitPassword, type ActionResult } from "@/app/actions";

const COPY = {
  read: {
    title: (board: string) => `${board} is private`,
    hint: "Enter the board password to view it.",
    placeholder: "Board password",
    button: "Unlock",
    footer: "The owner secret also works here and unlocks moderation.",
  },
  write: {
    title: () => "Password needed to post",
    hint: "Anyone can read this board, but posting needs the password.",
    placeholder: "Board password",
    button: "Unlock",
    footer: "The owner secret also works here and unlocks moderation.",
  },
  owner: {
    title: () => "Owner secret",
    hint: "",
    placeholder: "Owner secret",
    button: "Sign in",
    footer: "Lost it? A board secret cannot be recovered, only replaced.",
  },
} as const;

export function PasswordGate({
  slug,
  boardName,
  reason,
}: {
  slug: string;
  boardName: string;
  reason: "read" | "write" | "owner";
}) {
  const copy = COPY[reason];
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    (prev, formData) => submitPassword(slug, prev, formData),
    null,
  );

  return (
    <form
      action={action}
      className="rounded-lg border border-edge bg-surface p-5"
    >
      {reason !== "owner" && (
        <>
          <h2 className="font-medium">{copy.title(boardName)}</h2>
          <p className="mt-1 text-sm text-muted">{copy.hint}</p>
        </>
      )}

      <div className={reason === "owner" ? "flex flex-wrap gap-2" : "mt-4 flex flex-wrap gap-2"}>
        <input
          name="password"
          type="password"
          required
          autoComplete="off"
          placeholder={copy.placeholder}
          className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Checking..." : copy.button}
        </button>
      </div>

      {state && !state.ok && (
        <p className="mt-2 text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">{copy.footer}</p>
    </form>
  );
}
