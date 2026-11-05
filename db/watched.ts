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

/** The IDs of every watched video, for the fetch's dedupe step (§5 step 2). */
export async function getWatchedIds(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ videoId: string }>('SELECT videoId FROM watched');
  return new Set(rows.map((row) => row.videoId));
}
