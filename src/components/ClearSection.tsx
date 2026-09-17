"use client";

import { useState, useTransition } from "react";
import { deleteSectionCards } from "@/app/actions";

/**
 * Clear one section's feedback. Two steps and a count, because the cards
 * belong to other people and there is no undo.
 */
export function ClearSection({
  slug,
  sectionId,
  sectionName,
  count,
}: {
  slug: string;
  sectionId: string;
  sectionName: string;
  count: number;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (count === 0) return null;

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-xs text-muted transition hover:text-rose-500"
      >
        Clear this section
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">
        Delete all {count} in {sectionName}?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await deleteSectionCards(slug, sectionId);
            if (result.ok) setArmed(false);
            else setError(result.error);
          })
        }
        className="font-medium text-rose-500 disabled:opacity-50"
      >
        {pending ? "Clearing..." : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-muted hover:text-foreground"
      >
        Cancel
      </button>
      {error && <span className="text-rose-500">{error}</span>}
    </span>
  );
}
