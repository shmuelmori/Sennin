// The filter rules from spec §5. Each rule is its own function that returns
// null when the video passes, or a rejection naming the rule, so every
// rejection can be logged in fetch_log (F5) and tested.

import { findTerm } from './textMatch';

/** The YouTube Shorts length limit (spec §9). */
export const MAX_SHORT_SEC = 180;
export const MIN_VIEWS = 1000;
/** Videos younger than this skip the minimum-views rule. */
export const NEW_VIDEO_GRACE_MS = 48 * 60 * 60 * 1000;

/** What the rules need from videos.list, already parsed by the caller (step 4.1). */
export type VideoCandidate = {
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  /** snippet.tags; empty if the video has none. */
  tags: readonly string[];
  publishedAtMs: number;
  /** From contentDetails.duration via parseDurationSec; null if it didn't parse. */
  durationSec: number | null;
  /** player.embedWidth and embedHeight; null if missing. */
  embedWidth: number | null;
  embedHeight: number | null;
  embeddable: boolean;
  /** statistics.viewCount as a number; null if missing. */
  viewCount: number | null;
  /** snippet.liveBroadcastContent: "none", "live" or "upcoming". */
  liveBroadcastContent: string;
  /** Whether liveStreamingDetails is present, which also marks streams that have ended. */
  hasLiveStreamingDetails: boolean;
};

/** Every rule, in the order checkVideo runs them (spec §5). */
export const RULE_NAMES = [
  'live',
  'length',
  'vertical',
  'embeddable',
  'blockedWord',
  'minViews',
  'queryMatch',
] as const;

export type RuleName = (typeof RULE_NAMES)[number];

export type Rejection = { rule: RuleName; detail: string };

/** null means the video passes the rule. */
export type RuleResult = Rejection | null;

function reject(rule: RuleName, detail: string): Rejection {
  return { rule, detail };
}

function searchableText(video: VideoCandidate): string {
  return `${video.title}\n${video.description}`;
}

export function checkLive(video: VideoCandidate): RuleResult {
  if (video.liveBroadcastContent !== 'none') {
    return reject('live', video.liveBroadcastContent);
  }
  if (video.hasLiveStreamingDetails) {
    return reject('live', 'past live stream');
  }
  return null;
}

export function checkLength(video: VideoCandidate): RuleResult {
  const seconds = video.durationSec;
  if (seconds === null || seconds <= 0) {
    return reject('length', 'no duration');
  }
  if (seconds > MAX_SHORT_SEC) {
    return reject('length', `${seconds} s`);
  }
  return null;
}

export function checkVertical(video: VideoCandidate): RuleResult {
  const { embedWidth: width, embedHeight: height } = video;
  if (width === null || height === null) {
    return reject('vertical', 'no player size');
  }
  if (height <= width) {
    return reject('vertical', `${width}x${height}`);
  }
  return null;
}

export function checkEmbeddable(video: VideoCandidate): RuleResult {
  return video.embeddable ? null : reject('embeddable', 'not embeddable');
}

export function checkBlockedWords(
  video: VideoCandidate,
  blockedWords: readonly string[],
): RuleResult {
  const word = findTerm(searchableText(video), blockedWords);
  return word === null ? null : reject('blockedWord', word);
}

/**
 * A word from the item's search query appears in the title, description or
 * tags (spec §5). `terms` comes from queryTerms in lib/searchQuery.ts; with
 * none, the video passes.
 */
export function checkQueryMatch(
  video: VideoCandidate,
  terms: readonly string[],
  query: string,
): RuleResult {
  if (terms.length === 0) {
    return null;
  }
  const text = `${searchableText(video)}\n${video.tags.join('\n')}`;
  return findTerm(text, terms) === null ? reject('queryMatch', `no word from "${query}"`) : null;
}

export function checkMinViews(video: VideoCandidate, nowMs: number): RuleResult {
  if (nowMs - video.publishedAtMs < NEW_VIDEO_GRACE_MS) {
    return null;
  }
  if (video.viewCount === null) {
    return reject('minViews', 'views hidden');
  }
  if (video.viewCount < MIN_VIEWS) {
    return reject('minViews', `${video.viewCount} views`);
  }
  return null;
}

/** The search a video came from, for the query match rule. */
export type VideoQuery = { query: string; terms: readonly string[] };

export type FilterContext = {
  nowMs: number;
  /** The search each video came from, keyed by videoId. A video missing here skips the rule. */
  queries: ReadonlyMap<string, VideoQuery>;
  blockedWords: readonly string[];
};

/**
 * Runs the rules in a fixed order (spec §5) and returns the first rejection, or null if
 * the video passes them all. Live streams come first because they report a
 * duration of 0, and the Shorts checks (length, vertical) come next, so the
 * counts per rule show how Shorts detection performs.
 */
export function checkVideo(video: VideoCandidate, context: FilterContext): RuleResult {
  const search = context.queries.get(video.videoId);
  return (
    checkLive(video) ??
    checkLength(video) ??
    checkVertical(video) ??
    checkEmbeddable(video) ??
    checkBlockedWords(video, context.blockedWords) ??
    checkMinViews(video, context.nowMs) ??
    checkQueryMatch(video, search?.terms ?? [], search?.query ?? '')
  );
}

export type RejectedVideo = Rejection & { videoId: string };

export type FilterResult<T> = {
  passed: T[];
  /** One entry per rejected video, with the first rule that rejected it. */
  rejected: RejectedVideo[];
};

export function applyFilters<T extends VideoCandidate>(
  videos: readonly T[],
  context: FilterContext,
): FilterResult<T> {
  const passed: T[] = [];
  const rejected: RejectedVideo[] = [];
  for (const video of videos) {
    const rejection = checkVideo(video, context);
    if (rejection === null) {
      passed.push(video);
    } else {
      rejected.push({ videoId: video.videoId, ...rejection });
    }
  }
  return { passed, rejected };
}

/** How many videos each rule rejected, with every rule present (0 if none). */
export function countRejectionsByRule(rejected: readonly Rejection[]): Record<RuleName, number> {
  const counts = Object.fromEntries(RULE_NAMES.map((rule) => [rule, 0])) as Record<RuleName, number>;
  for (const { rule } of rejected) {
    counts[rule] += 1;
  }
  return counts;
}
