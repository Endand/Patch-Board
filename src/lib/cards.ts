export const CARD_TYPES = [
  "praise",
  "balance",
  "suggestion",
  "bug",
  "polish",
  "question",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const CARD_STATUSES = [
  "open",
  "acknowledged",
  "fixed",
  "wontfix",
] as const;

export type CardStatus = (typeof CARD_STATUSES)[number];

export const STATUS_LABEL: Record<CardStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  fixed: "Fixed",
  wontfix: "Won't fix",
};

export type CardTypeMeta = {
  label: string;
  hint: string;
  /** Colour class. Pairs with `.chip` or `.edge` in globals.css. */
  tone: string;
  /** Small glyph, so the type survives greyscale and colour blindness. */
  glyph: string;
};

export const CARD_TYPE_META: Record<CardType, CardTypeMeta> = {
  praise: {
    label: "Praise",
    hint: "Works well, keep it",
    tone: "t-praise",
    glyph: "★",
  },
  balance: {
    label: "Balance",
    hint: "Too strong or weak, frame data, kill power",
    tone: "t-balance",
    glyph: "⚖",
  },
  suggestion: {
    label: "Suggestion",
    hint: "A design change or idea",
    tone: "t-suggestion",
    glyph: "✎",
  },
  bug: {
    label: "Bug",
    hint: "Broken, crashes, desyncs",
    tone: "t-bug",
    glyph: "✕",
  },
  polish: {
    label: "Polish",
    hint: "Visuals, sound, animation",
    tone: "t-polish",
    glyph: "◆",
  },
  question: {
    label: "Question",
    hint: "Asking rather than reporting",
    tone: "t-question",
    glyph: "?",
  },
};

export function isCardType(value: unknown): value is CardType {
  return CARD_TYPES.includes(value as CardType);
}

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
  status: CardStatus;
  title: string;
  body: string | null;
  media_url: string | null;
  author_name: string | null;
  author_key: string | null;
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
