"use client";

import { useMemo, useState } from "react";
import {
  CARD_TYPES,
  CARD_TYPE_META,
  STATUS_LABEL,
  type Card,
  type CardStatus,
  type CardType,
  type Section,
} from "@/lib/cards";
import { CardItem } from "@/components/CardItem";

/** Statuses that mean "already dealt with", offered as quick hide toggles. */
const RESOLVED: CardStatus[] = ["acknowledged", "fixed", "wontfix"];

export function SectionCards({
  slug,
  cards,
  sections,
  canVote,
  isOwner,
}: {
  slug: string;
  cards: Card[];
  sections: Section[];
  canVote: boolean;
  isOwner: boolean;
}) {
  const [activeTypes, setActiveTypes] = useState<Set<CardType>>(new Set());
  const [hidden, setHidden] = useState<Set<CardStatus>>(new Set());

  const totals = useMemo(() => {
    const counts = new Map<CardType, number>();
    for (const card of cards) {
      counts.set(card.type, (counts.get(card.type) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const statusTotals = useMemo(() => {
    const counts = new Map<CardStatus, number>();
    for (const card of cards) {
      counts.set(card.status, (counts.get(card.status) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const visible = useMemo(
    () =>
      cards.filter(
        (card) =>
          (activeTypes.size === 0 || activeTypes.has(card.type)) &&
          !hidden.has(card.status),
      ),
    [cards, activeTypes, hidden],
  );

  function toggleType(type: CardType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleStatus(status: CardStatus) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const filteringTypes = activeTypes.size > 0;
  const filtering = filteringTypes || hidden.size > 0;
  const offered = RESOLVED.filter((s) => (statusTotals.get(s) ?? 0) > 0);

  if (cards.length === 0) return null;

  return (
    <>
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {CARD_TYPES.filter((type) => totals.has(type)).map((type) => {
            const meta = CARD_TYPE_META[type];
            const on = activeTypes.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                aria-pressed={on}
                title={`${on ? "Stop showing only" : "Show only"} ${meta.label}`}
                className={`chip ${meta.tone} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  filteringTypes && !on ? "opacity-40 hover:opacity-70" : ""
                }`}
              >
                <span aria-hidden>{meta.glyph}</span>
                {meta.label}
                <span className="opacity-70">{totals.get(type)}</span>
              </button>
            );
          })}

          {filtering && (
            <button
              type="button"
              onClick={() => {
                setActiveTypes(new Set());
                setHidden(new Set());
              }}
              className="rounded-full border border-edge px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>

        {offered.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <span>Hide</span>
            {offered.map((status) => (
              <label
                key={status}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <input
                  type="checkbox"
                  checked={hidden.has(status)}
                  onChange={() => toggleStatus(status)}
                  className="accent-current"
                />
                {STATUS_LABEL[status]}
                <span className="opacity-70">{statusTotals.get(status)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">
          Everything here is filtered out. Clear the filters to see all{" "}
          {cards.length}.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              slug={slug}
              sections={sections}
              canVote={canVote}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </>
  );
}
