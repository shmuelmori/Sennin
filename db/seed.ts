// The initial item list (spec F1): db/seed.json, written into the item table
// once, by the v3 migration in db/schema.ts, when the table is empty. After
// that it never runs again; the database is the only source of the list.

import type { SQLiteDatabase } from 'expo-sqlite';

import { cleanName } from '@/lib/itemInput';

import seed from './seed.json';

type SeedEntry = { name: string; query: string };

export const SEED_ITEMS: readonly SeedEntry[] = seed;

/** Inserts the seed list if the item table is empty. Returns how many items it added. */
export async function seedItems(db: SQLiteDatabase, nowMs: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM item');
  if ((row?.count ?? 0) > 0) {
    return 0;
  }
  let added = 0;
  for (const entry of SEED_ITEMS) {
    const result = await db.runAsync(
      'INSERT OR IGNORE INTO item (name, query, createdAt) VALUES (?, ?, ?)',
      [cleanName(entry.name), entry.query.trim(), nowMs],
    );
    added += result.changes;
  }
  return added;
}
