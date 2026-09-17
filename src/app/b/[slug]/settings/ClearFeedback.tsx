"use client";

import { useActionState, useState } from "react";
import { deleteAllCards, type ActionResult } from "@/app/actions";

/**
 * Clear a whole round of feedback without touching the board.
 *
 * Deliberately separate from deleting the board: starting a fresh round is
 * routine, rebuilding every section is not. Sections, settings and admins all
 * survive this.
 */
export function ClearFeedback({
  slug,
  count,
}: {
  slug: string;
  count: number;
}) {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await deleteAllCards(slug, prev, formData);
      if (result.ok) setArmed(false);
      return result;
    },
    null,
  );

  return (
    <div className="mt-8 rounded-lg border border-rose-500/40 p-5">
      <h3 className="mb-1 font-medium">Clear all feedback</h3>
      <p className="mb-4 text-sm text-muted">
        Deletes all {count} {count === 1 ? "card" : "cards"} on this board and
        the votes on them. Sections, settings and admins stay exactly as they
        are. There is no undo.
      </p>

      {armed ? (
        <form action={action} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Type &quot;delete all&quot; to confirm
            </span>
            <input
              name="confirm"
              autoComplete="off"
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-rose-500"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Clearing..." : `Delete all ${count}`}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="rounded px-3 py-1.5 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          {state && !state.ok && (
            <p className="text-sm text-rose-500" role="alert">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-500"
        >
          Clear all feedback
        </button>
      )}
    </div>
  );
}
