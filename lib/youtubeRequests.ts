// Builds the query parameters for the three YouTube Data API calls the app
// makes (spec §5, CLAUDE.md). services/youtube.ts sends them. search.list is
// never used: it costs 100 units per call.

import type { ChannelInput } from './channelInput';

export type Endpoint = 'channels' | 'playlistItems' | 'videos';

export type QueryParams = Readonly<Record<string, string>>;

/** A channel to look up: what parseChannelInput returns for valid input. */
export type ChannelLookup = Exclude<ChannelInput, { kind: 'invalid' }>;

/** videos.list and playlistItems.list take at most 50 per request. */
export const MAX_PER_REQUEST = 50;

/**
 * Asking for a maximum height makes videos.list return player.embedWidth and
 * embedHeight, scaled to the video's own aspect ratio. The vertical rule only
 * compares the two, so any value in the allowed range (72 to 8192) works.
 */
export const EMBED_MAX_HEIGHT = 1080;

/** Extra parts cost no extra units (spec §5 step 3). */
const VIDEO_PARTS = ['snippet', 'contentDetails', 'statistics', 'status', 'player', 'liveStreamingDetails'];

export function channelParams(lookup: ChannelLookup): QueryParams {
  const part = 'snippet,contentDetails';
  return lookup.kind === 'handle'
    ? { part, forHandle: `@${lookup.handle}` }
    : { part, id: lookup.channelId };
}

export function uploadsParams(playlistId: string): QueryParams {
  return { part: 'contentDetails', playlistId, maxResults: String(MAX_PER_REQUEST) };
}

/** For one batch of at most MAX_PER_REQUEST IDs. */
export function videosParams(videoIds: readonly string[]): QueryParams {
  if (videoIds.length === 0 || videoIds.length > MAX_PER_REQUEST) {
    throw new RangeError(`videos.list takes 1 to ${MAX_PER_REQUEST} IDs, got ${videoIds.length}`);
  }
  return {
    part: VIDEO_PARTS.join(','),
    id: videoIds.join(','),
    maxHeight: String(EMBED_MAX_HEIGHT),
  };
}

/**
 * Encodes parameters as a query string. Built by hand because React Native's
 * URLSearchParams is incomplete. Hebrew handles get percent-encoded.
 */
export function buildQuery(params: QueryParams): string {
  return Object.entries(params)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
}

/** Splits items into consecutive groups of at most `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`chunk size must be a positive integer, got ${size}`);
  }
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    groups.push(items.slice(start, start + size));
  }
  return groups;
}
