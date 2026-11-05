import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

// A primary (Sunset) button. Text on Sunset is Deep Sea Night and bold
// (§11 contrast rules).
export function PrimaryButton({ label, onPress, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sunset,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.deepSeaNight,
    fontSize: fontSize.body,
    fontWeight: 'bold',
  },
});
