import {
  PER_ITEM,
  removeSeen,
  RESERVE_SIZE,
  selectFeed,
  sharedVideoIds,
  sortByViews,
} from './feedSelection';

type Video = { videoId: string; publishedAtMs: number; viewCount: number | null };

function v(videoId: string, viewCount: number | null, publishedAtMs = 0): Video {
  return { videoId, viewCount, publishedAtMs };
}

const ids = (list: readonly { videoId: string }[]) => list.map((x) => x.videoId);

describe('removeSeen', () => {
  it('drops watched, listed and repeated videos, keeping order', () => {
    const items = ['a', 'b', 'c', 'a', 'd', 'e'].map((videoId) => ({ videoId }));
    expect(ids(removeSeen(items, new Set(['b']), new Set(['d'])))).toEqual(['a', 'c', 'e']);
  });
});

describe('sharedVideoIds', () => {
  it('finds videos returned for more than one item', () => {
    expect(sharedVideoIds([['a', 'b'], ['b', 'c'], ['c', 'd']])).toEqual(new Set(['b', 'c']));
  });

  it('ignores repeats within one item', () => {
    expect(sharedVideoIds([['a', 'a'], ['b']])).toEqual(new Set());
  });
});

describe('sortByViews', () => {
  it('sorts by views, then newer first, then by ID', () => {
    const sorted = sortByViews([v('c', 10, 1), v('a', 50), v('b', 10, 5), v('d', null), v('e', 10, 1)]);
    expect(ids(sorted)).toEqual(['a', 'b', 'c', 'e', 'd']);
  });
});

describe('selectFeed', () => {
  it('takes the 5 most viewed per item and puts the rest in reserve', () => {
    const item1 = [1, 2, 3, 4, 5, 6, 7].map((n) => v(`a${n}`, n * 100));
    const item2 = [v('b1', 50), v('b2', 9000)];
    const { perItem, reserve } = selectFeed(new Map([[1, item1], [2, item2]]));
    expect(ids(perItem.get(1) ?? [])).toEqual(['a7', 'a6', 'a5', 'a4', 'a3']);
    expect(ids(perItem.get(2) ?? [])).toEqual(['b2', 'b1']);
    expect(ids(reserve)).toEqual(['a2', 'a1']);
  });

  it('keeps an item with no passed videos, empty', () => {
    expect(selectFeed(new Map([[3, []]])).perItem.get(3)).toEqual([]);
  });

  it('caps the reserve at 20, keeping the most viewed', () => {
    const passed = new Map(
      Array.from({ length: 10 }, (_, item) => [
        item,
        Array.from({ length: PER_ITEM + 3 }, (_, n) => v(`${item}-${n}`, item * 100 + n)),
      ]),
    );
    const { reserve } = selectFeed(passed);
    expect(reserve).toHaveLength(RESERVE_SIZE);
    expect(reserve[0].videoId).toBe('9-2');
  });
});
