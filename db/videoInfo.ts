// Queries for the video info sheet (ⓘ): the saved Gemini answers in
// video_info, and the video details from feed_item that a request sends.

import type { SQLiteDatabase } from 'expo-sqlite';

import type { VideoContext } from '@/lib/videoInfo';

export type VideoInfo = {
  videoId: string;
  text: string;
  model: string;
  createdAtMs: number;
};

type VideoInfoRow = { videoId: string; text: string; model: string; createdAt: number };

/** The saved answer for a video, or null if none was saved. */
export async function getVideoInfo(db: SQLiteDatabase, videoId: string): Promise<VideoInfo | null> {
  const row = await db.getFirstAsync<VideoInfoRow>(
    'SELECT videoId, text, model, createdAt FROM video_info WHERE videoId = ?',
    [videoId],
  );
  return row === null
    ? null
    : { videoId: row.videoId, text: row.text, model: row.model, createdAtMs: row.createdAt };
}

/** Saves (or replaces) a video's answer. */
export async function saveVideoInfo(db: SQLiteDatabase, info: VideoInfo): Promise<void> {
  await db.runAsync(
    `INSERT INTO video_info (videoId, text, model, createdAt) VALUES (?, ?, ?, ?)
     ON CONFLICT (videoId) DO UPDATE SET
       text = excluded.text, model = excluded.model, createdAt = excluded.createdAt`,
    [info.videoId, info.text, info.model, info.createdAtMs],
  );
}

/** What a Gemini request sends about a video in the list, or null if it isn't there. */
export async function getVideoContext(
  db: SQLiteDatabase,
  videoId: string,
): Promise<VideoContext | null> {
  return db.getFirstAsync<VideoContext>(
    'SELECT title, description, itemName, channelTitle FROM feed_item WHERE videoId = ?',
    [videoId],
  );
}
