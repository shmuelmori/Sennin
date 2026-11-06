import {
  failedBeforeStart,
  type FetchApi,
  type FetchInput,
  filterContext,
  runFetch,
  stopsFetch,
  toNewFeedItem,
} from './fetchPipeline';
import type { Channel } from './records';
import type { TopicId } from './topics';
import type { YoutubeError, YoutubeErrorKind, YoutubeResult } from './youtubeErrors';
import type { FetchedVideo } from './youtubeResponses';

const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function channel(channelId: string, topicIds: TopicId[] = ['ww2']): Channel {
  return {
    channelId,
    title: `Title ${channelId}`,
    uploadsPlaylistId: `UU${channelId}`,
    thumbnailUrl: null,
    addedAtMs: 0,
    topicIds,
  };
}

/** A Short that passes every rule, from channel "a". */
function short(videoId: string, overrides: Partial<FetchedVideo> = {}): FetchedVideo {
  return {
    videoId,
    channelId: 'a',
    channelTitle: 'Channel A',
    title: `Short ${videoId}`,
    description: '',
    publishedAtMs: NOW - 10 * DAY,
    durationSec: 45,
    embedWidth: 608,
    embedHeight: 1080,
    embeddable: true,
    viewCount: 10_000,
    liveBroadcastContent: 'none',
    hasLiveStreamingDetails: false,
    ...overrides,
  };
}

function error(kind: YoutubeErrorKind): YoutubeError {
  return { kind, status: kind === 'network' ? null : 403, message: kind };
}

function input(overrides: Partial<FetchInput> = {}): FetchInput {
  return {
    channels: [channel('a')],
    watchedIds: new Set(),
    listedIds: new Set(),
    lastFetchMs: null,
    nowMs: NOW,
    ...overrides,
  };
}

/**
 * A fake API. `uploads` maps a playlist ID to its video IDs or an error;
 * getVideos returns the known videos among the requested IDs.
 */
function fakeApi(
  uploads: Record<string, string[] | YoutubeError>,
  videos: readonly FetchedVideo[],
  videosError: YoutubeError | null = null,
) {
  const requested: string[][] = [];
  const api: FetchApi = {
    async listUploads(playlistId) {
      const value = uploads[playlistId] ?? [];
      return Array.isArray(value) ? { ok: true, value } : { ok: false, error: value };
    },
    async getVideos(ids): Promise<YoutubeResult<FetchedVideo[]>> {
      requested.push([...ids]);
      if (videosError !== null) {
        return { ok: false, error: videosError };
      }
      return { ok: true, value: videos.filter((video) => ids.includes(video.videoId)) };
    },
  };
  return { api, requested };
}

describe('stopsFetch', () => {
  it('stops on key and quota errors', () => {
    for (const kind of ['noKey', 'badKey', 'keyRestricted', 'quotaExceeded'] as const) {
      expect(stopsFetch(error(kind))).toBe(true);
    }
  });

  it('skips only the channel on other errors', () => {
    for (const kind of ['notFound', 'network', 'other'] as const) {
      expect(stopsFetch(error(kind))).toBe(false);
    }
  });
});

