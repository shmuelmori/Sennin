// The fetch process from spec §5 (F4, F5, F6): the latest uploads of each
// channel → drop watched and listed videos → videos.list → filter → sort →
// 15 for the feed plus up to 10 in reserve.
// The YouTube calls are passed in, so this file has no network or DB imports
// and can be tested with fakes. hooks/useRefresh.ts reads and saves the data.

import { removeSeen, selectFeed, sortForFeed } from './feedSelection';
import { applyFilters, type FilterContext, type RejectedVideo } from './filterRules';
import type { Channel, NewFeedItem } from './records';
import { BLOCKED_WORDS, TOPICS } from './topics';
import type { YoutubeError, YoutubeErrorKind, YoutubeResult } from './youtubeErrors';
import type { FetchedVideo } from './youtubeResponses';

/** The YouTube calls a fetch makes. The client from services/youtube.ts provides them. */
export type FetchApi = {
  listUploads(uploadsPlaylistId: string): Promise<YoutubeResult<string[]>>;
  getVideos(videoIds: readonly string[]): Promise<YoutubeResult<FetchedVideo[]>>;
};

export type FetchInput = {
  channels: readonly Channel[];
  watchedIds: ReadonlySet<string>;
  /** Every video in the current list, feed and reserve. */
  listedIds: ReadonlySet<string>;
  /** When the last completed fetch started, or null if there was none (§5 step 5). */
  lastFetchMs: number | null;
  nowMs: number;
};

/** A channel whose uploads couldn't be read. The fetch goes on without it. */
export type SkippedChannel = { channelId: string; title: string; error: YoutubeError };

export type FetchCounts = {
  /** Channels whose uploads were read. */
  channelsRead: number;
  /** Video IDs from playlistItems.list, all channels together. */
  uploads: number;
  /** Uploads left after dropping watched, listed and repeated videos. */
  toCheck: number;
  /** Videos videos.list returned, and the filters checked. Private and deleted ones are missing. */
  fetched: number;
};

export type FetchOutcome =
  | {
      ok: true;
      feed: NewFeedItem[];
      reserve: NewFeedItem[];
      /** Each rejected video with the first rule that rejected it (F5). */
      rejected: RejectedVideo[];
      skipped: SkippedChannel[];
      counts: FetchCounts;
    }
  | { ok: false; error: YoutubeError; skipped: SkippedChannel[]; counts: FetchCounts };

const NO_COUNTS: FetchCounts = { channelsRead: 0, uploads: 0, toCheck: 0, fetched: 0 };

/**
 * Errors that hit every request the same way: the key, or today's quota.
 * Any other error is about one channel's playlist, so only that channel is skipped.
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
  return { ok: false, error, skipped: [], counts: { ...NO_COUNTS } };
}

/** The filter rules' context: the channels' topics (F3), the topics and the blocked words. */
export function filterContext(channels: readonly Channel[], nowMs: number): FilterContext {
  return {
    nowMs,
    channelTopics: new Map(channels.map((channel) => [channel.channelId, channel.topicIds])),
    topics: TOPICS,
    blockedWords: BLOCKED_WORDS,
  };
}

/**
 * The row saved in feed_item. Uses YouTube's channel name, or the saved one if
 * YouTube sent none. Only videos that passed the length rule get here, so the
 * duration is known.
 */
export function toNewFeedItem(
  video: FetchedVideo,
  savedTitles: ReadonlyMap<string, string>,
): NewFeedItem {
  return {
    videoId: video.videoId,
    channelId: video.channelId,
    channelTitle: video.channelTitle || (savedTitles.get(video.channelId) ?? ''),
    title: video.title,
    durationSec: video.durationSec ?? 0,
  };
}

type UploadsRead =
  | { ok: true; videoIds: string[]; channelsRead: number; skipped: SkippedChannel[] }
  | { ok: false; error: YoutubeError; skipped: SkippedChannel[] };

/** §5 step 1: the latest 50 uploads of every channel, read in parallel. */
async function readUploads(channels: readonly Channel[], api: FetchApi): Promise<UploadsRead> {
  const results = await Promise.all(
    channels.map((channel) => api.listUploads(channel.uploadsPlaylistId)),
  );
  const videoIds: string[] = [];
  const skipped: SkippedChannel[] = [];
  let channelsRead = 0;
  for (const [index, result] of results.entries()) {
    const { channelId, title } = channels[index];
    if (result.ok) {
      channelsRead += 1;
      videoIds.push(...result.value);
    } else if (stopsFetch(result.error)) {
      return { ok: false, error: result.error, skipped };
    } else {
      skipped.push({ channelId, title, error: result.error });
    }
  }
  // Every channel failed, e.g. with no network: that's a failed fetch, not an empty one.
  if (channelsRead === 0 && skipped.length > 0) {
    return { ok: false, error: skipped[0].error, skipped };
  }
  return { ok: true, videoIds, channelsRead, skipped };
}

/** Runs the whole §5 process. Never throws for YouTube errors: they come back in the outcome. */
export async function runFetch(input: FetchInput, api: FetchApi): Promise<FetchOutcome> {
  const uploads = await readUploads(input.channels, api);
  if (!uploads.ok) {
    return { ok: false, error: uploads.error, skipped: uploads.skipped, counts: { ...NO_COUNTS } };
  }
  const { skipped } = uploads;

  // §5 step 2, before videos.list, so watched and listed videos cost no units.
  const toCheck = removeSeen(
    uploads.videoIds.map((videoId) => ({ videoId })),
    input.watchedIds,
    input.listedIds,
  ).map(({ videoId }) => videoId);
  const counts: FetchCounts = {
    channelsRead: uploads.channelsRead,
    uploads: uploads.videoIds.length,
    toCheck: toCheck.length,
    fetched: 0,
  };
  if (toCheck.length === 0) {
    return { ok: true, feed: [], reserve: [], rejected: [], skipped, counts };
  }

  // §5 step 3: videos.list in batches of 50.
  const videos = await api.getVideos(toCheck);
  if (!videos.ok) {
    return { ok: false, error: videos.error, skipped, counts };
  }
  counts.fetched = videos.value.length;

  const { passed, rejected } = applyFilters(
    videos.value,
    filterContext(input.channels, input.nowMs),
  );
  const { feed, reserve } = selectFeed(sortForFeed(passed, input.lastFetchMs));
  const savedTitles = new Map(input.channels.map((channel) => [channel.channelId, channel.title]));
  return {
    ok: true,
    feed: feed.map((video) => toNewFeedItem(video, savedTitles)),
    reserve: reserve.map((video) => toNewFeedItem(video, savedTitles)),
    rejected,
    skipped,
    counts,
  };
}
