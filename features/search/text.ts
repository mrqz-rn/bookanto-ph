// Turns what a customer typed into search tokens. Browser-safe and pure.
//
// The database matches each token against a shop's search text (name,
// categories, services, barangay, city) with trigram similarity, so small
// typos still match. This file handles what similarity can't: spacing,
// accents, and Filipino or shorthand words for a service.

/** Longest query we search with; the rest is dropped. */
export const MAX_QUERY_LENGTH = 100;
const MAX_TOKENS = 6;

/**
 * Phrases rewritten before tokenizing, longest first. Keys and values are
 * already normalized (lowercase, no accents).
 */
const PHRASES: ReadonlyArray<[from: string, to: string]> = [
  ["air conditioner", "aircon"],
  ["air conditioning", "aircon"],
  ["air con", "aircon"],
  ["a c", "aircon"],
  ["carwash", "car wash"],
  ["hair cut", "haircut"],
  ["pa gupit", "haircut"],
  ["home service", "home"],
];

/** Single words mapped to the word shops use. */
const SYNONYMS: Readonly<Record<string, string>> = {
  ac: "aircon",
  erkon: "aircon",
  gupit: "haircut",
  pagupit: "haircut",
  barbero: "barber",
  barberya: "barbershop",
  parlor: "salon",
  parlour: "salon",
  kuko: "nail",
  manikyur: "manicure",
  pedikyur: "pedicure",
  masahe: "massage",
  hilot: "massage",
  labada: "laundry",
  laba: "laundry",
  talyer: "auto repair",
  mekaniko: "auto repair",
  linis: "cleaning",
  paligo: "grooming",
};

/** Words that add nothing to a search. */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "near",
  "me",
  "ng",
  "sa",
  "the",
  "na",
  "po",
]);

/** Lowercase, accents removed, punctuation to spaces, single spaces. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type ParsedQuery = {
  /** The normalized query after synonyms, for matching against shop names. */
  text: string;
  /** Distinct words every matching shop must contain (or nearly contain). */
  tokens: string[];
};

/** Null when there is nothing to search for. */
export function parseQuery(raw: string | null | undefined): ParsedQuery | null {
  if (!raw) return null;
  let text = ` ${normalizeText(raw.slice(0, MAX_QUERY_LENGTH))} `;
  for (const [from, to] of PHRASES) text = text.replaceAll(` ${from} `, ` ${to} `);

  const tokens: string[] = [];
  for (const word of text.trim().split(" ")) {
    if (!word || STOP_WORDS.has(word)) continue;
    for (const token of (SYNONYMS[word] ?? word).split(" ")) {
      if (!tokens.includes(token)) tokens.push(token);
    }
  }
  if (tokens.length === 0) return null;
  const kept = tokens.slice(0, MAX_TOKENS);
  return { text: kept.join(" "), tokens: kept };
}
