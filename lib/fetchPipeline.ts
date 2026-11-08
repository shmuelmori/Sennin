// The fetch process from spec §5 (F4, F5, F6): draw 20 items → one
// search.list per item → drop watched, listed and shared videos →
// videos.list → filter → up to 5 per item by views, plus a reserve of up to
// 20 → shuffle so no two videos of one item are adjacent.
// The YouTube calls and the random numbers are passed in, so this file has
// no network or DB imports and can be tested with fakes. hooks/useRefresh.ts
// reads and saves the data.

import { BLOCKED_WORDS } from './blockedWords';
import { removeSeen, selectFeed, sharedVideoIds } from './feedSelection';
import { spreadByGroup } from './feedShuffle';
import { applyFilters, type RejectedVideo, type VideoQuery } from './filterRules';
import { drawItems, type Random } from './itemDraw';
import type { Item, ItemReport, NewFeedItem } from './records';
import { itemSearch, queryTerms, type ItemSearch } from './searchQuery';
import type { YoutubeError, YoutubeErrorKind, YoutubeResult } from './youtubeErrors';
import { chunk } from './youtubeRequests';
import type { FetchedVideo } from './youtubeResponses';

/** The YouTube calls a fetch makes. The client from services/youtube.ts provides them. */
export type FetchApi = {
  searchShorts(search: ItemSearch): Promise<YoutubeResult<string[]>>;
  getVideos(videoIds: readonly string[]): Promise<YoutubeResult<FetchedVideo[]>>;
};

export type FetchInput = {
  /** Every item, removed ones included; the draw leaves those out. */
  items: readonly Item[];
  watchedIds: ReadonlySet<string>;
  /** Every video in the current list, feed and reserve. */
  listedIds: ReadonlySet<string>;
  nowMs: number;
  random: Random;
};

/** A drawn item whose search failed. The fetch goes on without it. */
export type SkippedItem = { itemId: number; name: string; error: YoutubeError };

export type FetchCounts = {
  /** Items drawn. */
  drawn: number;
  /** Video IDs from search.list, all items together. */
  results: number;
  /** IDs left after dropping watched, listed and shared videos. */
  toCheck: number;
  /** Videos videos.list returned, and the filters checked. Private and deleted ones are missing. */
  fetched: number;
  /** Videos that passed every rule. */
  passed: number;
};

type Shared = {
  /** The items the draw picked, in draw order. */
  drawn: Item[];
  /** One per drawn item, in draw order. */
  reports: ItemReport[];
  skipped: SkippedItem[];
  counts: FetchCounts;
};

export type FetchOutcome =
  | (Shared & {
      ok: true;
      feed: NewFeedItem[];
      reserve: NewFeedItem[];
      /** Each rejected video with the first rule that rejected it (F5). */
      rejected: RejectedVideo[];
    })
  | (Shared & { ok: false; error: YoutubeError });

/** How many searches are sent at once. Small, so a quota error stops the rest. */
export const SEARCH_BATCH = 5;

const NO_COUNTS: FetchCounts = { drawn: 0, results: 0, toCheck: 0, fetched: 0, passed: 0 };

/**
 * Errors that hit every request the same way: the key, or today's quota.
 * Any other error is about one item's search, so only that item is skipped.
 */
const STOPS_FETCH: ReadonlySet<YoutubeErrorKind> = new Set<YoutubeErrorKind>([
  'noKey',
  'badKey',
  'keyRestricted',
  'quotaExceeded',
]);

export function stopsFetch(error: YoutubeError): boolean {
  return STOPS_FETCH.has(error.kind);
}

/** A fetch that failed before sending anything, e.g. because the API key is missing. */
export function failedBeforeStart(error: YoutubeError): FetchOutcome {
  return { ok: false, error, drawn: [], reports: [], skipped: [], counts: { ...NO_COUNTS } };
}

/**
 * The row saved in feed_item. Only videos that passed the length rule get
 * here, so the duration is known.
 */
export function toNewFeedItem(video: FetchedVideo, item: Pick<Item, 'id' | 'name'>): NewFeedItem {
  return {
    videoId: video.videoId,
    itemId: item.id,
    itemName: item.name,
    title: video.title,
    durationSec: video.durationSec ?? 0,
  };
}

type Searches =
  | { ok: true; results: Map<number, string[]>; skipped: SkippedItem[] }
  | { ok: false; error: YoutubeError; skipped: SkippedItem[] };

/** §5 step 2: one search per item, SEARCH_BATCH at a time. Stops at a key or quota error. */
async function searchItems(drawn: readonly Item[], api: FetchApi): Promise<Searches> {
  const results = new Map<number, string[]>();
  const skipped: SkippedItem[] = [];
  for (const batch of chunk(drawn, SEARCH_BATCH)) {
    const answers = await Promise.all(
      batch.map((item) => api.searchShorts(itemSearch(item.query, item.pickCount))),
    );
    for (const [index, answer] of answers.entries()) {
      const item = batch[index];
      if (answer.ok) {
        results.set(item.id, answer.value);
      } else if (stopsFetch(answer.error)) {
        return { ok: false, error: answer.error, skipped };
      } else {
        skipped.push({ itemId: item.id, name: item.name, error: answer.error });
      }
    }
  }
  // Every search failed, e.g. with no network: that's a failed fetch, not an empty one.
  if (results.size === 0 && skipped.length > 0) {
    return { ok: false, error: skipped[0].error, skipped };
  }
  return { ok: true, results, skipped };
}

