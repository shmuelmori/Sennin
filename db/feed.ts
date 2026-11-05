// Queries for the feed_item table: the current list of 15 videos plus the reserve (F6).

import type { SQLiteDatabase } from 'expo-sqlite';

import { isFeedStatus, type FeedItem, type FeedStatus, type NewFeedItem } from '@/lib/records';

type FeedItemRow = {
  position: number;
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  durationSec: number;
  isReserve: number;
  status: string;
};

function toFeedItem(row: FeedItemRow): FeedItem {
  if (!isFeedStatus(row.status)) {
    throw new Error(`Unknown feed_item status "${row.status}" for ${row.videoId}`);
  }
  return {
    position: row.position,
    videoId: row.videoId,
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    title: row.title,
    durationSec: row.durationSec,
    isReserve: row.isReserve === 1,
    status: row.status,
  };
}

/**
 * Replaces the whole list in one transaction. The feed videos get positions
 * 0, 1, 2…, the reserve continues after them. Every item starts as unseen.
 */
export async function replaceFeed(
  db: SQLiteDatabase,
  feed: readonly NewFeedItem[],
  reserve: readonly NewFeedItem[],
): Promise<void> {
  const items = [
    ...feed.map((item) => ({ item, isReserve: 0 })),
    ...reserve.map((item) => ({ item, isReserve: 1 })),
  ];
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM feed_item');
    for (const [position, { item, isReserve }] of items.entries()) {
      await db.runAsync(
        `INSERT INTO feed_item
           (position, videoId, channelId, channelTitle, title, durationSec, isReserve, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'unseen')`,
        [
          position,
          item.videoId,
          item.channelId,
          item.channelTitle,
          item.title,
          item.durationSec,
          isReserve,
        ],
      );
    }
  });
}

/** The whole list, feed and reserve, in position order. */
export async function getFeedItems(db: SQLiteDatabase): Promise<FeedItem[]> {
  const rows = await db.getAllAsync<FeedItemRow>(
    `SELECT position, videoId, channelId, channelTitle, title, durationSec, isReserve, status
     FROM feed_item ORDER BY position`,
  );
  return rows.map(toFeedItem);
}

/** Returns false if the video isn't in the list. */
export async function setFeedItemStatus(
  db: SQLiteDatabase,
  videoId: string,
  status: FeedStatus,
): Promise<boolean> {
  const result = await db.runAsync('UPDATE feed_item SET status = ? WHERE videoId = ?', [
    status,
    videoId,
  ]);
  return result.changes > 0;
}
