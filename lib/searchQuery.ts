// The search.list request for one drawn item (spec §5 step 2), and the words
// the query match rule looks for (§5 step 5).
//
// The suffix and the order rotate by the item's pickCount, so an item drawn
// again searches differently and returns other videos.

import { normalizeText } from './textMatch';

export const QUERY_SUFFIXES = ['explained', 'facts', 'how', 'why'] as const;
export const SEARCH_ORDERS = ['relevance', 'viewCount', 'date'] as const;

export type SearchOrder = (typeof SEARCH_ORDERS)[number];

/** What search.list gets for one item: q and order. The fixed parameters are in lib/youtubeRequests.ts. */
export type ItemSearch = { q: string; order: SearchOrder };

/** Common words that would match almost any title, so the rule ignores them. */
const STOP_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'in',
  'on',
  'for',
  'to',
  'with',
  'how',
  'why',
  'what',
  'is',
  'are',
]);

/** The q and order for an item's search, from its query and how many times it was drawn before. */
export function itemSearch(query: string, pickCount: number): ItemSearch {
  const turn = Math.max(0, Math.floor(pickCount));
  const suffix = QUERY_SUFFIXES[turn % QUERY_SUFFIXES.length];
  const order = SEARCH_ORDERS[turn % SEARCH_ORDERS.length];
  return { q: `${query.trim()} ${suffix}`, order };
}

/**
 * Simple singulars for an English plural: without the "s", and also without
 * "es", so "holes" matches "hole" and "volcanoes" matches "volcano". A wrong
 * guess ("hol") only adds a term that no title has.
 */
function singulars(word: string): string[] {
  if (word.length <= 3 || !word.endsWith('s') || word.endsWith('ss')) return [];
  const forms = [word.slice(0, -1)];
  if (word.length > 4 && word.endsWith('es')) forms.push(word.slice(0, -2));
  return forms;
}

/**
 * The terms the query match rule looks for: each word of the query, lowercase,
 * plus a simple singular for plurals, without common words. A query made only
 * of common words keeps them, so the rule still has something to look for.
 */
export function queryTerms(query: string): string[] {
  const words = normalizeText(query)
    .split(/[^\p{L}\p{M}\p{N}'.+#-]+/u)
    .map((word) => word.replace(/^[^\p{L}\p{N}#]+|[^\p{L}\p{N}+#]+$/gu, ''))
    .filter((word) => word !== '');
  const meaningful = words.filter((word) => !STOP_WORDS.has(word));
  const terms = new Set<string>();
  for (const word of meaningful.length > 0 ? meaningful : words) {
    terms.add(word);
    singulars(word).forEach((form) => terms.add(form));
  }
  return [...terms];
}
