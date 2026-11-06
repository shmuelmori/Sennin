// Auto-skip (F8, step 7.3): when the player reports that a video can't play,
// a reserve video takes its place in the list.

import type { FeedItem } from './records';

/**
 * Player errors (react-native-youtube-iframe names) that mean the video can
 * never play here: deleted or private (not found), embedding not allowed, or
 * a bad video ID. The HTML5 player error is left out: it can come from a weak
 * connection, and a slow or failing connection is the user's call (F8).
 */
export const SKIP_ERRORS: readonly string[] = [
  'video_not_found',
  'embed_not_allowed',
  'invalid_parameter',
];

export function isSkipError(error: string): boolean {
  return SKIP_ERRORS.includes(error);
}

export type SkipPlan = {
  skipped: FeedItem;
  /** The reserve video that takes its place, or null if the reserve is used up. */
  replacement: FeedItem | null;
};

/**
 * Plans skipping a video in the feed part of the list. The replacement is the
 * first reserve video (lowest position) not yet used or skipped. Returns null
 * if the video isn't in the feed part or was already skipped.
 */
export function planSkip(items: readonly FeedItem[], videoId: string): SkipPlan | null {
  const skipped = items.find((item) => item.videoId === videoId);
  if (!skipped || skipped.isReserve || skipped.status === 'skipped') {
    return null;
  }
  const replacement =
    items
      .filter((item) => item.isReserve && item.status === 'unseen')
      .sort((a, b) => a.position - b.position)[0] ?? null;
  return { skipped, replacement };
}

/**
 * Applies a plan to the list in memory, the same way `skipFeedItem` in
 * db/feed.ts does in SQLite: the skipped video and its replacement swap
 * positions and reserve flags, so the replacement shows in the skipped
 * video's place, and the skipped video is marked skipped.
 */
export function applySkip(items: readonly FeedItem[], plan: SkipPlan): FeedItem[] {
  const { skipped, replacement } = plan;
  return items.map((item) => {
    if (item.videoId === skipped.videoId) {
      return replacement
        ? { ...item, position: replacement.position, isReserve: true, status: 'skipped' }
        : { ...item, status: 'skipped' };
    }
    if (replacement && item.videoId === replacement.videoId) {
      return { ...item, position: skipped.position, isReserve: false };
    }
    return item;
  });
}

/** Log line for a skip. */
export function formatSkipLine(plan: SkipPlan, error: string): string {
  const outcome = plan.replacement
    ? `replaced by ${plan.replacement.videoId}`
    : 'no reserve left, removed from the list';
  return `[skip] ${plan.skipped.videoId} (${error}): ${outcome}`;
}
