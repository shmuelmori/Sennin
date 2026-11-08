import { drawItems, drawWeight, MAX_WEIGHT, type Random } from './itemDraw';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 8, 20, 0, 0); // 12:00 PST

type TestItem = { id: number; removed: boolean; lastPickedAtMs: number | null };

function item(id: number, overrides: Partial<TestItem> = {}): TestItem {
  return { id, removed: false, lastPickedAtMs: null, ...overrides };
}

/** A seeded generator, so the draws repeat. */
function seeded(seed: number): Random {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

describe('drawWeight', () => {
  it('is 30 for an item never drawn', () => {
    expect(drawWeight({ lastPickedAtMs: null }, NOW)).toBe(MAX_WEIGHT);
  });

  it('is 0 for an item drawn today', () => {
    expect(drawWeight({ lastPickedAtMs: NOW - 60_000 }, NOW)).toBe(0);
  });

  it('counts Pacific days, not 24-hour periods', () => {
    // 23:30 PST yesterday is less than a day ago, but on the previous day.
    const lateYesterday = Date.UTC(2026, 10, 8, 7, 30, 0);
    expect(drawWeight({ lastPickedAtMs: lateYesterday }, NOW)).toBe(1);
  });

  it('is the number of days since, up to 30', () => {
    expect(drawWeight({ lastPickedAtMs: NOW - 7 * DAY }, NOW)).toBe(7);
    expect(drawWeight({ lastPickedAtMs: NOW - 90 * DAY }, NOW)).toBe(30);
  });

  it('is never negative', () => {
    expect(drawWeight({ lastPickedAtMs: NOW + 3 * DAY }, NOW)).toBe(0);
  });
});

describe('drawItems', () => {
  it('takes every active item when there are 20 or fewer', () => {
    const items = [item(1), item(2, { removed: true }), item(3)];
    expect(drawItems(items, NOW, Math.random).map((i) => i.id)).toEqual([1, 3]);
  });

  it('draws 20 distinct active items', () => {
    const items = Array.from({ length: 100 }, (_, n) => item(n, { removed: n % 10 === 0 }));
    const drawn = drawItems(items, NOW, seeded(7));
    expect(drawn).toHaveLength(20);
    expect(new Set(drawn.map((i) => i.id)).size).toBe(20);
    expect(drawn.every((i) => !i.removed)).toBe(true);
  });

  it('never draws an item from today while others have a weight', () => {
    const items = Array.from({ length: 40 }, (_, n) =>
      item(n, { lastPickedAtMs: n < 20 ? NOW - 1000 : null }),
    );
    for (let seed = 1; seed <= 20; seed += 1) {
      const drawn = drawItems(items, NOW, seeded(seed));
      expect(drawn.every((i) => i.id >= 20)).toBe(true);
    }
  });

  it('fills up with items from today once the others run out', () => {
    const items = Array.from({ length: 25 }, (_, n) =>
      item(n, { lastPickedAtMs: n < 10 ? null : NOW - 1000 }),
    );
    const drawn = drawItems(items, NOW, seeded(3));
    expect(drawn).toHaveLength(20);
    expect(drawn.filter((i) => i.id < 10)).toHaveLength(10);
  });

  it('favours items that waited longer', () => {
    // 21 items drawn yesterday (weight 1) and 21 never drawn (weight 30).
    const items = Array.from({ length: 42 }, (_, n) =>
      item(n, { lastPickedAtMs: n < 21 ? NOW - DAY : null }),
    );
    let fresh = 0;
    for (let seed = 1; seed <= 50; seed += 1) {
      fresh += drawItems(items, NOW, seeded(seed)).filter((i) => i.id >= 21).length;
    }
    expect(fresh / 50).toBeGreaterThan(17);
  });

  it('uses the random number to pick by weight', () => {
    const items = Array.from({ length: 3 }, (_, n) => item(n));
    expect(drawItems(items, NOW, () => 0, 1).map((i) => i.id)).toEqual([0]);
    expect(drawItems(items, NOW, () => 0.99, 1).map((i) => i.id)).toEqual([2]);
  });
});
