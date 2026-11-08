// Queries for the quota_day table (spec §5 "Quota"): API units used per
// Pacific Time day. The date key comes from pacificDate in lib/quota.ts.

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
