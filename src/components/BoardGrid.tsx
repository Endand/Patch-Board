"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CARD_TYPES,
  CARD_TYPE_META,
  groupSections,
  type Card,
  type CardType,
  type Section,
} from "@/lib/cards";

export function BoardGrid({
  slug,
  sections,
  cards,
}: {
  slug: string;
  sections: Section[];
  cards: Card[];
}) {
  // Empty means no filter rather than "hide everything", so a board opens
  // showing all of its feedback.
  const [active, setActive] = useState<Set<CardType>>(new Set());
  const [hideEmpty, setHideEmpty] = useState(false);

  const totals = useMemo(() => {
    const counts = new Map<CardType, number>();
    for (const card of cards) {
      counts.set(card.type, (counts.get(card.type) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const visible = useMemo(
    () => (active.size === 0 ? cards : cards.filter((c) => active.has(c.type))),
    [cards, active],
  );

  const bySection = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const card of visible) {
      const list = map.get(card.section_id);
      if (list) list.push(card);
      else map.set(card.section_id, [card]);
    }
    return map;
  }, [visible]);

  function toggle(type: CardType) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const filtering = active.size > 0;
  const groups = groupSections(sections);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {CARD_TYPES.filter((type) => totals.has(type)).map((type) => {
          const meta = CARD_TYPE_META[type];
          const on = active.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              aria-pressed={on}
              title={`${on ? "Stop showing only" : "Show only"} ${meta.label}`}
              className={`chip ${meta.tone} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                filtering && !on ? "opacity-40 hover:opacity-70" : ""
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
            onClick={() => setActive(new Set())}
            className="rounded-full border border-edge px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
          >
            Clear filter
          </button>
        )}

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="accent-current"
          />
          Hide empty sections
        </label>
      </div>

      {filtering && visible.length === 0 && (
        <p className="mb-6 text-sm text-muted">
          Nothing on this board matches that filter.
        </p>
      )}

      <div className="space-y-10">
        {groups.map((group, i) => {
          const shown = group.sections.filter(
            (s) => !hideEmpty || (bySection.get(s.id)?.length ?? 0) > 0,
          );
          if (shown.length === 0) return null;

          return (
            <section key={group.name ?? `ungrouped-${i}`}>
              {group.name && (
                <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
                  {group.name}
                </h2>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((section) => (
                  <SectionCard
                    key={section.id}
                    slug={slug}
                    section={section}
                    cards={bySection.get(section.id) ?? []}
                    filtering={filtering}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function SectionCard({
  slug,
  section,
  cards,
  filtering,
}: {
  slug: string;
  section: Section;
  cards: Card[];
  filtering: boolean;
}) {
  const counts = new Map<CardType, number>();
  for (const card of cards) {
    counts.set(card.type, (counts.get(card.type) ?? 0) + 1);
  }
  const empty = cards.length === 0;

  return (
    <Link
      href={`/b/${slug}/s/${section.id}`}
      className={`block rounded-lg border border-edge bg-surface p-4 transition hover:border-zinc-500 ${
        empty ? "opacity-55 hover:opacity-100" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{section.name}</h3>
        <span className="text-xs text-muted">{cards.length || ""}</span>
      </div>

      {empty ? (
        <p className="mt-3 text-sm text-muted">
          {filtering ? "Nothing matching." : "No feedback yet."}
        </p>
      ) : (
        <>
          <ul className="mt-2 flex flex-wrap gap-1">
            {CARD_TYPES.filter((t) => counts.has(t)).map((type) => (
              <li
                key={type}
                title={`${counts.get(type)} ${CARD_TYPE_META[type].label}`}
                className={`chip ${CARD_TYPE_META[type].tone} inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium`}
              >
                <span aria-hidden>{CARD_TYPE_META[type].glyph}</span>
                {counts.get(type)}
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-2">
            {cards.slice(0, 4).map((card) => (
              <li
                key={card.id}
                className="relative overflow-hidden rounded border border-edge bg-surface-2 py-1.5 pl-3 pr-2 text-sm"
              >
                <span
                  aria-hidden
                  className={`edge ${CARD_TYPE_META[card.type].tone} absolute inset-y-0 left-0 w-0.5`}
                />
                {card.title}
              </li>
            ))}
          </ul>
          {cards.length > 4 && (
            <p className="mt-2 text-xs text-muted">+{cards.length - 4} more</p>
          )}
        </>
      )}
    </Link>
  );
}
