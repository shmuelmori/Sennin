import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { listChannels, removeChannel, setChannelTopics } from '@/db/channels';
import { useDatabase } from '@/db/DatabaseProvider';
import type { Channel } from '@/lib/records';
import { toggleTopic } from '@/lib/topicSelection';
import type { TopicId } from '@/lib/topics';

// The saved channels for the Sources screen (steps 5.1 and 5.3): reads them
// from SQLite, removes a channel (F2) and changes its topics (F3). Changes
// show at once and are then saved; if saving fails, the list is read again.

function log(line: string) {
  console.log(`[sources] ${line}`);
}

/** The saved channels, or null if reading them failed. */
async function readChannels(db: SQLiteDatabase): Promise<Channel[] | null> {
  try {
    return await listChannels(db);
  } catch (cause) {
    log(`reading channels failed: ${String(cause)}`);
    return null;
  }
}

export function useChannels() {
  const db = useDatabase();
  /** null until the first read finishes. */
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const show = useCallback((read: Channel[] | null) => {
    if (read === null) {
      setError("Couldn't read your channels.");
    } else {
      setChannels(read);
    }
  }, []);

  const reload = useCallback(async () => show(await readChannels(db)), [db, show]);

  useEffect(() => {
    let active = true;
    void readChannels(db).then((read) => {
      if (active) show(read);
    });
    return () => {
      active = false;
    };
  }, [db, show]);

  const remove = useCallback(
    async (channel: Channel) => {
      setError(null);
      setChannels((current) => current?.filter((c) => c.channelId !== channel.channelId) ?? null);
      try {
        await removeChannel(db, channel.channelId);
        log(`removed ${channel.title} (${channel.channelId})`);
      } catch (cause) {
        log(`removing ${channel.channelId} failed: ${String(cause)}`);
        setError(`Couldn't remove ${channel.title}.`);
        await reload();
      }
    },
    [db, reload],
  );

  const toggleChannelTopic = useCallback(
    async (channel: Channel, topicId: TopicId) => {
      const topicIds = toggleTopic(channel.topicIds, topicId);
      if (topicIds === null) {
        return; // the channel's only topic stays (F3)
      }
      setError(null);
      setChannels(
        (current) =>
          current?.map((c) => (c.channelId === channel.channelId ? { ...c, topicIds } : c)) ?? null,
      );
      try {
        await setChannelTopics(db, channel.channelId, topicIds);
      } catch (cause) {
        log(`saving topics of ${channel.channelId} failed: ${String(cause)}`);
        setError(`Couldn't change the topics of ${channel.title}.`);
        await reload();
      }
    },
    [db, reload],
  );

  return { channels, error, reload, remove, toggleTopic: toggleChannelTopic };
}
