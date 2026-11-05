// The only file that talks to the YouTube Data API, and the only one that
// counts quota units (CLAUDE.md). The request parameters and the response
// mapping are pure functions in lib/; this file sends the requests.

import { checkApiKey, type ApiKeyCheck } from '@/lib/apiKey';
import type { YoutubeError, YoutubeResult, YtErrorBody } from '@/lib/youtubeErrors';
import { classifyApiError } from '@/lib/youtubeErrors';
import {
  buildQuery,
  channelParams,
  chunk,
  MAX_PER_REQUEST,
  uploadsParams,
  videosParams,
  type ChannelLookup,
  type Endpoint,
  type QueryParams,
} from '@/lib/youtubeRequests';
import {
  toFetchedVideos,
  toResolvedChannel,
  toVideoIds,
  type FetchedVideo,
  type ResolvedChannel,
  type YtChannel,
  type YtListResponse,
  type YtPlaylistItem,
  type YtVideo,
} from '@/lib/youtubeResponses';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const REQUEST_TIMEOUT_MS = 15_000;

/** Units per request, from YouTube's quota table. The parts asked for don't change the cost. */
const UNIT_COST: Readonly<Record<Endpoint, number>> = {
  channels: 1,
  playlistItems: 1,
  videos: 1,
};

// Expo inlines EXPO_PUBLIC_* variables into the bundle, and only for a direct
// `process.env.NAME` read. Don't destructure process.env or index it by a variable.
export function readApiKey(): ApiKeyCheck {
  return checkApiKey(process.env.EXPO_PUBLIC_YOUTUBE_KEY);
}

export type YoutubeClient = {
  /** channels.list. Fails with notFound if no channel has that handle or ID. */
  resolveChannel(lookup: ChannelLookup): Promise<YoutubeResult<ResolvedChannel>>;
  /** playlistItems.list: the IDs of the latest 50 uploads (spec §5 step 1). */
  listUploads(uploadsPlaylistId: string): Promise<YoutubeResult<string[]>>;
  /**
   * videos.list in batches of 50, sent in parallel. Private and deleted videos
   * are missing from the result, because YouTube leaves them out.
   */
  getVideos(videoIds: readonly string[]): Promise<YoutubeResult<FetchedVideo[]>>;
  /** Units this client has used so far. A fetch creates its own client to count its units. */
  unitsUsed(): number;
};

function failure(error: YoutubeError): { ok: false; error: YoutubeError } {
  return { ok: false, error };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Fails with noKey, without sending anything, if the key in .env is missing or malformed. */
export function createYoutubeClient(): YoutubeResult<YoutubeClient> {
  const apiKey = readApiKey();
  if (!apiKey.ok) {
    return failure({ kind: 'noKey', status: null, message: `API key ${apiKey.reason}` });
  }
  const key = apiKey.key;
  let units = 0;

  async function request<T>(endpoint: Endpoint, params: QueryParams): Promise<YoutubeResult<T>> {
    // The URL holds the key, so it's never logged.
    const url = `${API_BASE}/${endpoint}?${buildQuery({ ...params, key })}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      // YouTube charges every request it answers, failed ones included.
      units += UNIT_COST[endpoint];
      const body = parseJson(await response.text());
      if (!response.ok) {
        return failure(classifyApiError(response.status, body as YtErrorBody | null));
      }
      if (body === null || typeof body !== 'object') {
        return failure({ kind: 'other', status: null, message: `${endpoint}: response is not JSON` });
      }
      return { ok: true, value: body as T };
    } catch (error) {
      const message = controller.signal.aborted
        ? `timed out after ${REQUEST_TIMEOUT_MS / 1000} s`
        : String(error);
      return failure({ kind: 'network', status: null, message });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: true,
    value: {
      async resolveChannel(lookup) {
        const result = await request<YtListResponse<YtChannel>>('channels', channelParams(lookup));
        if (!result.ok) {
          return result;
        }
        const first = result.value.items?.[0];
        const channel = first === undefined ? null : toResolvedChannel(first);
        if (channel === null) {
          const name = lookup.kind === 'handle' ? `@${lookup.handle}` : lookup.channelId;
          return failure({ kind: 'notFound', status: null, message: `no channel ${name}` });
        }
        return { ok: true, value: channel };
      },

      async listUploads(uploadsPlaylistId) {
        const result = await request<YtListResponse<YtPlaylistItem>>(
          'playlistItems',
          uploadsParams(uploadsPlaylistId),
        );
        return result.ok ? { ok: true, value: toVideoIds(result.value) } : result;
      },

      async getVideos(videoIds) {
        const batches = chunk([...new Set(videoIds)], MAX_PER_REQUEST);
        const results = await Promise.all(
          batches.map((batch) => request<YtListResponse<YtVideo>>('videos', videosParams(batch))),
        );
        const videos: FetchedVideo[] = [];
        for (const result of results) {
          if (!result.ok) {
            return result;
          }
          videos.push(...toFetchedVideos(result.value));
        }
        return { ok: true, value: videos };
      },

      unitsUsed: () => units,
    },
  };
}
