import { BLOCKED_WORDS } from './blockedWords';

describe('BLOCKED_WORDS', () => {
  it('is normalized, as lib/textMatch.ts expects', () => {
    expect(BLOCKED_WORDS.length).toBeGreaterThan(0);
    for (const term of BLOCKED_WORDS) {
      expect(term).toBe(term.toLowerCase());
      expect(term).toBe(term.trim());
      expect(term).not.toMatch(/\s{2,}/);
      expect(term).not.toMatch(/[‘’]/);
    }
    expect(new Set(BLOCKED_WORDS).size).toBe(BLOCKED_WORDS.length);
  });

  it('does not block plain "reaction"', () => {
    expect(BLOCKED_WORDS).not.toContain('reaction');
  });
});
