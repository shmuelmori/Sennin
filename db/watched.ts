// Queries for the watched table (F9). Watched videos never come back in a fetch.

import type { SQLiteDatabase } from 'expo-sqlite';

/** Records a watched video. If it was already watched, keeps the first time. */
export async function markWatched(
  db: SQLiteDatabase,
  videoId: string,
  watchedAtMs: number,
): Promise<void> {
  await db.runAsync('INSERT OR IGNORE INTO watched (videoId, watchedAt) VALUES (?, ?)', [
    videoId,
    watchedAtMs,
  ]);
}

/**
 * F9: a video in the list was half played. Records it in `watched` and, if
 * its feed_item is still unseen, marks that watched too, in one transaction.
 * The same change as `markItemWatched` in lib/watchProgress.ts.
 */
export async function recordWatched(
  db: SQLiteDatabase,
  videoId: string,
  watchedAtMs: number,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await markWatched(db, videoId, watchedAtMs);
    await db.runAsync(
      "UPDATE feed_item SET status = 'watched' WHERE videoId = ? AND status = 'unseen'",
      [videoId],
    );
  });
}

/** The IDs of every watched video, for the fetch's dedupe step (§5 step 2). */
export async function getWatchedIds(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ videoId: string }>('SELECT videoId FROM watched');
  return new Set(rows.map((row) => row.videoId));
}
