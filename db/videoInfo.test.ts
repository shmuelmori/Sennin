import type { SQLiteDatabase } from 'expo-sqlite';

import { replaceFeed } from './feed';
import { addGeminiRequest, addUnitsUsed, getGeminiRequests, getUnitsUsed } from './quota';
import { initDatabase } from './schema';
import { openTestDatabase } from './testDatabase';
import { getVideoContext, getVideoInfo, saveVideoInfo } from './videoInfo';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await initDatabase(db);
});

afterEach(async () => {
  await db.closeAsync();
});

describe('getVideoInfo and saveVideoInfo', () => {
  it('returns null before an answer is saved', async () => {
    expect(await getVideoInfo(db, 'v')).toBeNull();
  });

  it('reads back a saved answer', async () => {
    const info = { videoId: 'v', text: 'הסבר', model: 'gemini-2.5-flash', createdAtMs: 5 };
    await saveVideoInfo(db, info);
    expect(await getVideoInfo(db, 'v')).toEqual(info);
  });

  it('replaces an earlier answer for the same video', async () => {
    await saveVideoInfo(db, { videoId: 'v', text: 'old', model: 'a', createdAtMs: 1 });
    await saveVideoInfo(db, { videoId: 'v', text: 'new', model: 'b', createdAtMs: 2 });
    expect(await getVideoInfo(db, 'v')).toEqual({
      videoId: 'v',
      text: 'new',
      model: 'b',
      createdAtMs: 2,
    });
  });
});

describe('getVideoContext', () => {
  it('reads the title, description, item name and channel of a video in the list', async () => {
    await replaceFeed(
      db,
      [
        {
          videoId: 'v',
          itemId: 1,
          itemName: 'Octopus',
          title: 'Eight arms',
          durationSec: 40,
          channelTitle: 'Sea Facts',
          description: 'All about arms.',
        },
      ],
      [],
    );
    expect(await getVideoContext(db, 'v')).toEqual({
      title: 'Eight arms',
      description: 'All about arms.',
      itemName: 'Octopus',
      channelTitle: 'Sea Facts',
    });
  });

  it('returns null for a video that is not in the list', async () => {
    expect(await getVideoContext(db, 'zzz')).toBeNull();
  });
});

describe('Gemini requests in quota_day', () => {
  it('counts requests per day', async () => {
    expect(await getGeminiRequests(db, '2026-11-10')).toBe(0);
    await addGeminiRequest(db, '2026-11-10');
    await addGeminiRequest(db, '2026-11-10');
    await addGeminiRequest(db, '2026-11-11');
    expect(await getGeminiRequests(db, '2026-11-10')).toBe(2);
    expect(await getGeminiRequests(db, '2026-11-11')).toBe(1);
  });

  it('keeps the YouTube units and the Gemini count apart on the same day', async () => {
    await addUnitsUsed(db, '2026-11-10', 2010);
    await addGeminiRequest(db, '2026-11-10');
    await addUnitsUsed(db, '2026-11-10', 10);
    expect(await getUnitsUsed(db, '2026-11-10')).toBe(2020);
    expect(await getGeminiRequests(db, '2026-11-10')).toBe(1);
  });
});
