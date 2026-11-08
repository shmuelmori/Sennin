import { adjacentRepeats, spreadByGroup } from './feedShuffle';
import type { Random } from './itemDraw';

type Video = { videoId: string; itemId: number };
const groupOf = (video: Video) => video.itemId;

function seeded(seed: number): Random {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

/** `perItem[i]` videos for item i. */
function videos(perItem: number[]): Video[] {
  return perItem.flatMap((count, itemId) =>
    Array.from({ length: count }, (_, n) => ({ videoId: `${itemId}-${n}`, itemId })),
  );
}

function sortedIds(list: readonly Video[]): string[] {
  return list.map((v) => v.videoId).sort();
}

describe('spreadByGroup', () => {
  it('keeps every video exactly once', () => {
    const input = videos([5, 5, 3, 1]);
    expect(sortedIds(spreadByGroup(input, groupOf, seeded(1)))).toEqual(sortedIds(input));
  });

  it('never puts two videos of an item in a row for a full fetch (20 × 5)', () => {
    const input = videos(Array.from({ length: 20 }, () => 5));
    for (let seed = 1; seed <= 30; seed += 1) {
      expect(adjacentRepeats(spreadByGroup(input, groupOf, seeded(seed)), groupOf)).toBe(0);
    }
  });

  it('spreads uneven counts when it is possible', () => {
    // 5 + 4 = 9 others for item 0's 5 videos: possible.
    const input = videos([5, 2, 2]);
    for (let seed = 1; seed <= 30; seed += 1) {
      expect(adjacentRepeats(spreadByGroup(input, groupOf, seeded(seed)), groupOf)).toBe(0);
    }
  });

  it('handles the tight case of n + 1 against n', () => {
    const input = videos([3, 2]);
    const order = spreadByGroup(input, groupOf, seeded(5)).map(groupOf);
    expect(order).toEqual([0, 1, 0, 1, 0]);
  });

  it('keeps the repeats to a minimum when spreading is impossible', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const order = spreadByGroup(videos([5, 1]), groupOf, seeded(seed));
      // Best possible: 0 1 0 0 0 0, 3 repeats.
      expect(order.map(groupOf)).toEqual([0, 1, 0, 0, 0, 0]);
    }
  });

  it('handles a single item and an empty list', () => {
    expect(spreadByGroup(videos([3]), groupOf, seeded(1))).toHaveLength(3);
    expect(spreadByGroup([], groupOf, seeded(1))).toEqual([]);
  });

  it('gives different orders for different random numbers', () => {
    const input = videos([5, 5, 5, 5]);
    const a = spreadByGroup(input, groupOf, seeded(1)).map((v) => v.videoId);
    const b = spreadByGroup(input, groupOf, seeded(99)).map((v) => v.videoId);
    expect(a).not.toEqual(b);
  });
});

describe('adjacentRepeats', () => {
  it('counts neighbours with the same group', () => {
    expect(adjacentRepeats(videos([2, 1]), groupOf)).toBe(1);
    expect(adjacentRepeats([], groupOf)).toBe(0);
  });
});
