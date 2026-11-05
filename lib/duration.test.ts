import { parseDurationSec } from './duration';

describe('parseDurationSec', () => {
  it.each([
    ['PT1M5S', 65],
    ['PT15S', 15],
    ['PT3M', 180],
    ['PT1H', 3600],
    ['PT1H2M3S', 3723],
    ['PT1H3S', 3603],
    ['PT0S', 0],
    ['P0D', 0],
    ['P1D', 86400],
    ['P1DT2H', 93600],
    ['P1W', 604800],
    ['PT90S', 90],
    ['PT10M70S', 670],
  ])('parses %s as %d seconds', (raw, expected) => {
    expect(parseDurationSec(raw)).toBe(expected);
  });

  it('ignores surrounding whitespace and letter case', () => {
    expect(parseDurationSec('  pt1m5s\n')).toBe(65);
  });

  it.each([
    ['an empty string', ''],
    ['"P" alone', 'P'],
    ['"PT" alone', 'PT'],
    ['a "T" with nothing after it', 'P1DT'],
    ['a missing "P"', 'T1M5S'],
    ['a time without "T"', 'P1M5S'],
    ['units in the wrong order', 'PT5S1M'],
    ['a repeated unit', 'PT1M1M'],
    ['a fraction', 'PT1.5S'],
    ['a negative value', 'PT-5S'],
    ['years', 'P1Y'],
    ['a clock time', '1:05'],
    ['a plain number', '65'],
  ])('rejects %s', (_label, raw) => {
    expect(parseDurationSec(raw)).toBeNull();
  });
});
