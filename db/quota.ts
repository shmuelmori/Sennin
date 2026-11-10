// Queries for the quota_day table (spec §5 "Quota"): YouTube API units used per
// Pacific Time day, and Gemini requests sent. The date key comes from
// pacificDate in lib/quota.ts.

import type { SQLiteDatabase } from 'expo-sqlite';

/** Units used on `date` ("YYYY-MM-DD"), 0 if none were logged. */
export async function getUnitsUsed(db: SQLiteDatabase, date: string): Promise<number> {
  const row = await db.getFirstAsync<{ unitsUsed: number }>(
    'SELECT unitsUsed FROM quota_day WHERE date = ?',
    [date],
  );
  return row?.unitsUsed ?? 0;
}

/** Adds the units a fetch used to its day's count. */
export async function addUnitsUsed(db: SQLiteDatabase, date: string, units: number): Promise<void> {
  if (units <= 0) return;
  await db.runAsync(
    `INSERT INTO quota_day (date, unitsUsed) VALUES (?, ?)
     ON CONFLICT (date) DO UPDATE SET unitsUsed = unitsUsed + excluded.unitsUsed`,
    [date, units],
  );
}

/** Gemini requests sent on `date` ("YYYY-MM-DD"), 0 if none. */
export async function getGeminiRequests(db: SQLiteDatabase, date: string): Promise<number> {
  const row = await db.getFirstAsync<{ geminiRequests: number }>(
    'SELECT geminiRequests FROM quota_day WHERE date = ?',
    [date],
  );
  return row?.geminiRequests ?? 0;
}

/**
 * Counts one Gemini request on its day. Gemini's free-tier daily limits also
 * reset at midnight Pacific Time, so it shares quota_day's date key.
 */
export async function addGeminiRequest(db: SQLiteDatabase, date: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO quota_day (date, unitsUsed, geminiRequests) VALUES (?, 0, 1)
     ON CONFLICT (date) DO UPDATE SET geminiRequests = geminiRequests + 1`,
    [date],
  );
}
