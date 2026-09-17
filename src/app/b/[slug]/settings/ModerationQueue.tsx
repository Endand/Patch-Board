"use client";

import { useState, useTransition } from "react";
import { deleteCard, setCardStatus } from "@/app/actions";
import {
  CARD_STATUSES,
  CARD_TYPE_META,
  STATUS_LABEL,
  formatDate,
  type Card,
  type Section,
} from "@/lib/cards";
import { CardEditForm } from "@/components/CardEditForm";

export function ModerationQueue({
  slug,
  cards,
  sections,
  sectionNames,
}: {
  slug: string;
  cards: Card[];
  sections: Section[];
  sectionNames: Record<string, string>;
}) {
  if (cards.length === 0) {
    return <p className="text-sm text-muted">Nothing posted yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {cards.map((card) => (
        <Row
          key={card.id}
          card={card}
          slug={slug}
          sections={sections}
          sectionName={sectionNames[card.section_id] ?? "Unknown section"}
        />
      ))}
    </ul>
  );
}

function Row({
  card,
  slug,
  sections,
  sectionName,
}: {
  card: Card;
  slug: string;
  sections: Section[];
  sectionName: string;
}) {
  const meta = CARD_TYPE_META[card.type];
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const edited = card.updated_at && card.updated_at !== card.created_at;

  return (
    <li className="relative overflow-hidden rounded-lg border border-edge bg-surface py-3 pl-5 pr-3">
      <span
        aria-hidden
        className={`edge ${meta.tone} absolute inset-y-0 left-0 w-1`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`chip ${meta.tone} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium`}
        >
          <span aria-hidden>{meta.glyph}</span>
          {meta.label}
        </span>
        <span className="text-xs text-muted">{sectionName}</span>
        <span className="ml-auto text-xs text-muted">
          ▲ {card.vote_count} · {formatDate(card.created_at)}
          {edited ? " · edited" : ""}
        </span>
      </div>

      {editing ? (
        <div className="mt-3">
          <CardEditForm
            slug={slug}
            card={card}
            sections={sections}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <p className="mt-2 font-medium">{card.title}</p>
          {card.body && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {card.body}
            </p>
          )}
        </>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>{card.author_name || "Anonymous"}</span>

        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto hover:text-foreground"
          >
            Edit
          </button>
        )}

        <label className="flex items-center gap-1">
          <span className="sr-only">Status</span>
          <select
            defaultValue={card.status}
            disabled={pending}
            onChange={(e) =>
              start(async () => {
                const r = await setCardStatus(slug, card.id, e.target.value);
                if (!r.ok) setError(r.error);
              })
            }
            className="rounded border border-edge bg-background px-1.5 py-0.5 text-xs"
          >
            {CARD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        {confirming ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteCard(slug, card.id, "");
                  if (!r.ok) setError(r.error);
                })
              }
              className="font-medium text-rose-500"
            >
              Confirm delete
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(true)}
            className="hover:text-rose-500"
          >
            Delete
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-500" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
