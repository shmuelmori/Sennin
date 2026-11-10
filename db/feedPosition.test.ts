import type { SQLiteDatabase } from 'expo-sqlite';

import { replaceFeed } from './feed';
import { getFeedPosition, saveFeedPosition } from './feedPosition';
import { initDatabase } from './schema';
import { openTestDatabase } from './testDatabase';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await initDatabase(db);
});

afterEach(async () => {
  await db.closeAsync();
});

describe('getFeedPosition and saveFeedPosition', () => {
  it('starts with nothing saved', async () => {
    expect(await getFeedPosition(db)).toBeNull();
  });

  it('keeps only the last saved page', async () => {
    await saveFeedPosition(db, 'a');
    await saveFeedPosition(db, 'b');
    expect(await getFeedPosition(db)).toEqual({ videoId: 'b' });
    expect(await db.getAllAsync('SELECT id FROM feed_position')).toEqual([{ id: 1 }]);
  });

  it('saves the end page as null', async () => {
    await saveFeedPosition(db, 'a');
    await saveFeedPosition(db, null);
    expect(await getFeedPosition(db)).toEqual({ videoId: null });
  });

  it('is cleared when a new list is saved', async () => {
    await saveFeedPosition(db, 'a');
    await replaceFeed(
      db,
      [{ videoId: 'x', itemId: 1, itemName: 'Octopus', title: 'X', durationSec: 30 }],
      [],
    );
    expect(await getFeedPosition(db)).toBeNull();
  });
});
