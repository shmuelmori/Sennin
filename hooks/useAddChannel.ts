import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { addChannel } from '@/db/channels';
import { useDatabase } from '@/db/DatabaseProvider';
import { parseChannelInput } from '@/lib/channelInput';
import {
  describeAdded,
  describeAlreadyAdded,
  describeChannelInputError,
  describeLookup,
  describeResolveError,
  NO_TOPIC_MESSAGE,
} from '@/lib/channelMessages';
import { toggleTopic } from '@/lib/topicSelection';
import type { TopicId } from '@/lib/topics';
import { describeYoutubeError } from '@/lib/youtubeErrors';
import { createYoutubeClient } from '@/services/youtube';

// The "Add a channel" form on the Sources screen (F1, step 5.2): parses the
// pasted link or @handle, resolves it with one channels.list call (1 unit),
// and saves the channel with the picked topics.

export type AddChannelState =
  | { status: 'idle' }
  | { status: 'adding' }
  | { status: 'added' | 'failed'; message: string };

function log(line: string) {
  console.log(`[sources] ${line}`);
}

function failed(message: string): AddChannelState {
  return { status: 'failed', message };
}

async function addFromInput(
  db: SQLiteDatabase,
  input: string,
  topicIds: readonly TopicId[],
): Promise<AddChannelState> {
  const lookup = parseChannelInput(input);
  if (lookup.kind === 'invalid') {
    return failed(describeChannelInputError(lookup.reason));
  }
  if (topicIds.length === 0) {
    return failed(NO_TOPIC_MESSAGE);
  }
  const created = createYoutubeClient();
  if (!created.ok) {
    return failed(describeYoutubeError(created.error));
  }
  const client = created.value;

  const resolved = await client.resolveChannel(lookup);
  const units = `${client.unitsUsed()} unit${client.unitsUsed() === 1 ? '' : 's'}`;
  if (!resolved.ok) {
    const { kind, status, message } = resolved.error;
    log(`resolving ${describeLookup(lookup)} failed: ${kind} (HTTP ${status ?? '-'}): ${message}, ${units}`);
    return failed(describeResolveError(resolved.error, lookup));
  }
  const channel = resolved.value;

  try {
    const added = await addChannel(db, { ...channel, addedAtMs: Date.now() }, topicIds);
    log(`${added ? 'added' : 'already saved'}: ${channel.title} (${channel.channelId}), ${units}`);
    return added
      ? { status: 'added', message: describeAdded(channel.title) }
      : failed(describeAlreadyAdded(channel.title));
  } catch (cause) {
    log(`saving ${channel.channelId} failed: ${String(cause)}`);
    return failed(`Couldn't save ${channel.title}.`);
  }
}

/** `onAdded` runs after a channel is saved, e.g. to read the list again. */
export function useAddChannel(onAdded: () => Promise<void>) {
  const db = useDatabase();
  const [input, setInputText] = useState('');
  const [topicIds, setTopicIds] = useState<TopicId[]>([]);
  const [state, setState] = useState<AddChannelState>({ status: 'idle' });
  const running = useRef(false);

  /** Typing clears the last message. */
  const setInput = useCallback((text: string) => {
    setInputText(text);
    setState((current) => (current.status === 'adding' ? current : { status: 'idle' }));
  }, []);

  const toggleFormTopic = useCallback((topicId: TopicId) => {
    setTopicIds((current) => toggleTopic(current, topicId) ?? current);
  }, []);

  const submit = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ status: 'adding' });
    try {
      const result = await addFromInput(db, input, topicIds);
      setState(result);
      if (result.status === 'added') {
        // The topics stay picked, for adding several channels of the same topic.
        setInputText('');
        await onAdded();
      }
    } finally {
      running.current = false;
    }
  }, [db, input, topicIds, onAdded]);

  return { input, setInput, topicIds, toggleTopic: toggleFormTopic, state, submit };
}
