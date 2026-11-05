import { findTerm, normalizeText } from './textMatch';

describe('normalizeText', () => {
  it('lowercases, straightens apostrophes and collapses whitespace', () => {
    expect(normalizeText('Shor’s  Algorithm\n\tExplained')).toBe("shor's algorithm explained");
  });
});

describe('findTerm', () => {
  it('finds a term regardless of case', () => {
    expect(findTerm('The Battle of STALINGRAD', ['stalingrad'])).toBe('stalingrad');
  });

  it('returns the first matching term in list order', () => {
    expect(findTerm('Hitler and Churchill', ['churchill', 'hitler'])).toBe('churchill');
  });

  it('returns null when nothing matches', () => {
    expect(findTerm('A puzzle about spheres', ['ww2', 'claude'])).toBeNull();
  });

  it('ignores empty terms', () => {
    expect(findTerm('anything', [''])).toBeNull();
  });

  describe('whole words', () => {
    it.each([
      ['inside a longer word', 'Nazism explained', 'nazi'],
      ['as a prefix of a plural', 'The Nazis', 'nazi'],
      ['inside a word on both sides', 'Megablitzkrieg', 'blitz'],
      ['with digits attached', 'ww22 gaming', 'ww2'],
      ['a hashtag term without its "#"', 'chain reaction', '#reaction'],
      ['a hashtag inside a longer hashtag', '#memes only', '#meme'],
    ])('does not match %s', (_label, text, term) => {
      expect(findTerm(text, [term])).toBeNull();
    });

    it.each([
      ['next to punctuation', 'D-Day: the landing', 'd-day'],
      ['before a possessive', "Claude's new feature", 'claude'],
      ['before a curly possessive', 'Hitler’s last days', 'hitler'],
      ['as a hashtag', 'Tanks #WW2 #history', 'ww2'],
      ['a multi-word phrase across a line break', 'World\nWar II in color', 'world war ii'],
      ['a term with a dot', 'Writing a CLAUDE.md file', 'claude.md'],
      ['a later occurrence after a non-match', 'Nazism and the nazi party', 'nazi'],
      ['a hashtag term', 'So funny #meme', '#meme'],
      ['at the very start and end', 'enigma', 'enigma'],
    ])('matches %s', (_label, text, term) => {
      expect(findTerm(text, [term])).toBe(term);
    });
  });

  describe('Hebrew', () => {
    it('matches a whole Hebrew word', () => {
      expect(findTerm('סיפור על היטלר', ['היטלר'])).toBe('היטלר');
    });

    it.each([
      ['one prefix letter', 'סרטון על בשואה', 'שואה'],
      ['two prefix letters', 'ובשואה נרצחו', 'שואה'],
      ['three prefix letters', 'כשהנאצים הגיעו', 'נאצים'],
      ['a prefix on a phrase', 'במלחמת העולם השנייה', 'מלחמת העולם השנייה'],
    ])('matches a term after %s', (_label, text, term) => {
      expect(findTerm(text, [term])).toBe(term);
    });

    it.each([
      ['a letter that is not a prefix', 'אשואה', 'שואה'],
      ['four prefix letters', 'ווכשהנאצים', 'נאצים'],
      ['a suffix', 'קלודי', 'קלוד'],
    ])('does not match a term with %s', (_label, text, term) => {
      expect(findTerm(text, [term])).toBeNull();
    });

    it('does not allow prefix letters before an English term', () => {
      expect(findTerm('bclaude', ['claude'])).toBeNull();
    });
  });
});
