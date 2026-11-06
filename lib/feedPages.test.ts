import { feedPageKey, feedVideos, startPageIndex, toFeedPages } from './feedPages';
import type { FeedItem, FeedStatus } from './records';

function item(
  position: number,
  overrides: { isReserve?: boolean; status?: FeedStatus } = {},
): FeedItem {
  return {
    position,
    videoId: `video${String(position).padStart(6, '0')}`,
    channelId: 'UC123',
    channelTitle: 'Channel',
    title: `Video ${position}`,
    durationSec: 60,
    isReserve: overrides.isReserve ?? false,
    status: overrides.status ?? 'unseen',
  };
}

describe('feedVideos', () => {
  it('leaves out the reserve', () => {
    const items = [item(0), item(1), item(2, { isReserve: true }), item(3, { isReserve: true })];
    expect(feedVideos(items).map((v) => v.position)).toEqual([0, 1]);
  });

  it('leaves out skipped videos but keeps watched ones', () => {
    const items = [item(0, { status: 'watched' }), item(1, { status: 'skipped' }), item(2)];
    expect(feedVideos(items).map((v) => v.position)).toEqual([0, 2]);
  });

  it('sorts by position', () => {
    expect(feedVideos([item(2), item(0), item(1)]).map((v) => v.position)).toEqual([0, 1, 2]);
  });

  it('returns an empty list for no items', () => {
    expect(feedVideos([])).toEqual([]);
  });
});

describe('toFeedPages', () => {
  it('has one page per video, then the end page', () => {
    const videos = [item(0), item(1)];
    expect(toFeedPages(videos)).toEqual([
      { kind: 'video', item: videos[0] },
      { kind: 'video', item: videos[1] },
      { kind: 'end' },
    ]);
  });

  it('has only the end page for no videos', () => {
    expect(toFeedPages([])).toEqual([{ kind: 'end' }]);
  });
});

describe('startPageIndex', () => {
  it('starts at the first video for a new list', () => {
    expect(startPageIndex([item(0), item(1), item(2)])).toBe(0);
  });

  it('starts at the first video not yet watched', () => {
    const videos = [item(0, { status: 'watched' }), item(1, { status: 'watched' }), item(2)];
    expect(startPageIndex(videos)).toBe(2);
  });

  it('starts at an unwatched video even if a later one was watched', () => {
    const videos = [item(0, { status: 'watched' }), item(1), item(2, { status: 'watched' })];
    expect(startPageIndex(videos)).toBe(1);
  });

  it('starts at the end page when every video was watched', () => {
    const videos = [item(0, { status: 'watched' }), item(1, { status: 'watched' })];
    expect(startPageIndex(videos)).toBe(2);
  });

  it('starts at the end page for no videos', () => {
    expect(startPageIndex([])).toBe(0);
  });
});

describe('feedPageKey', () => {
  it('gives each video page its own key and the end page a fixed one', () => {
    const pages = toFeedPages([item(0), item(1)]);
    const keys = pages.map(feedPageKey);
    expect(new Set(keys).size).toBe(3);
    expect(keys[2]).toBe('end');
  });
});
