"use client";

import { useActionState } from "react";
import { submitPassword, type ActionResult } from "@/app/actions";

const COPY = {
  read: {
    title: (board: string) => `${board} is private`,
    hint: "Enter the board password to view it.",
    placeholder: "Board password",
    button: "Unlock",
    footer: "",
  },
  write: {
    title: () => "Password needed to post",
    hint: "Anyone can read this board, but posting needs the password.",
    placeholder: "Board password",
    button: "Unlock",
    footer: "",
  },
} as const;

export function PasswordGate({
  slug,
  boardName,
  reason,
}: {
  slug: string;
  boardName: string;
  reason: "read" | "write";
}) {
  const copy = COPY[reason];
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    (prev, formData) => submitPassword(slug, prev, formData),
    null,
  );

  return (
    <form
      action={action}
      className="panel p-5"
    >
      <h2 className="font-medium">{copy.title(boardName)}</h2>
      <p className="mt-1 text-sm text-muted">{copy.hint}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          name="password"
          type="password"
          required
          autoComplete="off"
          placeholder={copy.placeholder}
          className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Checking..." : copy.button}
        </button>
      </div>

      {state && !state.ok && (
        <p className="mt-2 text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}
      {copy.footer && (
        <p className="mt-3 text-xs text-muted">{copy.footer}</p>
      )}
    </form>
  );
}
