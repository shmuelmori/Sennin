import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textDirection } from '@/lib/textDirection';
import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  name: string;
  removed: boolean;
  /** Restore was tapped on a removed item. */
  onRestore: () => void;
};

// One item on the Topics tab (§4): its name, or for a removed item the name
// in grey with a "Restore" button. The name takes the direction of its own
// text, like the titles in the feed.
export function ItemRow({ name, removed, onRestore }: Props) {
  return (
    <View style={styles.row}>
      <Text
        numberOfLines={1}
        style={[styles.name, removed && styles.removed, { direction: textDirection(name) ?? 'inherit' }]}
      >
        {name}
      </Text>
      {removed && (
        <Pressable
          accessibilityLabel={`Restore ${name}`}
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={onRestore}
          style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
        >
          <Text style={styles.restoreLabel}>Restore</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.deepSeaNight,
  },
  name: {
    flex: 1,
    color: colors.silver,
    fontSize: fontSize.body,
  },
  removed: {
    color: colors.silverMuted,
  },
  restore: {
    backgroundColor: colors.tealMist,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  pressed: {
    opacity: 0.7,
  },
  restoreLabel: {
    color: colors.deepSeaNight,
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
});
