// Builds the feed from filtered videos (spec §5 steps 2, 5 and 6).
// Older unwatched videos fill the feed when there aren't enough new ones (§10):
// the sort puts them after the new videos instead of dropping them.

export const FEED_SIZE = 15;
export const RESERVE_SIZE = 10;

/**
 * Drops videos that were already watched or are already in the list, plus
 * repeats within `items` (§5 step 2). Keeps the original order.
 */
export function removeSeen<T extends { videoId: string }>(
  items: readonly T[],
  watchedIds: ReadonlySet<string>,
  listedIds: ReadonlySet<string>,
): T[] {
  const kept = new Set<string>();
  return items.filter(({ videoId }) => {
    if (watchedIds.has(videoId) || listedIds.has(videoId) || kept.has(videoId)) {
      return false;
    }
    kept.add(videoId);
    return true;
  });
}

type Sortable = {
  videoId: string;
  publishedAtMs: number;
  viewCount: number | null;
};

/**
 * Videos published since the previous fetch first, then by view count (§5 step 5).
 * Ties go to the newer video, then by ID, so the order is stable.
 * With no previous fetch, every video counts as new.
 */
export function sortForFeed<T extends Sortable>(videos: readonly T[], lastFetchMs: number | null): T[] {
  const isNew = (video: T) => lastFetchMs === null || video.publishedAtMs > lastFetchMs;
  return [...videos].sort(
    (a, b) =>
      Number(isNew(b)) - Number(isNew(a)) ||
      (b.viewCount ?? 0) - (a.viewCount ?? 0) ||
      b.publishedAtMs - a.publishedAtMs ||
      compareIds(a.videoId, b.videoId),
  );
}

export type FeedSelection<T> = {
  feed: T[];
  reserve: T[];
};

/** The first 15 sorted videos for the feed, and up to 10 more in reserve (§5 step 6). */
export function selectFeed<T>(sorted: readonly T[]): FeedSelection<T> {
  return {
    feed: sorted.slice(0, FEED_SIZE),
    reserve: sorted.slice(FEED_SIZE, FEED_SIZE + RESERVE_SIZE),
  };
}

function compareIds(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
