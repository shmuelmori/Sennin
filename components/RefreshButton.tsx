import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, sizes, spacing } from '@/theme';

type Props = {
  /** A fetch is running: the button shows it and ignores taps. */
  busy: boolean;
  onPress: () => void;
};

// The Refresh tab's large Sunset button (spec §4 "Refresh"). Text on Sunset
// is Deep Sea Night and bold (§11). While a fetch runs it is disabled and
// shows a spinner with "Fetching…".
export function RefreshButton({ busy, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Fetching' : 'Refresh'}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.busy]}
    >
      <View style={styles.content}>
        {busy && <ActivityIndicator color={colors.deepSeaNight} />}
        <Text style={styles.label}>{busy ? 'Fetching…' : 'Refresh'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: sizes.refreshButtonWidth,
    minHeight: sizes.refreshButtonHeight,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.sunset,
  },
  pressed: {
    opacity: 0.7,
  },
  busy: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.deepSeaNight,
    fontSize: fontSize.button,
    fontWeight: 'bold',
  },
});
