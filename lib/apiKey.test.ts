import { checkApiKey } from './apiKey';

// Built at runtime so secret scanners don't flag a key-shaped literal.
const FAKE_KEY = 'AIza' + 'x'.repeat(35);

describe('checkApiKey', () => {
  it('accepts a well-formed key', () => {
    expect(checkApiKey(FAKE_KEY)).toEqual({ ok: true, key: FAKE_KEY });
  });

  it('accepts "-" and "_" in the key', () => {
    const key = 'AIza' + 'a-b_'.repeat(8) + 'c-d';
    expect(checkApiKey(key)).toEqual({ ok: true, key });
  });

  it('trims surrounding whitespace', () => {
    expect(checkApiKey(`  ${FAKE_KEY}\n`)).toEqual({ ok: true, key: FAKE_KEY });
  });

  it.each([undefined, '', '   '])('reports %p as missing', (raw) => {
    expect(checkApiKey(raw)).toEqual({ ok: false, reason: 'missing' });
  });

  it.each([
    ['a wrong prefix', 'BIza' + 'x'.repeat(35)],
    ['a key that is too short', 'AIza' + 'x'.repeat(34)],
    ['a key that is too long', 'AIza' + 'x'.repeat(36)],
    ['quotes left in the value', `"${FAKE_KEY}"`],
    ['a space inside the key', 'AIza' + 'x'.repeat(17) + ' ' + 'x'.repeat(17)],
    ['placeholder text', 'your-key-here'],
  ])('reports %s as malformed', (_label, raw) => {
    expect(checkApiKey(raw)).toEqual({ ok: false, reason: 'malformed' });
  });
});
