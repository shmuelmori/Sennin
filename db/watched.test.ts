import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from './schema';
import { openTestDatabase } from './testDatabase';
import { getWatchedIds, markWatched } from './watched';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await initDatabase(db);
});

afterEach(async () => {
  await db.closeAsync();
});

describe('markWatched and getWatchedIds', () => {
  it('starts empty', async () => {
    expect(await getWatchedIds(db)).toEqual(new Set());
  });

  it('returns every watched video', async () => {
    await markWatched(db, 'a', 100);
    await markWatched(db, 'b', 200);
    expect(await getWatchedIds(db)).toEqual(new Set(['a', 'b']));
  });

  it('keeps the first time when a video is marked twice', async () => {
    await markWatched(db, 'a', 100);
    await markWatched(db, 'a', 200);
    expect(await db.getAllAsync('SELECT videoId, watchedAt FROM watched')).toEqual([
      { videoId: 'a', watchedAt: 100 },
    ]);
  });
});
