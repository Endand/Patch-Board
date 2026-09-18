"use client";

import { useActionState, useRef, useState } from "react";
import { createCard, type ActionResult } from "@/app/actions";
import { CARD_TYPES, CARD_TYPE_META, type CardType } from "@/lib/cards";
import { setDisplayName, useClientKey, useDisplayName } from "@/lib/identity";

export type FieldMode = "required" | "optional" | "hidden";

export function CardComposer({
  slug,
  sectionId,
  sectionName,
  fields,
}: {
  slug: string;
  sectionId: string;
  sectionName: string;
  fields: { authorName: FieldMode; body: FieldMode; mediaUrl: FieldMode };
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CardType>("suggestion");
  const key = useClientKey();
  const storedName = useDisplayName();
  // Uncontrolled after the first keystroke, so the remembered name seeds the
  // field without fighting what is being typed.
  const [name, setName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await createCard(slug, prev, formData);
      if (result.ok) {
        setDisplayName(String(formData.get("author_name") ?? "").trim());
        formRef.current?.reset();
        setName(null);
        setOpen(false);
      }
      return result;
    },
    null,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-edge bg-surface/50 px-4 py-4 text-sm font-medium text-muted transition hover:border-accent hover:text-foreground"
      >
        + Add feedback on {sectionName}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="panel p-4"
    >
      <input type="hidden" name="section_id" value={sectionId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="author_key" value={key} />

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
        required
        maxLength={200}
        placeholder="One line summary"
        className="mt-3 w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
      />
      {fields.body !== "hidden" && (
        <textarea
          name="body"
          rows={3}
          maxLength={5000}
          required={fields.body === "required"}
          placeholder={label("Details", fields.body)}
          className="mt-2 w-full resize-y rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
        />
      )}
      {(fields.mediaUrl !== "hidden" || fields.authorName !== "hidden") && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {fields.mediaUrl !== "hidden" && (
            <input
              name="media_url"
              type="url"
              required={fields.mediaUrl === "required"}
              placeholder={label("Clip link: YouTube, Streamable, Twitch or image", fields.mediaUrl)}
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
            />
          )}
          {fields.authorName !== "hidden" && (
            <input
              name="author_name"
              maxLength={40}
              required={fields.authorName === "required"}
              value={name ?? storedName}
              onChange={(e) => setName(e.target.value)}
              placeholder={label("Your name", fields.authorName)}
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
            />
          )}
        </div>
      )}

      {state && !state.ok && (
        <p className="mt-2 text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Posting..." : "Post"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-3 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <span className="ml-auto text-xs text-muted">
          {fields.authorName === "required"
            ? "A name is required on this board"
            : "No account needed"}
        </span>
      </div>
    </form>
  );
}

/** Placeholders say which fields the board insists on. */
function label(base: string, mode: FieldMode): string {
  return mode === "required" ? `${base}, required` : `${base}, optional`;
}
