// Whole-word matching of keywords and blocked words (spec §5) in titles and
// descriptions, in English or Hebrew.
//
// JavaScript's \b only knows Latin letters, so word boundaries are checked by
// hand with Unicode letter classes. Hebrew attaches prefixes to the next word
// ("בשואה" = "in the Holocaust"), so a Hebrew term may follow up to 3 prefix letters.

const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;
const HEBREW_LETTER = /[א-ת]/;
const HEBREW_PREFIXES = 'הבלומשכ';
const MAX_HEBREW_PREFIXES = 3;

/** Lowercase, straight apostrophes, single spaces: the form terms are written in. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * The first of `terms` that appears in `text` as a whole word, or null.
 * Terms must already be normalized (see lib/topics.ts).
 */
export function findTerm(text: string, terms: readonly string[]): string | null {
  const normalized = normalizeText(text);
  for (const term of terms) {
    if (containsTerm(normalized, term)) {
      return term;
    }
  }
  return null;
}

function containsTerm(text: string, term: string): boolean {
  if (term === '') {
    return false;
  }
  let index = text.indexOf(term);
  while (index !== -1) {
    if (startsAtBoundary(text, index, term) && endsAtBoundary(text, index + term.length, term)) {
      return true;
    }
    index = text.indexOf(term, index + 1);
  }
  return false;
}

function startsAtBoundary(text: string, index: number, term: string): boolean {
  // Like \b, a term that starts with a symbol ("#meme") needs no boundary before it.
  if (!isWordChar(term[0]) || !isWordChar(text[index - 1])) {
    return true;
  }
  if (!HEBREW_LETTER.test(term[0])) {
    return false;
  }
  let before = index - 1;
  let prefixes = 0;
  while (before >= 0 && prefixes < MAX_HEBREW_PREFIXES && HEBREW_PREFIXES.includes(text[before])) {
    before -= 1;
    prefixes += 1;
  }
  return prefixes > 0 && !isWordChar(text[before]);
}

function endsAtBoundary(text: string, end: number, term: string): boolean {
  return !isWordChar(term[term.length - 1]) || !isWordChar(text[end]);
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD_CHAR.test(char);
}
