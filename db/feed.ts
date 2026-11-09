// Queries for the feed_item table: the current list of up to 100 videos plus the reserve (F6).

import type { SQLiteDatabase } from 'expo-sqlite';

import { isFeedStatus, type FeedItem, type FeedStatus, type NewFeedItem } from '@/lib/records';

type FeedItemRow = {
  position: number;
  videoId: string;
  itemId: number;
  itemName: string;
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
    itemId: row.itemId,
    itemName: row.itemName,
    title: row.title,
    durationSec: row.durationSec,
    isReserve: row.isReserve === 1,
    status: row.status,
  };
}

/**
 * Replaces the whole list in one transaction. The feed videos get positions
 * 0, 1, 2…, the reserve continues after them. Every item starts as unseen,
 * and the saved Feed page is cleared, so the new list opens at its start.
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
    await db.runAsync('DELETE FROM feed_position');
    for (const [position, { item, isReserve }] of items.entries()) {
      await db.runAsync(
        `INSERT INTO feed_item
           (position, videoId, itemId, itemName, title, durationSec, isReserve, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'unseen')`,
        [
          position,
          item.videoId,
          item.itemId,
          item.itemName,
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
    `SELECT position, videoId, itemId, itemName, title, durationSec, isReserve, status
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

/**
 * Auto-skip (F8): marks a video skipped and, if a replacement is given, swaps
 * their positions and reserve flags in one transaction, so the replacement
 * takes the skipped video's place in the feed. The same change as `applySkip`
 * in lib/autoSkip.ts. Returns false if either video isn't in the list.
 */
export async function skipFeedItem(
  db: SQLiteDatabase,
  videoId: string,
  replacementVideoId: string | null,
): Promise<boolean> {
  let done = false;
  await db.withTransactionAsync(async () => {
    const skipped = await db.getFirstAsync<{ position: number }>(
      'SELECT position FROM feed_item WHERE videoId = ?',
      [videoId],
    );
    if (skipped === null) return;
    if (replacementVideoId === null) {
      await db.runAsync("UPDATE feed_item SET status = 'skipped' WHERE videoId = ?", [videoId]);
      done = true;
      return;
    }
    const replacement = await db.getFirstAsync<{ position: number }>(
      'SELECT position FROM feed_item WHERE videoId = ?',
      [replacementVideoId],
    );
    if (replacement === null) return;
    // position is the primary key, so park the skipped row first.
    await db.runAsync('UPDATE feed_item SET position = -1 WHERE videoId = ?', [videoId]);
    await db.runAsync('UPDATE feed_item SET position = ?, isReserve = 0 WHERE videoId = ?', [
      skipped.position,
      replacementVideoId,
    ]);
    await db.runAsync(
      "UPDATE feed_item SET position = ?, isReserve = 1, status = 'skipped' WHERE videoId = ?",
      [replacement.position, videoId],
    );
    done = true;
  });
  return done;
}
