import { BLOCKED_WORDS, TOPICS } from './topics';

// The matcher in lib/textMatch.ts relies on these lists being normalized.
function expectNormalized(terms: readonly string[]) {
  expect(terms.length).toBeGreaterThan(0);
  for (const term of terms) {
    expect(term).toBe(term.toLowerCase());
    expect(term).toBe(term.trim());
    expect(term).not.toMatch(/\s{2,}/);
    expect(term).not.toMatch(/[‘’]/);
  }
  expect(new Set(terms).size).toBe(terms.length);
}

describe('TOPICS', () => {
  it('has the 2 topics from spec §2', () => {
    expect(TOPICS.map((topic) => topic.name)).toEqual(['World War II', 'Claude Code']);
  });

  it('has unique topic IDs', () => {
    const ids = TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(TOPICS.map((topic) => [topic.name, topic.keywords] as const))(
    'has normalized keywords for %s',
    (_name, keywords) => {
      expectNormalized(keywords);
    },
  );
});

describe('BLOCKED_WORDS', () => {
  it('is normalized', () => {
    expectNormalized(BLOCKED_WORDS);
  });

  it('does not block plain "reaction"', () => {
    expect(BLOCKED_WORDS).not.toContain('reaction');
  });
});
