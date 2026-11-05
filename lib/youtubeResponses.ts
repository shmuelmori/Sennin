// The parts of the YouTube Data API responses the app uses, and the functions
// that turn them into app types. Every field is optional, because the app
// can't trust a response's shape: a missing field becomes a safe default, and
// an item without an ID is dropped.

import { parseDurationSec } from './duration';
import type { VideoCandidate } from './filterRules';
import type { NewChannel } from './records';

export type YtListResponse<T> = { items?: T[] };

type YtThumbnail = { url?: string };

export type YtChannel = {
  id?: string;
  snippet?: {
    title?: string;
    thumbnails?: { default?: YtThumbnail; medium?: YtThumbnail; high?: YtThumbnail };
  };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

export type YtPlaylistItem = { contentDetails?: { videoId?: string } };

export type YtVideo = {
  id?: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
  };
  contentDetails?: { duration?: string };
  /** The API sends 64-bit counts as strings. */
  statistics?: { viewCount?: string };
  status?: { embeddable?: boolean };
  /** Only returned when the request passes maxWidth or maxHeight. */
  player?: { embedWidth?: string | number; embedHeight?: string | number };
  /** Present for live, upcoming and ended streams. */
  liveStreamingDetails?: object;
};

/** A channel as channels.list resolves it (F1). The caller adds addedAtMs. */
export type ResolvedChannel = Omit<NewChannel, 'addedAtMs'>;

/** A video from videos.list, ready for the filter rules and the feed. */
export type FetchedVideo = VideoCandidate & { channelTitle: string };

/** Returns null if the channel has no ID or no uploads playlist. */
export function toResolvedChannel(item: YtChannel): ResolvedChannel | null {
  const channelId = item.id;
  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
  if (!channelId || !uploadsPlaylistId) {
    return null;
  }
  const thumbnails = item.snippet?.thumbnails;
  // "medium" is 240 px, sharp enough for the Sources list. "default" is only 88 px.
  const thumbnailUrl =
    thumbnails?.medium?.url ?? thumbnails?.default?.url ?? thumbnails?.high?.url ?? null;
  return {
    channelId,
    title: item.snippet?.title ?? channelId,
    uploadsPlaylistId,
    thumbnailUrl,
  };
}

/** The video IDs in a playlistItems.list response, in order, without repeats. */
export function toVideoIds(response: YtListResponse<YtPlaylistItem>): string[] {
  const ids = (response.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => typeof id === 'string' && id !== '');
  return [...new Set(ids)];
}

/** A count or size sent as a string or a number. null if missing or not a number. */
export function toCount(value: string | number | undefined): number | null {
  if (value === undefined || value === '') {
    return null;
  }
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

/** Returns null if the video has no ID. */
export function toFetchedVideo(item: YtVideo): FetchedVideo | null {
  if (!item.id) {
    return null;
  }
  const { snippet, contentDetails, statistics, status, player } = item;
  const publishedAtMs = snippet?.publishedAt ? Date.parse(snippet.publishedAt) : NaN;
  const duration = contentDetails?.duration;
  return {
    videoId: item.id,
    channelId: snippet?.channelId ?? '',
    channelTitle: snippet?.channelTitle ?? '',
    title: snippet?.title ?? '',
    description: snippet?.description ?? '',
    // A missing date counts as old, so the minimum-views rule still applies.
    publishedAtMs: Number.isNaN(publishedAtMs) ? 0 : publishedAtMs,
    durationSec: duration === undefined ? null : parseDurationSec(duration),
    embedWidth: toCount(player?.embedWidth),
    embedHeight: toCount(player?.embedHeight),
    // Missing status means the app can't tell, so it doesn't risk an unplayable video.
    embeddable: status?.embeddable === true,
    viewCount: toCount(statistics?.viewCount),
    liveBroadcastContent: snippet?.liveBroadcastContent ?? 'none',
    hasLiveStreamingDetails: item.liveStreamingDetails !== undefined,
  };
}

/** The videos in a videos.list response. Items without an ID are dropped. */
export function toFetchedVideos(response: YtListResponse<YtVideo>): FetchedVideo[] {
  return (response.items ?? [])
    .map(toFetchedVideo)
    .filter((video): video is FetchedVideo => video !== null);
}
