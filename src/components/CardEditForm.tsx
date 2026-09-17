"use client";

import { useActionState, useState } from "react";
import { updateCard, type ActionResult } from "@/app/actions";
import { CARD_TYPES, CARD_TYPE_META, type Card, type CardType } from "@/lib/cards";

export function CardEditForm({
  slug,
  card,
  onDone,
}: {
  slug: string;
  card: Card;
  onDone: () => void;
}) {
  const [type, setType] = useState<CardType>(card.type);

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await updateCard(slug, card.id, prev, formData);
      if (result.ok) onDone();
      return result;
    },
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="type" value={type} />

      <fieldset>
        <legend className="sr-only">Feedback type</legend>
        <div className="flex flex-wrap gap-1.5">
          {CARD_TYPES.map((t) => {
            const meta = CARD_TYPE_META[t];
            const active = t === type;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={active}
                title={meta.hint}
                className={`chip ${meta.tone} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  active ? "" : "opacity-45 hover:opacity-80"
                }`}
              >
                <span aria-hidden>{meta.glyph}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <input
        name="title"
        defaultValue={card.title}
        required
        maxLength={200}
        aria-label="Title"
        className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
      />
      <textarea
        name="body"
        defaultValue={card.body ?? ""}
        rows={3}
        maxLength={5000}
        aria-label="Details"
        placeholder="Details"
        className="w-full resize-y rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
      />
      <input
        name="media_url"
        type="url"
        defaultValue={card.media_url ?? ""}
        aria-label="Clip or image link"
        placeholder="Clip or image link"
        className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
      />

      {state && !state.ok && (
        <p className="text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded px-3 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <span className="text-xs text-muted">
          Edits are marked on the card
        </span>
      </div>
    </form>
  );
}
