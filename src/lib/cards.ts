export const CARD_TYPES = [
  "praise",
  "balance",
  "suggestion",
  "bug",
  "polish",
  "question",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export type CardTypeMeta = {
  label: string;
  hint: string;
  /** Tailwind classes for a filled chip. Colour is never the only signal. */
  chip: string;
  /** Left edge marker on a card. */
  edge: string;
  /** Small glyph so the type survives greyscale and colour blindness. */
  glyph: string;
};

export const CARD_TYPE_META: Record<CardType, CardTypeMeta> = {
  praise: {
    label: "Praise",
    hint: "Works well, keep it",
    chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    edge: "bg-emerald-500",
    glyph: "★",
  },
  balance: {
    label: "Balance",
    hint: "Too strong or weak, frame data, kill power",
    chip: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    edge: "bg-amber-500",
    glyph: "⚖",
  },
  suggestion: {
    label: "Suggestion",
    hint: "A design change or idea",
    chip: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    edge: "bg-orange-500",
    glyph: "✎",
  },
  bug: {
    label: "Bug",
    hint: "Broken, crashes, desyncs",
    chip: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    edge: "bg-rose-500",
    glyph: "✕",
  },
  polish: {
    label: "Polish",
    hint: "Visuals, sound, animation",
    chip: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    edge: "bg-sky-500",
    glyph: "◆",
  },
  question: {
    label: "Question",
    hint: "Asking rather than reporting",
    chip: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
    edge: "bg-zinc-500",
    glyph: "?",
  },
};

export type Board = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  visibility: "public" | "protected" | "private";
};

export type Section = {
  id: string;
  group_name: string | null;
  name: string;
  position: number;
  is_hidden: boolean;
};

export type Card = {
  id: string;
  section_id: string;
  type: CardType;
  status: "open" | "acknowledged" | "fixed" | "wontfix";
  title: string;
  body: string | null;
  author_name: string | null;
  vote_count: number;
  created_at: string;
};

/** Sections in board order, bundled under their group header. */
export function groupSections(sections: Section[]) {
  const groups: { name: string | null; sections: Section[] }[] = [];
  for (const section of sections) {
    const last = groups.at(-1);
    if (last && last.name === section.group_name) {
      last.sections.push(section);
    } else {
      groups.push({ name: section.group_name, sections: [section] });
    }
  }
  return groups;
}
