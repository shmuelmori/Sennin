// The pages of the feed (spec §4): one page per video, then the
// "That's it for today" page, and the page the feed opens on.

import type { FeedItem } from './records';

export type FeedPage = { kind: 'video'; item: FeedItem } | { kind: 'end' };

/**
 * The videos the feed shows, in list order: the saved list without the
 * reserve, and without videos that were auto-skipped (F8).
 */
export function feedVideos(items: readonly FeedItem[]): FeedItem[] {
  return items
    .filter((item) => !item.isReserve && item.status !== 'skipped')
    .sort((a, b) => a.position - b.position);
}

/** One page per video, then the end page. */
export function toFeedPages(videos: readonly FeedItem[]): FeedPage[] {
  const pages: FeedPage[] = videos.map((item) => ({ kind: 'video', item }));
  pages.push({ kind: 'end' });
  return pages;
}

/**
 * The page the feed opens on: the first video not yet watched, or the end
 * page if every video was watched.
 */
export function startPageIndex(videos: readonly FeedItem[]): number {
  const index = videos.findIndex((item) => item.status === 'unseen');
  return index === -1 ? videos.length : index;
}

/** A stable key for the list. Video IDs are unique within a list. */
export function feedPageKey(page: FeedPage): string {
  return page.kind === 'video' ? `video:${page.item.videoId}` : 'end';
}
