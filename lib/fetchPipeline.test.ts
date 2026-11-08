import { adjacentRepeats } from './feedShuffle';
import {
  failedBeforeStart,
  type FetchApi,
  type FetchInput,
  runFetch,
  SEARCH_BATCH,
  stopsFetch,
  toNewFeedItem,
} from './fetchPipeline';
import type { Item } from './records';
import type { ItemSearch } from './searchQuery';
import type { YoutubeError, YoutubeErrorKind, YoutubeResult } from './youtubeErrors';
import type { FetchedVideo } from './youtubeResponses';

const NOW = Date.UTC(2026, 10, 8, 20, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function item(id: number, name: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    name,
    query: name.toLowerCase(),
    removed: false,
    removedAtMs: null,
    lastPickedAtMs: null,
    pickCount: 0,
    createdAtMs: 0,
    ...overrides,
  };
}

/** A Short that passes every rule for a query containing `word`. */
function short(videoId: string, word: string, overrides: Partial<FetchedVideo> = {}): FetchedVideo {
  return {
    videoId,
    channelId: 'chan',
    channelTitle: 'Channel',
    title: `All about the ${word}`,
    description: '',
    tags: [],
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

function input(items: Item[], overrides: Partial<FetchInput> = {}): FetchInput {
  return {
    items,
    watchedIds: new Set(),
    listedIds: new Set(),
    nowMs: NOW,
    random: () => 0.5,
    ...overrides,
  };
}

/**
 * A fake API. `searches` maps the first word of q (the item's query) to its
 * video IDs or an error; getVideos returns the known videos among the IDs.
 */
function fakeApi(
  searches: Record<string, string[] | YoutubeError>,
  videos: readonly FetchedVideo[],
  videosError: YoutubeError | null = null,
) {
  const sent: ItemSearch[] = [];
  const requested: string[][] = [];
  const api: FetchApi = {
    async searchShorts(search): Promise<YoutubeResult<string[]>> {
      sent.push(search);
      const answer = searches[search.q.split(' ')[0]] ?? [];
      return Array.isArray(answer) ? { ok: true, value: answer } : { ok: false, error: answer };
    },
    async getVideos(ids): Promise<YoutubeResult<FetchedVideo[]>> {
      requested.push([...ids]);
      if (videosError) return { ok: false, error: videosError };
      return { ok: true, value: videos.filter((video) => ids.includes(video.videoId)) };
    },
  };
  return { api, sent, requested };
}

describe('runFetch', () => {
  it('searches each active item once, with its suffix and order', async () => {
    const { api, sent } = fakeApi({}, []);
    const items = [item(1, 'Octopus', { pickCount: 1 }), item(2, 'Iron'), item(3, 'Gone', { removed: true })];
    const outcome = await runFetch(input(items), api);
    expect(sent).toEqual([
      { q: 'octopus facts', order: 'viewCount' },
      { q: 'iron explained', order: 'relevance' },
    ]);
    expect(outcome.drawn.map((i) => i.id)).toEqual([1, 2]);
  });

  it('draws at most 20 items out of many', async () => {
    const items = Array.from({ length: 50 }, (_, n) => item(n + 1, `Thing${n}`));
    const { api, sent } = fakeApi({}, []);
    const outcome = await runFetch(input(items, { random: Math.random }), api);
    expect(sent).toHaveLength(20);
    expect(outcome.counts.drawn).toBe(20);
  });

  it('takes the 5 most viewed per item, puts the rest in reserve and reports per item', async () => {
    const octo = Array.from({ length: 7 }, (_, n) => short(`o${n}`, 'octopus', { viewCount: 1000 + n }));
    const iron = [short('i0', 'iron'), short('i1', 'iron')];
    const { api } = fakeApi(
      { octopus: octo.map((v) => v.videoId), iron: ['i0', 'i1'] },
      [...octo, ...iron],
    );
    const outcome = await runFetch(input([item(1, 'Octopus'), item(2, 'Iron')]), api);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.feed).toHaveLength(7);
    expect(outcome.feed.filter((v) => v.itemId === 1).map((v) => v.videoId).sort()).toEqual(
      ['o2', 'o3', 'o4', 'o5', 'o6'],
    );
    expect(outcome.reserve.map((v) => v.videoId)).toEqual(['o1', 'o0']);
    expect(outcome.feed[0]).toMatchObject({ itemName: expect.any(String), durationSec: 45 });
    expect(outcome.reports).toEqual([
      { itemId: 1, name: 'Octopus', results: 7, passed: 7, selected: 5, error: null },
      { itemId: 2, name: 'Iron', results: 2, passed: 2, selected: 2, error: null },
    ]);
    expect(outcome.counts).toEqual({ drawn: 2, results: 9, toCheck: 9, fetched: 9, passed: 9 });
  });

  it('never puts two videos of one item in a row', async () => {
    const words = ['ant', 'bee', 'cat', 'dog'];
    const videos = words.flatMap((word) => [0, 1, 2, 3, 4].map((n) => short(`${word}${n}`, word)));
    const searches = Object.fromEntries(
      words.map((word) => [word, [0, 1, 2, 3, 4].map((n) => `${word}${n}`)]),
    );
    const { api } = fakeApi(searches, videos);
    const items = words.map((word, n) => item(n + 1, word));
    const outcome = await runFetch(input(items, { random: Math.random }), api);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.feed).toHaveLength(20);
    expect(adjacentRepeats(outcome.feed, (v) => v.itemId)).toBe(0);
  });

  it('drops watched, listed and shared videos before videos.list', async () => {
    const { api, requested } = fakeApi(
      { octopus: ['w', 'l', 'both', 'o1'], squid: ['both', 's1'] },
      [short('o1', 'octopus'), short('s1', 'squid')],
    );
    const outcome = await runFetch(
      input([item(1, 'Octopus'), item(2, 'Squid')], {
        watchedIds: new Set(['w']),
        listedIds: new Set(['l']),
      }),
      api,
    );
    expect(requested).toEqual([['o1', 's1']]);
    expect(outcome.counts).toMatchObject({ results: 6, toCheck: 2 });
  });

  it('applies the query match rule with each video’s own item', async () => {
    const { api } = fakeApi(
      { octopus: ['good', 'bad'] },
      [short('good', 'octopus'), short('bad', 'volcano')],
    );
    const outcome = await runFetch(input([item(1, 'Octopus')]), api);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.feed.map((v) => v.videoId)).toEqual(['good']);
    expect(outcome.rejected).toEqual([
      { videoId: 'bad', rule: 'queryMatch', detail: 'no word from "octopus"' },
    ]);
  });

  it('keeps an item with no results, and skips videos.list when nothing is left', async () => {
    const { api, requested } = fakeApi({}, []);
    const outcome = await runFetch(input([item(1, 'Octopus')]), api);
    expect(outcome.ok).toBe(true);
    expect(requested).toEqual([]);
    expect(outcome.reports[0]).toMatchObject({ results: 0, selected: 0 });
  });

  it('skips an item whose search fails, and goes on', async () => {
    const { api } = fakeApi(
      { octopus: error('other'), iron: ['i0'] },
      [short('i0', 'iron')],
    );
    const outcome = await runFetch(input([item(1, 'Octopus'), item(2, 'Iron')]), api);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.skipped).toEqual([{ itemId: 1, name: 'Octopus', error: error('other') }]);
    expect(outcome.reports[0].error).toBe('other');
    expect(outcome.feed.map((v) => v.videoId)).toEqual(['i0']);
  });

  it('fails when every search fails', async () => {
    const { api } = fakeApi({ octopus: error('network') }, []);
    const outcome = await runFetch(input([item(1, 'Octopus')]), api);
    expect(outcome).toMatchObject({ ok: false, error: error('network') });
  });

  it.each<YoutubeErrorKind>(['quotaExceeded', 'badKey'])(
    'stops at a %s error without sending the remaining searches',
    async (kind) => {
      const items = Array.from({ length: 12 }, (_, n) => item(n + 1, `thing${n}`));
      const { api, sent, requested } = fakeApi({ thing0: error(kind) }, []);
      const outcome = await runFetch(input(items), api);
      expect(outcome).toMatchObject({ ok: false, error: error(kind) });
      expect(sent).toHaveLength(SEARCH_BATCH);
      expect(requested).toEqual([]);
    },
  );

  it('fails when videos.list fails', async () => {
    const { api } = fakeApi({ octopus: ['o1'] }, [], error('quotaExceeded'));
    const outcome = await runFetch(input([item(1, 'Octopus')]), api);
    expect(outcome).toMatchObject({ ok: false, error: error('quotaExceeded') });
    expect(outcome.reports[0].results).toBe(1);
  });
});

describe('stopsFetch', () => {
  it('stops on key and quota errors only', () => {
    expect(stopsFetch(error('quotaExceeded'))).toBe(true);
    expect(stopsFetch(error('noKey'))).toBe(true);
    expect(stopsFetch(error('network'))).toBe(false);
    expect(stopsFetch(error('notFound'))).toBe(false);
  });
});

describe('failedBeforeStart', () => {
  it('reports the error with nothing drawn', () => {
    expect(failedBeforeStart(error('noKey'))).toMatchObject({ ok: false, drawn: [], reports: [] });
  });
});

describe('toNewFeedItem', () => {
  it('keeps the item id and name with the video', () => {
    expect(toNewFeedItem(short('x', 'octopus'), { id: 4, name: 'Octopus' })).toEqual({
      videoId: 'x',
      itemId: 4,
      itemName: 'Octopus',
      title: 'All about the octopus',
      durationSec: 45,
    });
  });
});
