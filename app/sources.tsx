import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddChannelForm, type FormMessage } from '@/components/AddChannelForm';
import { ChannelRow } from '@/components/ChannelRow';
import { useAddChannel, type AddChannelState } from '@/hooks/useAddChannel';
import { useChannels } from '@/hooks/useChannels';
import type { Channel } from '@/lib/records';
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

function CardGap() {
  return <View style={styles.gap} />;
}

// Expo Router requires a default export for route files.
// Sources screen (spec §4, F1–F3): add a channel by link or @handle, see the
// saved channels as cards, remove one with its trash button (after asking),
// and tap its topic tags to assign it.
export default function SourcesScreen() {
  const { channels, error, reload, remove, toggleTopic } = useChannels();
  const add = useAddChannel(reload);

  const confirmRemove = (channel: Channel) => {
    Alert.alert(`Remove ${channel.title}?`, 'Videos already in your list stay there.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void remove(channel) },
    ]);
  };

  const hint =
    channels === null
      ? null
      : channels.length === 0
        ? 'No channels yet. Paste a channel link or @handle above.'
        : `${channels.length} channel${channels.length === 1 ? '' : 's'}. ` +
          'Tap a topic to switch it on or off, or the trash button to remove a channel.';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={CardGap}
        renderItem={({ item }) => (
          <ChannelRow
            title={item.title}
            thumbnailUrl={item.thumbnailUrl}
            topics={topicOptions(item.topicIds)}
            onToggleTopic={(topicId) => toggleTopic(item, topicId)}
            onRemove={() => confirmRemove(item)}
          />
        )}
      />
    </SafeAreaView>
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
  list: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  gap: {
    height: spacing.sm,
  },
});
