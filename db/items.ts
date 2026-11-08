// Queries for the item table (spec §7, F1–F3): the flat list of topics.

import type { SQLiteDatabase } from 'expo-sqlite';

import { cleanName } from '@/lib/itemInput';
import type { Item } from '@/lib/records';

type ItemRow = {
  id: number;
  name: string;
  query: string;
  removed: number;
  removedAt: number | null;
  lastPickedAt: number | null;
  pickCount: number;
  createdAt: number;
};

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    query: row.query,
    removed: row.removed === 1,
    removedAtMs: row.removedAt,
    lastPickedAtMs: row.lastPickedAt,
    pickCount: row.pickCount,
    createdAtMs: row.createdAt,
  };
}

/** Every item, removed ones included, in ID order. The Topics tab sorts them. */
export async function listItems(db: SQLiteDatabase): Promise<Item[]> {
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT id, name, query, removed, removedAt, lastPickedAt, pickCount, createdAt
     FROM item ORDER BY id`,
  );
  return rows.map(toItem);
}

/**
 * Adds items whose query is the name itself (F2). A name already saved,
 * ignoring case, is skipped. Returns how many were added.
 */
export async function addItems(
  db: SQLiteDatabase,
  names: readonly string[],
  nowMs: number,
): Promise<number> {
  let added = 0;
  await db.withTransactionAsync(async () => {
    for (const name of names) {
      const clean = cleanName(name);
      if (clean === '') continue;
      const result = await db.runAsync(
        'INSERT OR IGNORE INTO item (name, query, createdAt) VALUES (?, ?, ?)',
        [clean, clean, nowMs],
      );
      added += result.changes;
    }
  });
  return added;
}

/** Removes an item from the draw, or restores it (F3). Returns false if there is no such item. */
export async function setItemRemoved(
  db: SQLiteDatabase,
  itemId: number,
  removed: boolean,
  nowMs: number,
): Promise<boolean> {
  const result = await db.runAsync('UPDATE item SET removed = ?, removedAt = ? WHERE id = ?', [
    removed ? 1 : 0,
    removed ? nowMs : null,
    itemId,
  ]);
  return result.changes > 0;
}

/** Deletes an item for good (F3). Its videos already in the list stay. */
export async function deleteItem(db: SQLiteDatabase, itemId: number): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM item WHERE id = ?', [itemId]);
  return result.changes > 0;
}

/** §5 step 6: the drawn items were used, so their weight starts over and their search rotates. */
export async function markItemsPicked(
  db: SQLiteDatabase,
  itemIds: readonly number[],
  nowMs: number,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const itemId of new Set(itemIds)) {
      await db.runAsync(
        'UPDATE item SET lastPickedAt = ?, pickCount = pickCount + 1 WHERE id = ?',
        [nowMs, itemId],
      );
    }
  });
}

/** The IDs of removed items, for the Feed's remove buttons. */
export async function getRemovedItemIds(db: SQLiteDatabase): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ id: number }>('SELECT id FROM item WHERE removed = 1');
  return new Set(rows.map((row) => row.id));
}
