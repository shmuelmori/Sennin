import { Stack } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { AddChannelForm, type FormMessage } from '@/components/AddChannelForm';
import { ChannelRow } from '@/components/ChannelRow';
import { Divider } from '@/components/Divider';
import { SwipeToRemove } from '@/components/SwipeToRemove';
import { useAddChannel, type AddChannelState } from '@/hooks/useAddChannel';
import { useChannels } from '@/hooks/useChannels';
import { canAddChannel, topicOptions } from '@/lib/topicSelection';
import { colors, fontSize, spacing } from '@/theme';

function formMessage(state: AddChannelState): FormMessage | null {
  switch (state.status) {
    case 'idle':
    case 'adding':
      return null;
    case 'added':
      return { text: state.message, tone: 'info' };
    case 'failed':
      return { text: state.message, tone: 'error' };
  }
}

// Sources screen (spec §4, F1–F3): add a channel by link or @handle, see the
// saved channels, swipe one to remove it, and tap its topic tags to assign it.
export default function SourcesScreen() {
  const { channels, error, reload, remove, toggleTopic } = useChannels();
  const add = useAddChannel(reload);

  const hint =
    channels === null
      ? null
      : channels.length === 0
        ? 'No channels yet. Paste a channel link or @handle above.'
        : `${channels.length} channel${channels.length === 1 ? '' : 's'}. ` +
          'Swipe a channel sideways to remove it, and tap a topic to switch it on or off.';

  return (
    <>
      <Stack.Screen options={{ title: 'Sources' }} />
      <View style={styles.screen}>
        <AddChannelForm
          value={add.input}
          onChangeText={add.setInput}
          topics={topicOptions(add.topicIds)}
          onToggleTopic={add.toggleTopic}
          canSubmit={canAddChannel(add.input, add.topicIds)}
          busy={add.state.status === 'adding'}
          onSubmit={add.submit}
          message={formMessage(add.state)}
        />
        {error !== null && <Text style={[styles.note, styles.error]}>{error}</Text>}
        {hint !== null && <Text style={styles.note}>{hint}</Text>}
        <FlatList
          data={channels ?? []}
          keyExtractor={(channel) => channel.channelId}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => (
            <SwipeToRemove
              actionLabel="Remove"
              accessibilityLabel={`Remove ${item.title}`}
              onRemove={() => remove(item)}
            >
              <ChannelRow
                title={item.title}
                thumbnailUrl={item.thumbnailUrl}
                topics={topicOptions(item.topicIds)}
                onToggleTopic={(topicId) => toggleTopic(item, topicId)}
              />
            </SwipeToRemove>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
  note: {
    color: colors.silverMuted,
    fontSize: fontSize.small,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.xs,
  },
  error: {
    color: colors.cherryBlossom,
  },
});
