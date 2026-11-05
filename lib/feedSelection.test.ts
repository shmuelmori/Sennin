import { FEED_SIZE, RESERVE_SIZE, removeSeen, selectFeed, sortForFeed } from './feedSelection';

const LAST_FETCH = Date.UTC(2026, 10, 5, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

type Item = { videoId: string; publishedAtMs: number; viewCount: number | null };

function item(videoId: string, daysAfterLastFetch: number, viewCount: number | null): Item {
  return { videoId, publishedAtMs: LAST_FETCH + daysAfterLastFetch * DAY, viewCount };
}

function ids(items: readonly { videoId: string }[]): string[] {
  return items.map((i) => i.videoId);
}

describe('removeSeen', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((videoId) => ({ videoId }));

  it('drops watched videos and videos already in the list', () => {
    expect(ids(removeSeen(items, new Set(['b']), new Set(['d'])))).toEqual(['a', 'c', 'e']);
  });

  it('drops repeats and keeps the first one', () => {
    const repeated = [{ videoId: 'a', n: 1 }, { videoId: 'b', n: 2 }, { videoId: 'a', n: 3 }];
    expect(removeSeen(repeated, new Set(), new Set())).toEqual([
      { videoId: 'a', n: 1 },
      { videoId: 'b', n: 2 },
    ]);
  });

  it('keeps everything when nothing was seen', () => {
    expect(ids(removeSeen(items, new Set(), new Set()))).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('sortForFeed', () => {
  it('puts new videos first, each group by views', () => {
    const videos = [
      item('oldPopular', -10, 900_000),
      item('newQuiet', 1, 200),
      item('oldQuiet', -3, 5_000),
      item('newPopular', 0.5, 40_000),
    ];
    expect(ids(sortForFeed(videos, LAST_FETCH))).toEqual([
      'newPopular',
      'newQuiet',
      'oldPopular',
      'oldQuiet',
    ]);
  });

  it('counts a video published exactly at the last fetch as old', () => {
    const videos = [item('atFetch', 0, 900_000), item('after', 0.1, 10)];
    expect(ids(sortForFeed(videos, LAST_FETCH))).toEqual(['after', 'atFetch']);
  });

  it('sorts by views only when there was no previous fetch', () => {
    const videos = [item('a', -10, 10), item('b', 1, 30), item('c', -1, 20)];
    expect(ids(sortForFeed(videos, null))).toEqual(['b', 'c', 'a']);
  });

  it('treats hidden views as 0', () => {
    const videos = [item('hidden', -1, null), item('some', -1, 5)];
    expect(ids(sortForFeed(videos, LAST_FETCH))).toEqual(['some', 'hidden']);
  });

  it('breaks ties by the newer video, then by ID', () => {
    const videos = [item('z', -2, 100), item('y', -1, 100), item('b', -1, 100), item('a', -1, 100)];
    expect(ids(sortForFeed(videos, LAST_FETCH))).toEqual(['a', 'b', 'y', 'z']);
  });

  it('does not change the input', () => {
    const videos = [item('a', -1, 1), item('b', -1, 2)];
    sortForFeed(videos, LAST_FETCH);
    expect(ids(videos)).toEqual(['a', 'b']);
  });
});

describe('selectFeed', () => {
  const sorted = Array.from({ length: 40 }, (_, i) => `v${i}`);

  it('takes 15 for the feed and the next 10 as reserve', () => {
    const { feed, reserve } = selectFeed(sorted);
    expect(feed).toEqual(sorted.slice(0, 15));
    expect(reserve).toEqual(sorted.slice(15, 25));
    expect(FEED_SIZE).toBe(15);
    expect(RESERVE_SIZE).toBe(10);
  });

  it('gives a shorter reserve when there are fewer than 25 videos', () => {
    const { feed, reserve } = selectFeed(sorted.slice(0, 18));
    expect(feed).toHaveLength(15);
    expect(reserve).toEqual(['v15', 'v16', 'v17']);
  });

  it('gives a shorter feed and no reserve when there are fewer than 15', () => {
    expect(selectFeed(sorted.slice(0, 4))).toEqual({ feed: ['v0', 'v1', 'v2', 'v3'], reserve: [] });
  });

  it('fills the feed with older videos when there are few new ones', () => {
    const videos = [
      item('new1', 1, 10),
      item('new2', 1, 20),
      ...Array.from({ length: 20 }, (_, i) => item(`old${i}`, -5, 1000 - i)),
    ];
    const { feed, reserve } = selectFeed(sortForFeed(videos, LAST_FETCH));
    expect(ids(feed).slice(0, 3)).toEqual(['new2', 'new1', 'old0']);
    expect(feed).toHaveLength(15);
    expect(reserve).toHaveLength(7);
  });
});
