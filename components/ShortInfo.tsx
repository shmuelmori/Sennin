import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textDirection } from '@/lib/textDirection';
import { colors, fontSize, sizes, spacing } from '@/theme';

type Props = {
  itemName: string;
  title: string;
  height: number;
  /** False once the item is removed (or deleted), so the button hides. */
  removable: boolean;
  onRemove: () => void;
};

// The strip above a feed video (§4): the item name, the title under it, and a
// small remove button at the side. It ends where the player starts, so it
// never covers the player. Each line takes the direction of its own text
// (step 9.3), so a Hebrew title starts on the right and an English one on the
// left, whatever the phone's language.
export function ShortInfo({ itemName, title, height, removable, onRemove }: Props) {
  return (
    <View style={[styles.strip, { height }]}>
      <View style={styles.text}>
        <Text
          style={[styles.item, { direction: textDirection(itemName) ?? 'inherit' }]}
          numberOfLines={1}
        >
          {itemName}
        </Text>
        <Text
          style={[styles.title, { direction: textDirection(title) ?? 'inherit' }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      {removable && (
        <Pressable
          accessibilityLabel={`Remove ${itemName} from future lists`}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={onRemove}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
        >
          <Ionicons name="remove-circle-outline" color={colors.cherryBlossom} size={sizes.removeIcon} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.deepSeaNight,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  item: {
    color: colors.cherryBlossom,
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
  title: {
    color: colors.silver,
    fontSize: fontSize.body,
  },
  remove: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
