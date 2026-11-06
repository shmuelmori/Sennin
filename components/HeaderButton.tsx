import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  /** primary is Sunset (e.g. "Refresh"), secondary is Teal Mist. */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

// A small pill button for the header. Text on Sunset and Teal Mist is
// Deep Sea Night and bold (§11 contrast rules).
export function HeaderButton({ label, onPress, variant = 'secondary', disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  primary: {
    backgroundColor: colors.sunset,
  },
  secondary: {
    backgroundColor: colors.tealMist,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.deepSeaNight,
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
});
