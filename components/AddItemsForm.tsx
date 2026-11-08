import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

export type FormMessage = { text: string; tone: 'error' | 'info' };

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  busy: boolean;
  onSubmit: () => void;
  message: FormMessage | null;
};

// The add form the Topics tab's + button opens (§4, F2): one text box for
// one or more topics separated by commas, an "Add" button, and how many were
// added and skipped as duplicates.
export function AddItemsForm({ value, onChangeText, busy, onSubmit, message }: Props) {
  const canSubmit = value.trim() !== '' && !busy;
  const submit = () => {
    if (canSubmit) onSubmit();
  };

  return (
    <View style={styles.form}>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Topics to add, separated by commas"
          autoCorrect={false}
          autoFocus
          editable={!busy}
          onChangeText={onChangeText}
          onSubmitEditing={submit}
          placeholder="black holes, volcanoes, octopus"
          placeholderTextColor={colors.silverMuted}
          returnKeyType="done"
          style={styles.input}
          value={value}
        />
        <PrimaryButton disabled={!canSubmit} label={busy ? 'Adding…' : 'Add'} onPress={submit} />
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
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
    borderColor: colors.sunset,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  message: {
    color: colors.silver,
    fontSize: fontSize.small,
  },
  error: {
    color: colors.cherryBlossom,
  },
});
