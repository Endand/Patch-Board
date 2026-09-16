"use client";

import { useActionState } from "react";
import { claimBoard, type ClaimResult } from "./actions";

export function ClaimForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<ClaimResult | null, FormData>(
    (prev, formData) => claimBoard(slug, prev, formData),
    null,
  );

  return (
    <form
      action={action}
      className="rounded-lg border border-edge bg-surface p-5"
    >
      <div className="flex flex-wrap gap-2">
        <input
          name="password"
          type="password"
          required
          autoComplete="off"
          placeholder="Owner secret"
          className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Checking..." : "Claim board"}
        </button>
      </div>

      {state && !state.ok && (
        <p className="mt-2 text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        Claiming is permanent. The board becomes part of your account and the
        secret alone will no longer grant access to it.
      </p>
    </form>
  );
}
