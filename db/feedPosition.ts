// Queries for the feed_position table: the page the Feed was last on, so
// leaving the app and coming back opens the Feed on the same video (spec §4
// "Feed"). One row at most. A new list (replaceFeed) clears it.

import type { SQLiteDatabase } from 'expo-sqlite';

import type { SavedFeedPosition } from '@/lib/feedPages';

/** The saved page, or null if none was saved for the current list. */
export async function getFeedPosition(db: SQLiteDatabase): Promise<SavedFeedPosition | null> {
  const row = await db.getFirstAsync<{ videoId: string | null }>(
    'SELECT videoId FROM feed_position WHERE id = 1',
  );
  return row === null ? null : { videoId: row.videoId };
}

/** Saves the page on screen: a video's ID, or null for the end page. */
export async function saveFeedPosition(
  db: SQLiteDatabase,
  videoId: string | null,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO feed_position (id, videoId) VALUES (1, ?)
     ON CONFLICT (id) DO UPDATE SET videoId = excluded.videoId`,
    [videoId],
  );
}
