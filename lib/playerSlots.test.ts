import { assignSlots, PLAYER_SLOTS, playerWindow } from './playerSlots';

describe('playerWindow', () => {
  it('covers the current page and one neighbor on each side', () => {
    expect(playerWindow(4, 15)).toEqual([3, 4, 5]);
  });

  it('shifts inward at the start of the list', () => {
    expect(playerWindow(0, 15)).toEqual([0, 1, 2]);
    expect(playerWindow(1, 15)).toEqual([0, 1, 2]);
  });

  it('shifts inward at the end of the list and on the end page', () => {
    expect(playerWindow(14, 15)).toEqual([12, 13, 14]);
    expect(playerWindow(15, 15)).toEqual([12, 13, 14]);
  });

  it('covers every video when there are fewer videos than players', () => {
    expect(playerWindow(0, 2)).toEqual([0, 1]);
    expect(playerWindow(2, 2)).toEqual([0, 1]);
    expect(playerWindow(0, 1)).toEqual([0]);
  });

  it('is empty for no videos, no players or a bad index', () => {
    expect(playerWindow(0, 0)).toEqual([]);
    expect(playerWindow(0, 15, 0)).toEqual([]);
    expect(playerWindow(Number.NaN, 15)).toEqual([]);
  });

  it('clamps an index outside the list', () => {
    expect(playerWindow(-5, 15)).toEqual([0, 1, 2]);
    expect(playerWindow(99, 15)).toEqual([12, 13, 14]);
  });

  it('works with another number of players', () => {
    expect(playerWindow(4, 15, 5)).toEqual([2, 3, 4, 5, 6]);
    expect(playerWindow(4, 15, 1)).toEqual([4]);
  });
});

describe('assignSlots', () => {
  it('gives page p the slot p % 3, sorted by slot', () => {
    expect(assignSlots(4, 15)).toEqual([
      { slot: 0, pageIndex: 3 },
      { slot: 1, pageIndex: 4 },
      { slot: 2, pageIndex: 5 },
    ]);
    expect(assignSlots(5, 15)).toEqual([
      { slot: 0, pageIndex: 6 },
      { slot: 1, pageIndex: 4 },
      { slot: 2, pageIndex: 5 },
    ]);
  });

  it('moves only one player per one-page step, in both directions', () => {
    for (let current = 0; current < 15; current += 1) {
      for (const next of [current - 1, current + 1]) {
        if (next < 0 || next > 15) continue;
        const before = assignSlots(current, 15);
        const after = assignSlots(next, 15);
        const moved = after.filter(
          (a) => before.find((b) => b.slot === a.slot)?.pageIndex !== a.pageIndex,
        );
        expect(moved.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('never uses more than PLAYER_SLOTS players or the same slot twice', () => {
    for (let current = 0; current <= 15; current += 1) {
      const slots = assignSlots(current, 15).map((a) => a.slot);
      expect(slots.length).toBeLessThanOrEqual(PLAYER_SLOTS);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });

  it('is empty for no videos', () => {
    expect(assignSlots(0, 0)).toEqual([]);
  });
});
