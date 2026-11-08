import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TopicIcon } from '@/components/TopicIcon';
import { textDirection } from '@/lib/textDirection';
import { colors, fontSize, fonts, radius, spacing } from '@/theme';

type Props = {
  name: string;
  removed: boolean;
  /** Restore was tapped on a removed item. */
  onRestore: () => void;
};

// One item on the Topics tab (§4) as a glass card: its icon and name, or for
// a removed item both in grey with a "Restore" button. The name takes the
// direction of its own text, like the titles in the feed.
export function ItemRow({ name, removed, onRestore }: Props) {
  return (
    <View style={[styles.row, removed && styles.removedRow]}>
      <TopicIcon name={name} muted={removed} />
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
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.tealMist,
    backgroundColor: colors.glass,
  },
  removedRow: {
    borderColor: colors.silverMuted,
  },
  name: {
    flex: 1,
    color: colors.silver,
    fontFamily: fonts.serif,
    fontSize: fontSize.topic,
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