/** Per-item counts, keyed by itemId. */
type Tally = ReadonlyMap<number, number>;

/** One report per drawn item, in draw order (§4 Status). */
function buildReports(
  drawn: readonly Item[],
  results: ReadonlyMap<number, readonly string[]>,
  skipped: readonly SkippedItem[],
  passed: Tally = new Map(),
  selected: Tally = new Map(),
): ItemReport[] {
  const errors = new Map(skipped.map((skip) => [skip.itemId, skip.error.message]));
  return drawn.map((item) => ({
    itemId: item.id,
    name: item.name,
    results: results.get(item.id)?.length ?? 0,
    passed: passed.get(item.id) ?? 0,
    selected: selected.get(item.id) ?? 0,
    error: errors.get(item.id) ?? null,
  }));
}

/**
 * §5 step 3: which item each video to check came from, without watched,
 * listed and shared videos.
 */
function videosToCheck(
  drawn: readonly Item[],
  results: ReadonlyMap<number, readonly string[]>,
  input: FetchInput,
): Map<string, Item> {
  const shared = sharedVideoIds([...results.values()]);
  const itemOf = new Map<string, Item>();
  for (const item of drawn) {
    const ids = (results.get(item.id) ?? []).map((videoId) => ({ videoId }));
    for (const { videoId } of removeSeen(ids, input.watchedIds, input.listedIds)) {
      if (!shared.has(videoId)) itemOf.set(videoId, item);
    }
  }
  return itemOf;
}

/** Runs the whole §5 process. Never throws for YouTube errors: they come back in the outcome. */
export async function runFetch(input: FetchInput, api: FetchApi): Promise<FetchOutcome> {
  const drawn = drawItems(input.items, input.nowMs, input.random);
  const counts: FetchCounts = { ...NO_COUNTS, drawn: drawn.length };
  const searches = await searchItems(drawn, api);
  if (!searches.ok) {
    const { error, skipped } = searches;
    const reports = buildReports(drawn, new Map(), skipped);
    return { ok: false, error, drawn, reports, skipped, counts };
  }
  const { results, skipped } = searches;

  // Before videos.list, so dropped videos cost no units.
  const itemOf = videosToCheck(drawn, results, input);
  counts.results = [...results.values()].reduce((sum, ids) => sum + ids.length, 0);
  counts.toCheck = itemOf.size;
  if (itemOf.size === 0) {
    const reports = buildReports(drawn, results, skipped);
    return { ok: true, feed: [], reserve: [], rejected: [], drawn, reports, skipped, counts };
  }

  // §5 step 4: videos.list in batches of 50.
  const videos = await api.getVideos([...itemOf.keys()]);
  if (!videos.ok) {
    const reports = buildReports(drawn, results, skipped);
    return { ok: false, error: videos.error, drawn, reports, skipped, counts };
  }
  counts.fetched = videos.value.length;

  // §5 step 5: the rules, with each video's own item query for the query match.
  const queries = new Map<string, VideoQuery>();
  for (const [videoId, item] of itemOf) {
    queries.set(videoId, { query: item.query, terms: queryTerms(item.query) });
  }
  const { passed, rejected } = applyFilters(videos.value, {
    nowMs: input.nowMs,
    queries,
    blockedWords: BLOCKED_WORDS,
  });
  counts.passed = passed.length;

  // §5 step 6: up to 5 per item and the reserve, then the no-repeat shuffle.
  const passedPerItem = new Map<number, FetchedVideo[]>(drawn.map((item) => [item.id, []]));
  for (const video of passed) {
    const item = itemOf.get(video.videoId);
    if (item !== undefined) passedPerItem.get(item.id)?.push(video);
  }
  const selection = selectFeed(passedPerItem);
  const toItem = (video: FetchedVideo): NewFeedItem => {
    const item = itemOf.get(video.videoId);
    return toNewFeedItem(video, item ?? { id: 0, name: '' });
  };
  const selected = [...selection.perItem.values()].flat().map(toItem);
  const feed = spreadByGroup(selected, (video) => video.itemId, input.random);
  const lengths = (map: ReadonlyMap<number, readonly unknown[]>): Tally =>
    new Map([...map].map(([itemId, list]) => [itemId, list.length]));
  const reports = buildReports(
    drawn,
    results,
    skipped,
    lengths(passedPerItem),
    lengths(selection.perItem),
  );
  const reserve = selection.reserve.map(toItem);
  return { ok: true, feed, reserve, rejected, drawn, reports, skipped, counts };
}
