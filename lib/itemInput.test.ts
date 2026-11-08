import { cleanName, describeAddResult, nameKey, parseItemInput } from './itemInput';

describe('cleanName and nameKey', () => {
  it('trims and collapses spaces', () => {
    expect(cleanName('  black   holes ')).toBe('black holes');
  });

  it('compares names ignoring case', () => {
    expect(nameKey(' Black Holes')).toBe(nameKey('black holes'));
  });
});

describe('parseItemInput', () => {
  it('splits at commas, trims and drops empty values', () => {
    expect(parseItemInput(' black holes, volcanoes,, octopus , ', [])).toEqual({
      names: ['black holes', 'volcanoes', 'octopus'],
      duplicates: 0,
    });
  });

  it('skips names already in the list, ignoring case', () => {
    expect(parseItemInput('Octopus, iron', ['octopus', 'Squid'])).toEqual({
      names: ['iron'],
      duplicates: 1,
    });
  });

  it('skips a name typed twice', () => {
    expect(parseItemInput('Iron, iron, IRON', [])).toEqual({ names: ['Iron'], duplicates: 2 });
  });

  it('keeps Hebrew names', () => {
    expect(parseItemInput('חורים שחורים, תמנון', []).names).toEqual(['חורים שחורים', 'תמנון']);
  });

  it('returns nothing for empty input', () => {
    expect(parseItemInput(' , ', [])).toEqual({ names: [], duplicates: 0 });
  });
});

describe('describeAddResult', () => {
  it('says how many were added', () => {
    expect(describeAddResult(3, 0)).toBe('Added 3 topics.');
    expect(describeAddResult(1, 0)).toBe('Added 1 topic.');
  });

  it('adds how many duplicates were skipped', () => {
    expect(describeAddResult(2, 1)).toBe('Added 2 topics. Skipped 1 duplicate.');
    expect(describeAddResult(0, 2)).toBe('Added 0 topics. Skipped 2 duplicates.');
  });

  it('asks for input when nothing was typed', () => {
    expect(describeAddResult(0, 0)).toBe('Type one or more topics, separated by commas.');
  });
});
