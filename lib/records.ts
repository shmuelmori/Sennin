// The shapes of the rows the app stores (spec §7), in app terms: times in ms
// since the epoch, booleans as booleans. db/ maps the SQLite rows to and from
// these. Also the JSON format of fetch_log.rejectedByRule.

import { RULE_NAMES, type RejectedVideo, type RuleName } from './filterRules';
import type { TopicId } from './topics';

export type NewChannel = {
  channelId: string;
  title: string;
  uploadsPlaylistId: string;
  thumbnailUrl: string | null;
  addedAtMs: number;
};

export type Channel = NewChannel & {
  /** The topics the channel is assigned to (F3). */
  topicIds: TopicId[];
};

export const FEED_STATUSES = ['unseen', 'watched', 'skipped'] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

/** A video as a fetch saves it in the list (§5 step 6). */
export type NewFeedItem = {
  videoId: string;
  channelId: string;
  /** Kept with the item, so the overlay still has it after the channel is removed (F2). */
  channelTitle: string;
  title: string;
  durationSec: number;
};

export type FeedItem = NewFeedItem & {
  /** Order in the list, from 0. The feed comes first, then the reserve. */
  position: number;
  isReserve: boolean;
  status: FeedStatus;
};

export type NewFetchLog = {
  startedAtMs: number;
  fetched: number;
  /** Each rejected video with the rule that rejected it (F5). */
  rejected: RejectedVideo[];
  quotaUsed: number;
  error: string | null;
};

export type FetchLog = NewFetchLog & { id: number };

export function isFeedStatus(value: string): value is FeedStatus {
  return (FEED_STATUSES as readonly string[]).includes(value);
}

function isRuleName(value: unknown): value is RuleName {
  return (RULE_NAMES as readonly unknown[]).includes(value);
}

function isRejectedVideo(value: unknown): value is RejectedVideo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { videoId, rule, detail } = value as Record<string, unknown>;
  return typeof videoId === 'string' && typeof detail === 'string' && isRuleName(rule);
}

/** The text stored in fetch_log.rejectedByRule: a JSON list of {videoId, rule, detail}. */
export function encodeRejections(rejected: readonly RejectedVideo[]): string {
  return JSON.stringify(rejected.map(({ videoId, rule, detail }) => ({ videoId, rule, detail })));
}

/** Reads fetch_log.rejectedByRule back. Returns null if the text isn't a valid list. */
export function decodeRejections(text: string): RejectedVideo[] | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const items: unknown[] = value;
  const rejected: RejectedVideo[] = [];
  for (const item of items) {
    if (!isRejectedVideo(item)) {
      return null;
    }
    rejected.push({ videoId: item.videoId, rule: item.rule, detail: item.detail });
  }
  return rejected;
}
