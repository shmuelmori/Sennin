// The filter rules from spec §5. Each rule is its own function that returns
// null when the video passes, or a rejection naming the rule, so every
// rejection can be logged in fetch_log (F5) and tested.

import { findTerm } from './textMatch';
import type { Topic, TopicId } from './topics';

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
  'keyword',
  'minViews',
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
 * A channel assigned to exactly one topic is exempt (spec §5). Otherwise the
 * title or description needs a keyword from one of the channel's topics, or
 * from any topic if the channel has none.
 */
export function checkKeyword(
  video: VideoCandidate,
  channelTopicIds: readonly TopicId[],
  topics: readonly Topic[],
): RuleResult {
  if (channelTopicIds.length === 1) {
    return null;
  }
  const relevant =
    channelTopicIds.length === 0
      ? topics
      : topics.filter((topic) => channelTopicIds.includes(topic.id));
  const keywords = relevant.flatMap((topic) => topic.keywords);
  if (findTerm(searchableText(video), keywords) !== null) {
    return null;
  }
  return reject('keyword', `no keyword for ${relevant.map((topic) => topic.name).join(', ')}`);
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

export type FilterContext = {
  nowMs: number;
  /** The topics each channel is assigned to (F3), keyed by channelId. */
  channelTopics: ReadonlyMap<string, readonly TopicId[]>;
  topics: readonly Topic[];
  blockedWords: readonly string[];
};

/**
 * Runs the rules in a fixed order and returns the first rejection, or null if
 * the video passes them all. Live streams come first because they report a
 * duration of 0, and the Shorts checks (length, vertical) come next, so the
 * counts per rule show how Shorts detection performs.
 */
export function checkVideo(video: VideoCandidate, context: FilterContext): RuleResult {
  return (
    checkLive(video) ??
    checkLength(video) ??
    checkVertical(video) ??
    checkEmbeddable(video) ??
    checkBlockedWords(video, context.blockedWords) ??
    checkKeyword(video, context.channelTopics.get(video.channelId) ?? [], context.topics) ??
    checkMinViews(video, context.nowMs)
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
