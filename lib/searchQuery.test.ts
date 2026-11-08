import { itemSearch, QUERY_SUFFIXES, queryTerms, SEARCH_ORDERS } from './searchQuery';

describe('itemSearch', () => {
  it('starts with "explained" and relevance', () => {
    expect(itemSearch('octopus', 0)).toEqual({ q: 'octopus explained', order: 'relevance' });
  });

  it('rotates the suffix every 4 picks and the order every 3', () => {
    const searches = [0, 1, 2, 3, 4, 5].map((n) => itemSearch('iron', n));
    expect(searches.map((s) => s.q)).toEqual([
      'iron explained',
      'iron facts',
      'iron how',
      'iron why',
      'iron explained',
      'iron facts',
    ]);
    expect(searches.map((s) => s.order)).toEqual([
      'relevance',
      'viewCount',
      'date',
      'relevance',
      'viewCount',
      'date',
    ]);
  });

  it('gives a different pair for each of the first 12 picks', () => {
    const pairs = new Set(
      Array.from({ length: QUERY_SUFFIXES.length * SEARCH_ORDERS.length }, (_, n) => {
        const { q, order } = itemSearch('x', n);
        return `${q}|${order}`;
      }),
    );
    expect(pairs.size).toBe(12);
  });

  it('trims the query and treats a bad pickCount as 0', () => {
    expect(itemSearch('  black holes ', -3)).toEqual({ q: 'black holes explained', order: 'relevance' });
  });
});

describe('queryTerms', () => {
  it('splits the query into lowercase words', () => {
    expect(queryTerms('Claude Code')).toEqual(['claude', 'code']);
  });

  it('adds a singular for plurals', () => {
    expect(queryTerms('black holes')).toEqual(['black', 'holes', 'hole', 'hol']);
    expect(queryTerms('volcanoes')).toEqual(['volcanoes', 'volcanoe', 'volcano']);
    expect(queryTerms('cats')).toEqual(['cats', 'cat']);
  });

  it('leaves words ending in "ss" alone', () => {
    expect(queryTerms('glass')).toEqual(['glass']);
  });

  it('drops common words', () => {
    expect(queryTerms('the history of rome')).toEqual(['history', 'rome']);
  });

  it('keeps common words if there is nothing else', () => {
    expect(queryTerms('how')).toEqual(['how']);
  });

  it('strips punctuation but keeps words like c++ and claude.md', () => {
    expect(queryTerms('C++, (rust)!')).toEqual(['c++', 'rust']);
    expect(queryTerms('CLAUDE.md')).toEqual(['claude.md']);
  });

  it('returns nothing for an empty query', () => {
    expect(queryTerms('  ')).toEqual([]);
  });
});
