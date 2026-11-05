import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { TopicOption } from '@/lib/topicSelection';
import type { TopicId } from '@/lib/topics';
import { colors, fontSize, radius, spacing } from '@/theme';

import { PrimaryButton } from './PrimaryButton';
import { TopicChip } from './TopicChip';

export type FormMessage = { text: string; tone: 'error' | 'info' };

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  topics: readonly TopicOption[];
  onToggleTopic: (topicId: TopicId) => void;
  /** Input and at least one topic are there. */
  canSubmit: boolean;
  busy: boolean;
  onSubmit: () => void;
  message: FormMessage | null;
};

// "Add a channel" at the top of the Sources screen (F1): a link or @handle,
// the topics to assign (F3), and the result or error of the last attempt.
export function AddChannelForm({
  value,
  onChangeText,
  topics,
  onToggleTopic,
  canSubmit,
  busy,
  onSubmit,
  message,
}: Props) {
  const submit = () => {
    if (canSubmit && !busy) onSubmit();
  };

  return (
    <View style={styles.form}>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Channel link or @handle"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          onChangeText={onChangeText}
          onSubmitEditing={submit}
          placeholder="Channel link or @handle"
          placeholderTextColor={colors.silverMuted}
          returnKeyType="done"
          style={styles.input}
          value={value}
        />
        <PrimaryButton
          disabled={!canSubmit || busy}
          label={busy ? 'Adding…' : 'Add'}
          onPress={submit}
        />
      </View>
      <View style={styles.topics}>
        <Text style={styles.topicsLabel}>Topics:</Text>
        {topics.map((topic) => (
          <TopicChip
            key={topic.id}
            disabled={busy}
            label={topic.name}
            selected={topic.selected}
            onPress={() => onToggleTopic(topic.id)}
          />
        ))}
      </View>
      {message !== null && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.message, message.tone === 'error' && styles.error]}
        >
          {message.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderBottomColor: colors.tealMist,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.silver,
    fontSize: fontSize.body,
    borderColor: colors.tealMist,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topicsLabel: {
    color: colors.silverMuted,
    fontSize: fontSize.small,
  },
  message: {
    color: colors.silver,
    fontSize: fontSize.small,
  },
  error: {
    color: colors.cherryBlossom,
  },
});
