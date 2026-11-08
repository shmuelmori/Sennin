import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, sizes, spacing } from '@/theme';

type Props = {
  /** A fetch is running: the button shows it and ignores taps. */
  busy: boolean;
  /** Not enough quota left today (F12): the button is dimmed and ignores taps. */
  disabled?: boolean;
  onPress: () => void;
};

// The Refresh tab's large Sunset pill (spec §4 "Refresh"), with a soft Sunset
// glow. Text on Sunset is Deep Sea Night and bold (§11). While a fetch runs it
// is disabled and shows a spinner with "Fetching…". With too little quota
// left it is disabled and loses its glow; the screen says why.
export function RefreshButton({ busy, disabled = false, onPress }: Props) {
  const off = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Fetching' : 'Refresh'}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, off && styles.off]}
    >
      <View style={styles.content}>
        {busy ? (
          <ActivityIndicator color={colors.deepSeaNight} />
        ) : (
          <Ionicons name="sync" color={colors.deepSeaNight} size={28} />
        )}
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
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.cherryBlossom,
    backgroundImage: `linear-gradient(to bottom, ${colors.sunset}, ${colors.sunsetDeep})`,
    boxShadow: `0 0 22px ${colors.sunsetGlow}`,
  },
  pressed: {
    opacity: 0.8,
  },
  off: {
    opacity: 0.55,
    boxShadow: [],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  label: {
    color: colors.deepSeaNight,
    fontSize: fontSize.button + 4,
    fontWeight: 'bold',
  },
});
