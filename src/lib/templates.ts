export type TemplateSection = {
  group: string | null;
  name: string;
};

export type Template = {
  slug: string;
  name: string;
  description: string;
  sections: TemplateSection[];
};

const group = (name: string, sections: string[]): TemplateSection[] =>
  sections.map((s) => ({ group: name, name: s }));

/**
 * The Smash fighter preset. Sections are split per move so feedback lands on
 * an exact attack, and grouped so a board still reads as Tilts / Smashes /
 * Aerials rather than 27 loose boxes.
 */
export const SMASH_FIGHTER: Template = {
  slug: "smash-fighter",
  name: "Smash Fighter",
  description:
    "Moveset feedback for a Super Smash Bros. character, one section per move.",
  sections: [
    { group: null, name: "General" },
    ...group("Ground", ["Jab", "Dash Attack"]),
    ...group("Tilts", ["Side Tilt", "Up Tilt", "Down Tilt"]),
    ...group("Smashes", ["Side Smash", "Up Smash", "Down Smash"]),
    ...group("Aerials", [
      "Neutral Air",
      "Forward Air",
      "Back Air",
      "Up Air",
      "Down Air",
    ]),
    ...group("Grabs", ["Grab", "Throws"]),
    ...group("Specials", [
      "Neutral Special",
      "Side Special",
      "Up Special",
      "Down Special",
      "Final Smash",
    ]),
    ...group("Presentation", [
      "CSS Icon",
      "Model",
      "Render",
      "Win Animation",
      "Sounds",
    ]),
    ...group("Misc", ["Taunts"]),
  ],
};

export const TEMPLATES: Template[] = [SMASH_FIGHTER];
