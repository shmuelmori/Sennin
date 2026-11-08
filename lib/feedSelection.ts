// Building the list from filtered videos (spec §5 steps 3 and 6): drop seen
// and shared videos, then up to 5 per item by views, and the rest of the
// passed videos as a reserve of up to 20.

export const PER_ITEM = 5;
export const RESERVE_SIZE = 20;

/**
 * Drops videos that were already watched or are already in the list, plus
 * repeats within `items` (§5 step 3). Keeps the original order.
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

/**
 * The video IDs that came back for more than one item (§5 step 3). Such a
 * video is dropped for every item, so it can't be shown twice or under the
 * wrong name.
 */
export function sharedVideoIds(resultsPerItem: readonly (readonly string[])[]): Set<string> {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const results of resultsPerItem) {
    for (const videoId of new Set(results)) {
      if (seen.has(videoId)) shared.add(videoId);
      seen.add(videoId);
    }
  }
  return shared;
}

type Sortable = { videoId: string; publishedAtMs: number; viewCount: number | null };

/** Most views first. Ties go to the newer video, then by ID, so the order is stable. */
export function sortByViews<T extends Sortable>(videos: readonly T[]): T[] {
  return [...videos].sort(
    (a, b) =>
      (b.viewCount ?? 0) - (a.viewCount ?? 0) ||
      b.publishedAtMs - a.publishedAtMs ||
      compareIds(a.videoId, b.videoId),
  );
}

export type FeedSelection<T> = {
  /** Up to PER_ITEM videos per item, keyed by item, most views first. */
  perItem: Map<number, T[]>;
  /** Passed videos not selected, most views first, up to RESERVE_SIZE. */
  reserve: T[];
};

/**
 * §5 step 6: for each item its PER_ITEM most viewed videos. An item with fewer
 * keeps what it has. The rest go to the reserve.
 */
export function selectFeed<T extends Sortable>(
  passedPerItem: ReadonlyMap<number, readonly T[]>,
): FeedSelection<T> {
  const perItem = new Map<number, T[]>();
  const leftovers: T[] = [];
  for (const [itemId, videos] of passedPerItem) {
    const sorted = sortByViews(videos);
    perItem.set(itemId, sorted.slice(0, PER_ITEM));
    leftovers.push(...sorted.slice(PER_ITEM));
  }
  return { perItem, reserve: sortByViews(leftovers).slice(0, RESERVE_SIZE) };
}

function compareIds(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
