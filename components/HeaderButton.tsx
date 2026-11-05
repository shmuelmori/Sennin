import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
};

// A secondary (Teal Mist) button for the header. Text on Teal Mist is
// Deep Sea Night and bold (§11 contrast rules).
export function HeaderButton({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.tealMist,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.deepSeaNight,
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
});
