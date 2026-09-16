"use client";

import { useState, useTransition } from "react";
import { deleteCard, setCardStatus, toggleVote } from "@/app/actions";
import {
  CARD_STATUSES,
  CARD_TYPE_META,
  STATUS_LABEL,
  type Card,
} from "@/lib/cards";
import { setVoted, useClientKey, useHasVoted } from "@/lib/identity";

export function CardItem({
  card,
  slug,
  canVote,
  isOwner,
}: {
  card: Card;
  slug: string;
  canVote: boolean;
  isOwner: boolean;
}) {
  const meta = CARD_TYPE_META[card.type];
  const key = useClientKey();
  const voted = useHasVoted(card.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mine = Boolean(key) && card.author_key === key;

  function vote() {
    start(async () => {
      const result = await toggleVote(slug, card.id, key);
      if (!result.ok) return setError(result.error);
      setVoted(card.id, !voted);
    });
  }

  return (
    <article className="relative overflow-hidden rounded-lg border border-edge bg-surface">
      <span aria-hidden className={`edge ${meta.tone} absolute inset-y-0 left-0 w-1`} />
      <div className="py-3 pl-5 pr-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`chip ${meta.tone} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium`}
          >
            <span aria-hidden>{meta.glyph}</span>
            {meta.label}
          </span>
          {card.status !== "open" && (
            <span className="rounded-full border border-edge px-2 py-0.5 text-[11px] text-muted">
              {STATUS_LABEL[card.status]}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {canVote && (
              <button
                type="button"
                onClick={vote}
                disabled={pending || !key}
                aria-pressed={voted}
                className={`rounded border px-2 py-0.5 text-xs transition ${
                  voted
                    ? "border-edge bg-background font-medium"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                ▲ {card.vote_count}
              </button>
            )}
            {!canVote && card.vote_count > 0 && (
              <span className="text-xs text-muted">▲ {card.vote_count}</span>
            )}
          </span>
        </div>

        <h3 className="mt-2 font-medium">{card.title}</h3>
        {card.body && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {card.body}
          </p>
        )}
        {card.media_url && (
          <a
            href={card.media_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-2 inline-block text-sm underline underline-offset-2"
          >
            Attached link
          </a>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>{card.author_name || "Anonymous"}</span>
          <time dateTime={card.created_at}>
            {new Date(card.created_at).toLocaleDateString()}
          </time>

          {isOwner && (
            <label className="ml-auto flex items-center gap-1">
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
          )}

          {(mine || isOwner) && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteCard(slug, card.id, key);
                  if (!r.ok) setError(r.error);
                })
              }
              className={`${isOwner ? "" : "ml-auto"} hover:text-rose-500`}
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
      </div>
    </article>
  );
}
