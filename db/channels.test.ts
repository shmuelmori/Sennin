import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewChannel } from '@/lib/records';

import { addChannel, listChannels, removeChannel, setChannelTopics } from './channels';
import { getFeedItems, replaceFeed } from './feed';
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

function channel(channelId: string, addedAtMs: number): NewChannel {
  return {
    channelId,
    title: `Channel ${channelId}`,
    uploadsPlaylistId: `UU${channelId}`,
    thumbnailUrl: `https://yt3.ggpht.com/${channelId}`,
    addedAtMs,
  };
}

describe('addChannel and listChannels', () => {
  it('saves a channel with its topics', async () => {
    expect(await addChannel(db, channel('UCa', 100), ['ww2'])).toBe(true);
    expect(await listChannels(db)).toEqual([{ ...channel('UCa', 100), topicIds: ['ww2'] }]);
  });

  it('lists channels oldest first, with topics in the order of lib/topics.ts', async () => {
    await addChannel(db, channel('UCb', 200), ['claude-code', 'ww2']);
    await addChannel(db, channel('UCa', 100), ['claude-code']);
    const channels = await listChannels(db);
    expect(channels.map((c) => c.channelId)).toEqual(['UCa', 'UCb']);
    expect(channels[1].topicIds).toEqual(['ww2', 'claude-code']);
  });

  it('keeps a missing thumbnail as null', async () => {
    await addChannel(db, { ...channel('UCa', 100), thumbnailUrl: null }, ['ww2']);
    expect((await listChannels(db))[0].thumbnailUrl).toBeNull();
  });

  it('ignores a repeated topic', async () => {
    await addChannel(db, channel('UCa', 100), ['ww2', 'ww2']);
    expect((await listChannels(db))[0].topicIds).toEqual(['ww2']);
  });

  it('returns false and changes nothing for a channel that is already saved', async () => {
    await addChannel(db, channel('UCa', 100), ['ww2']);
    expect(await addChannel(db, { ...channel('UCa', 999), title: 'New' }, ['claude-code'])).toBe(
      false,
    );
    expect(await listChannels(db)).toEqual([{ ...channel('UCa', 100), topicIds: ['ww2'] }]);
  });

  it('saves nothing if a topic is unknown', async () => {
    // @ts-expect-error: not a TopicId, as could happen with bad data
    await expect(addChannel(db, channel('UCa', 100), ['history'])).rejects.toThrow();
    expect(await listChannels(db)).toEqual([]);
  });
});

describe('setChannelTopics', () => {
  it('replaces the topics', async () => {
    await addChannel(db, channel('UCa', 100), ['ww2']);
    await setChannelTopics(db, 'UCa', ['claude-code']);
    expect((await listChannels(db))[0].topicIds).toEqual(['claude-code']);
    await setChannelTopics(db, 'UCa', ['ww2', 'claude-code']);
    expect((await listChannels(db))[0].topicIds).toEqual(['ww2', 'claude-code']);
  });

  it("doesn't touch other channels", async () => {
    await addChannel(db, channel('UCa', 100), ['ww2']);
    await addChannel(db, channel('UCb', 200), ['ww2']);
    await setChannelTopics(db, 'UCa', ['claude-code']);
    expect((await listChannels(db))[1].topicIds).toEqual(['ww2']);
  });

  it('fails for a channel that is not saved', async () => {
    await expect(setChannelTopics(db, 'UCmissing', ['ww2'])).rejects.toThrow(/FOREIGN KEY/);
  });
});

describe('removeChannel', () => {
  it('removes the channel and its topics', async () => {
    await addChannel(db, channel('UCa', 100), ['ww2', 'claude-code']);
    await addChannel(db, channel('UCb', 200), ['ww2']);
    expect(await removeChannel(db, 'UCa')).toBe(true);
    expect((await listChannels(db)).map((c) => c.channelId)).toEqual(['UCb']);
    expect(await db.getAllAsync('SELECT channelId FROM channel_topic')).toEqual([
      { channelId: 'UCb' },
    ]);
  });

  it('returns false for a channel that is not saved', async () => {
    expect(await removeChannel(db, 'UCmissing')).toBe(false);
  });

  it("keeps the channel's videos in the list (F2)", async () => {
    await addChannel(db, channel('UCa', 100), ['ww2']);
    const video = {
      videoId: 'v1',
      channelId: 'UCa',
      channelTitle: 'Channel UCa',
      title: 'Video',
      durationSec: 60,
    };
    await replaceFeed(db, [video], []);
    await removeChannel(db, 'UCa');
    expect(await getFeedItems(db)).toEqual([
      { ...video, position: 0, isReserve: false, status: 'unseen' },
    ]);
  });
});
