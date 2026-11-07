import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, sizes } from '@/theme';

type Props = {
  /** What TalkBack reads, e.g. "Remove 3Blue1Brown". */
  accessibilityLabel: string;
  onPress: () => void;
};

const ICON_SIZE = 22;

// A round, filled Sunset button with a Deep Sea Night trash icon (§11: dark
// on Sunset), 44 dp so it's easy to hit. It only reports the tap; the screen
// asks before anything is removed.
export function TrashButton({ accessibilityLabel, onPress }: Props) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="trash" color={colors.deepSeaNight} size={ICON_SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: sizes.trashButton,
    height: sizes.trashButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.sunset,
  },
  pressed: {
    opacity: 0.7,
  },
});
