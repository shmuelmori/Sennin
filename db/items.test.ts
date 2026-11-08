import type { SQLiteDatabase } from 'expo-sqlite';

import {
  addItems,
  deleteItem,
  getRemovedItemIds,
  listItems,
  markItemsPicked,
  setItemRemoved,
} from './items';
import { addUnitsUsed, getUnitsUsed } from './quota';
import { initDatabase } from './schema';
import { openTestDatabase } from './testDatabase';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await initDatabase(db);
  // Start from an empty list, so the tests don't depend on the seed.
  await db.runAsync('DELETE FROM item');
});

afterEach(async () => {
  await db.closeAsync();
});

describe('addItems and listItems', () => {
  it('adds items whose query is the typed name, active and never drawn', async () => {
    expect(await addItems(db, ['black holes', ' octopus '], 50)).toBe(2);
    const items = await listItems(db);
    expect(items.map(({ name, query }) => ({ name, query }))).toEqual([
      { name: 'black holes', query: 'black holes' },
      { name: 'octopus', query: 'octopus' },
    ]);
    expect(items[0]).toMatchObject({
      removed: false,
      removedAtMs: null,
      lastPickedAtMs: null,
      pickCount: 0,
      createdAtMs: 50,
    });
  });

  it('skips a name that is already saved, ignoring case', async () => {
    await addItems(db, ['Octopus'], 1);
    expect(await addItems(db, ['OCTOPUS', 'iron', ''], 2)).toBe(1);
    expect((await listItems(db)).map((item) => item.name)).toEqual(['Octopus', 'iron']);
  });
});

describe('setItemRemoved', () => {
  it('removes and restores an item', async () => {
    await addItems(db, ['iron'], 1);
    const [iron] = await listItems(db);
    expect(await setItemRemoved(db, iron.id, true, 99)).toBe(true);
    expect((await listItems(db))[0]).toMatchObject({ removed: true, removedAtMs: 99 });
    expect(await getRemovedItemIds(db)).toEqual(new Set([iron.id]));
    await setItemRemoved(db, iron.id, false, 100);
    expect((await listItems(db))[0]).toMatchObject({ removed: false, removedAtMs: null });
    expect(await getRemovedItemIds(db)).toEqual(new Set());
  });

  it('returns false for an unknown item', async () => {
    expect(await setItemRemoved(db, 12345, true, 1)).toBe(false);
  });
});

describe('deleteItem', () => {
  it('deletes the item for good', async () => {
    await addItems(db, ['iron', 'gold'], 1);
    const [iron] = await listItems(db);
    expect(await deleteItem(db, iron.id)).toBe(true);
    expect((await listItems(db)).map((item) => item.name)).toEqual(['gold']);
    expect(await deleteItem(db, iron.id)).toBe(false);
  });
});

describe('markItemsPicked', () => {
  it('sets lastPickedAt and counts each pick once', async () => {
    await addItems(db, ['iron', 'gold'], 1);
    const [iron, gold] = await listItems(db);
    await markItemsPicked(db, [iron.id, iron.id], 500);
    await markItemsPicked(db, [iron.id], 900);
    const [ironAfter, goldAfter] = await listItems(db);
    expect(ironAfter).toMatchObject({ lastPickedAtMs: 900, pickCount: 2 });
    expect(goldAfter).toMatchObject({ id: gold.id, lastPickedAtMs: null, pickCount: 0 });
  });
});

describe('quota_day', () => {
  it('starts at 0 and adds up the units per day', async () => {
    expect(await getUnitsUsed(db, '2026-11-08')).toBe(0);
    await addUnitsUsed(db, '2026-11-08', 2010);
    await addUnitsUsed(db, '2026-11-08', 1005);
    await addUnitsUsed(db, '2026-11-09', 7);
    await addUnitsUsed(db, '2026-11-09', 0);
    expect(await getUnitsUsed(db, '2026-11-08')).toBe(3015);
    expect(await getUnitsUsed(db, '2026-11-09')).toBe(7);
  });
});
