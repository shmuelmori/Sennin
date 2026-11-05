import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewFeedItem } from '@/lib/records';

import { getFeedItems, replaceFeed, setFeedItemStatus } from './feed';
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

function video(videoId: string): NewFeedItem {
  return {
    videoId,
    channelId: 'UCa',
    channelTitle: 'ערוץ היסטוריה',
    title: `Video ${videoId}`,
    durationSec: 59,
  };
}

describe('replaceFeed and getFeedItems', () => {
  it('starts empty', async () => {
    expect(await getFeedItems(db)).toEqual([]);
  });

  it('saves the feed first, then the reserve, all unseen', async () => {
    await replaceFeed(db, [video('a'), video('b')], [video('c')]);
    expect(await getFeedItems(db)).toEqual([
      { ...video('a'), position: 0, isReserve: false, status: 'unseen' },
      { ...video('b'), position: 1, isReserve: false, status: 'unseen' },
      { ...video('c'), position: 2, isReserve: true, status: 'unseen' },
    ]);
  });

  it('replaces the whole previous list', async () => {
    await replaceFeed(db, [video('a'), video('b')], [video('c')]);
    await setFeedItemStatus(db, 'a', 'watched');
    await replaceFeed(db, [video('d')], []);
    expect(await getFeedItems(db)).toEqual([
      { ...video('d'), position: 0, isReserve: false, status: 'unseen' },
    ]);
  });

  it('keeps the old list if the new one fails to save', async () => {
    await replaceFeed(db, [video('a')], []);
    // The same video twice breaks the UNIQUE constraint halfway through.
    await expect(replaceFeed(db, [video('x'), video('x')], [])).rejects.toThrow(/UNIQUE/);
    expect((await getFeedItems(db)).map((item) => item.videoId)).toEqual(['a']);
  });

  it('can clear the list', async () => {
    await replaceFeed(db, [video('a')], []);
    await replaceFeed(db, [], []);
    expect(await getFeedItems(db)).toEqual([]);
  });
});

describe('setFeedItemStatus', () => {
  it('updates only the given video', async () => {
    await replaceFeed(db, [video('a'), video('b')], [video('c')]);
    expect(await setFeedItemStatus(db, 'b', 'skipped')).toBe(true);
    expect((await getFeedItems(db)).map((item) => item.status)).toEqual([
      'unseen',
      'skipped',
      'unseen',
    ]);
  });

  it('returns false for a video that is not in the list', async () => {
    await replaceFeed(db, [video('a')], []);
    expect(await setFeedItemStatus(db, 'zzz', 'watched')).toBe(false);
  });
});
