import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewFeedItem } from '@/lib/records';

import { getFeedItems, replaceFeed, setFeedItemStatus } from './feed';
import { initDatabase } from './schema';
import { openTestDatabase } from './testDatabase';
import { getWatchedIds, markWatched, recordWatched } from './watched';

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

function video(videoId: string): NewFeedItem {
  return {
    videoId,
    itemId: 1,
    itemName: 'Octopus',
    title: videoId,
    durationSec: 60,
    channelTitle: '',
    description: '',
  };
}

async function statuses(): Promise<Record<string, string>> {
  const items = await getFeedItems(db);
  return Object.fromEntries(items.map((item) => [item.videoId, item.status]));
}

describe('recordWatched', () => {
  it('records the video and marks its feed item watched', async () => {
    await replaceFeed(db, [video('a'), video('b')], []);
    await recordWatched(db, 'a', 500);
    expect(await getWatchedIds(db)).toEqual(new Set(['a']));
    expect(await statuses()).toEqual({ a: 'watched', b: 'unseen' });
  });

  it('leaves a skipped feed item skipped', async () => {
    await replaceFeed(db, [video('a')], []);
    await setFeedItemStatus(db, 'a', 'skipped');
    await recordWatched(db, 'a', 500);
    expect(await statuses()).toEqual({ a: 'skipped' });
    expect(await getWatchedIds(db)).toEqual(new Set(['a']));
  });

  it('still records a video that is no longer in the list', async () => {
    await recordWatched(db, 'gone', 500);
    expect(await getWatchedIds(db)).toEqual(new Set(['gone']));
  });
});