describe('runFetch', () => {
  it('builds the list from the passing Shorts and logs the rejected ones', async () => {
    const { api } = fakeApi({ UUa: ['s1', 'long', 's2'] }, [
      short('s1', { viewCount: 500_000 }),
      short('long', { durationSec: 600 }),
      short('s2', { viewCount: 2_000 }),
    ]);
    const outcome = await runFetch(input(), api);
    expect(outcome).toEqual({
      ok: true,
      feed: [
        { videoId: 's1', channelId: 'a', channelTitle: 'Channel A', title: 'Short s1', durationSec: 45 },
        { videoId: 's2', channelId: 'a', channelTitle: 'Channel A', title: 'Short s2', durationSec: 45 },
      ],
      reserve: [],
      rejected: [{ videoId: 'long', rule: 'length', detail: '600 s' }],
      skipped: [],
      counts: { channelsRead: 1, uploads: 3, toCheck: 3, fetched: 3 },
    });
  });

  it('drops watched, listed and repeated videos before videos.list', async () => {
    const { api, requested } = fakeApi(
      { UUa: ['w', 'l', 'x', 'shared'], UUb: ['shared', 'y'] },
      [short('x'), short('shared'), short('y')],
    );
    const outcome = await runFetch(
      input({
        channels: [channel('a'), channel('b')],
        watchedIds: new Set(['w']),
        listedIds: new Set(['l']),
      }),
      api,
    );
    expect(requested).toEqual([['x', 'shared', 'y']]);
    expect(outcome.counts).toEqual({ channelsRead: 2, uploads: 6, toCheck: 3, fetched: 3 });
  });

  it('puts videos new since the last fetch first', async () => {
    const lastFetchMs = NOW - DAY;
    const { api } = fakeApi({ UUa: ['old', 'new'] }, [
      short('old', { viewCount: 900_000 }),
      short('new', { viewCount: 1_500, publishedAtMs: NOW - DAY / 2 }),
    ]);
    const outcome = await runFetch(input({ lastFetchMs }), api);
    expect(outcome.ok && outcome.feed.map((item) => item.videoId)).toEqual(['new', 'old']);
  });

  it('gives 15 for the feed and up to 10 in reserve', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `v${i}`);
    const { api } = fakeApi(
      { UUa: ids },
      ids.map((id, i) => short(id, { viewCount: 100_000 - i })),
    );
    const outcome = await runFetch(input(), api);
    expect(outcome.ok && outcome.feed.map((item) => item.videoId)).toEqual(ids.slice(0, 15));
    expect(outcome.ok && outcome.reserve.map((item) => item.videoId)).toEqual(ids.slice(15, 25));
  });

  it('uses each channel\'s topics for the keyword rule', async () => {
    const { api } = fakeApi({ UUboth: ['plain', 'tagged'] }, [
      short('plain', { channelId: 'both', title: 'A cool fact' }),
      short('tagged', { channelId: 'both', title: 'Churchill in 1940' }),
    ]);
    const outcome = await runFetch(input({ channels: [channel('both', ['ww2', 'claude-code'])] }), api);
    expect(outcome.ok && outcome.feed.map((item) => item.videoId)).toEqual(['tagged']);
    expect(outcome.ok && outcome.rejected.map((video) => video.rule)).toEqual(['keyword']);
  });

  it('skips a channel whose uploads fail, and goes on with the rest', async () => {
    const { api } = fakeApi({ UUa: ['s1'], UUgone: error('notFound') }, [short('s1')]);
    const outcome = await runFetch(input({ channels: [channel('a'), channel('gone')] }), api);
    expect(outcome.ok).toBe(true);
    expect(outcome.skipped).toEqual([
      { channelId: 'gone', title: 'Title gone', error: error('notFound') },
    ]);
    expect(outcome.counts.channelsRead).toBe(1);
  });

  it('fails when every channel fails, with the first error', async () => {
    const { api, requested } = fakeApi({ UUa: error('network'), UUb: error('notFound') }, []);
    const outcome = await runFetch(input({ channels: [channel('a'), channel('b')] }), api);
    expect(outcome).toMatchObject({ ok: false, error: error('network') });
    expect(outcome.skipped).toHaveLength(2);
    expect(requested).toEqual([]);
  });

  it('stops on a quota error even if other channels worked', async () => {
    const { api, requested } = fakeApi({ UUa: ['s1'], UUb: error('quotaExceeded') }, [short('s1')]);
    const outcome = await runFetch(input({ channels: [channel('a'), channel('b')] }), api);
    expect(outcome).toMatchObject({ ok: false, error: error('quotaExceeded'), skipped: [] });
    expect(requested).toEqual([]);
  });

  it('fails when videos.list fails', async () => {
    const { api } = fakeApi({ UUa: ['s1'] }, [], error('quotaExceeded'));
    const outcome = await runFetch(input(), api);
    expect(outcome).toMatchObject({ ok: false, error: error('quotaExceeded') });
    expect(outcome.counts).toEqual({ channelsRead: 1, uploads: 1, toCheck: 1, fetched: 0 });
  });

  it('returns an empty list without calling videos.list when nothing is new', async () => {
    const { api, requested } = fakeApi({ UUa: ['w'] }, [short('w')]);
    const outcome = await runFetch(input({ watchedIds: new Set(['w']) }), api);
    expect(outcome).toMatchObject({ ok: true, feed: [], reserve: [], rejected: [] });
    expect(requested).toEqual([]);
  });

  it('counts videos YouTube left out as not fetched', async () => {
    const { api } = fakeApi({ UUa: ['s1', 'deleted'] }, [short('s1')]);
    const outcome = await runFetch(input(), api);
    expect(outcome.counts).toEqual({ channelsRead: 1, uploads: 2, toCheck: 2, fetched: 1 });
  });

  it('returns an empty list when there are no channels', async () => {
    const { api } = fakeApi({}, []);
    const outcome = await runFetch(input({ channels: [] }), api);
    expect(outcome).toMatchObject({ ok: true, feed: [], skipped: [] });
  });
});

describe('failedBeforeStart', () => {
  it('reports the error with zero counts', () => {
    expect(failedBeforeStart(error('noKey'))).toEqual({
      ok: false,
      error: error('noKey'),
      skipped: [],
      counts: { channelsRead: 0, uploads: 0, toCheck: 0, fetched: 0 },
    });
  });
});

describe('filterContext', () => {
  it('maps each channel to its topics', () => {
    const context = filterContext([channel('a', ['ww2']), channel('b', ['ww2', 'claude-code'])], NOW);
    expect(context.nowMs).toBe(NOW);
    expect(context.channelTopics.get('b')).toEqual(['ww2', 'claude-code']);
    expect(context.topics.map((topic) => topic.id)).toEqual(['ww2', 'claude-code']);
    expect(context.blockedWords.length).toBeGreaterThan(0);
  });
});

describe('toNewFeedItem', () => {
  it('falls back to the saved channel name when YouTube sends none', () => {
    const titles = new Map([['a', 'Saved A']]);
    expect(toNewFeedItem(short('s1', { channelTitle: '' }), titles).channelTitle).toBe('Saved A');
    expect(toNewFeedItem(short('s1'), titles).channelTitle).toBe('Channel A');
  });
});
