import type { SQLiteDatabase } from 'expo-sqlite';

import { applySkip, planSkip } from '@/lib/autoSkip';
import type { NewFeedItem } from '@/lib/records';

import { getFeedItems, replaceFeed, setFeedItemStatus, skipFeedItem } from './feed';
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

describe('skipFeedItem', () => {
  it('puts the replacement in the skipped video’s place and marks it skipped', async () => {
    await replaceFeed(db, [video('a'), video('b')], [video('r1'), video('r2')]);
    expect(await skipFeedItem(db, 'a', 'r1')).toBe(true);
    const items = await getFeedItems(db);
    expect(items.map(({ videoId, position, isReserve, status }) => ({
      videoId,
      position,
      isReserve,
      status,
    }))).toEqual([
      { videoId: 'r1', position: 0, isReserve: false, status: 'unseen' },
      { videoId: 'b', position: 1, isReserve: false, status: 'unseen' },
      { videoId: 'a', position: 2, isReserve: true, status: 'skipped' },
      { videoId: 'r2', position: 3, isReserve: true, status: 'unseen' },
    ]);
  });

  it('only marks the video skipped when there is no replacement', async () => {
    await replaceFeed(db, [video('a'), video('b')], []);
    expect(await skipFeedItem(db, 'a', null)).toBe(true);
    const items = await getFeedItems(db);
    expect(items.map((item) => [item.videoId, item.position, item.status])).toEqual([
      ['a', 0, 'skipped'],
      ['b', 1, 'unseen'],
    ]);
  });

  it('matches applySkip in lib/autoSkip.ts', async () => {
    await replaceFeed(db, [video('a'), video('b'), video('c')], [video('r1'), video('r2')]);
    const before = await getFeedItems(db);
    const plan = planSkip(before, 'b');
    if (!plan) throw new Error('expected a plan');
    await skipFeedItem(db, 'b', plan.replacement?.videoId ?? null);
    const expected = applySkip(before, plan).sort((x, y) => x.position - y.position);
    expect(await getFeedItems(db)).toEqual(expected);
  });

  it('returns false and changes nothing for an unknown video or replacement', async () => {
    await replaceFeed(db, [video('a')], [video('r1')]);
    const before = await getFeedItems(db);
    expect(await skipFeedItem(db, 'zzz', 'r1')).toBe(false);
    expect(await skipFeedItem(db, 'a', 'zzz')).toBe(false);
    expect(await getFeedItems(db)).toEqual(before);
  });
});
