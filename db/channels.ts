// Queries for the channel and channel_topic tables (F1, F2, F3).

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Channel, NewChannel } from '@/lib/records';
import { TOPICS, type TopicId } from '@/lib/topics';

type ChannelRow = {
  channelId: string;
  title: string;
  uploadsPlaylistId: string;
  thumbnailUrl: string | null;
  addedAt: number;
};

type ChannelTopicRow = { channelId: string; topicId: string };

async function insertTopics(
  db: SQLiteDatabase,
  channelId: string,
  topicIds: readonly TopicId[],
): Promise<void> {
  for (const topicId of new Set(topicIds)) {
    await db.runAsync('INSERT INTO channel_topic (channelId, topicId) VALUES (?, ?)', [
      channelId,
      topicId,
    ]);
  }
}

/**
 * Saves a channel with its topics. Returns false, and changes nothing, if the
 * channel is already saved.
 */
export async function addChannel(
  db: SQLiteDatabase,
  channel: NewChannel,
  topicIds: readonly TopicId[],
): Promise<boolean> {
  let added = false;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO channel (channelId, title, uploadsPlaylistId, thumbnailUrl, addedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [
        channel.channelId,
        channel.title,
        channel.uploadsPlaylistId,
        channel.thumbnailUrl,
        channel.addedAtMs,
      ],
    );
    added = result.changes > 0;
    if (added) {
      await insertTopics(db, channel.channelId, topicIds);
    }
  });
  return added;
}

/**
 * Removes a channel and its topic links. Its videos stay in feed_item (F2).
 * Returns false if the channel wasn't saved.
 */
export async function removeChannel(db: SQLiteDatabase, channelId: string): Promise<boolean> {
  let removed = false;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM channel_topic WHERE channelId = ?', [channelId]);
    const result = await db.runAsync('DELETE FROM channel WHERE channelId = ?', [channelId]);
    removed = result.changes > 0;
  });
  return removed;
}

/** Replaces the channel's topics (F3). */
export async function setChannelTopics(
  db: SQLiteDatabase,
  channelId: string,
  topicIds: readonly TopicId[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM channel_topic WHERE channelId = ?', [channelId]);
    await insertTopics(db, channelId, topicIds);
  });
}

/** All channels with their topics, oldest first. */
export async function listChannels(db: SQLiteDatabase): Promise<Channel[]> {
  const rows = await db.getAllAsync<ChannelRow>(
    `SELECT channelId, title, uploadsPlaylistId, thumbnailUrl, addedAt
     FROM channel ORDER BY addedAt, channelId`,
  );
  const links = await db.getAllAsync<ChannelTopicRow>(
    'SELECT channelId, topicId FROM channel_topic',
  );

  const topicsByChannel = new Map<string, Set<string>>();
  for (const { channelId, topicId } of links) {
    const topics = topicsByChannel.get(channelId) ?? new Set<string>();
    topics.add(topicId);
    topicsByChannel.set(channelId, topics);
  }

  // Topics come back in the order of lib/topics.ts.
  return rows.map((row) => ({
    channelId: row.channelId,
    title: row.title,
    uploadsPlaylistId: row.uploadsPlaylistId,
    thumbnailUrl: row.thumbnailUrl,
    addedAtMs: row.addedAt,
    topicIds: TOPICS.map((topic) => topic.id).filter(
      (id) => topicsByChannel.get(row.channelId)?.has(id) ?? false,
    ),
  }));
}
