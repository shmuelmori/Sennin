import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

// A topic tag that switches on and off (F3). On: filled Teal Mist with
// Deep Sea Night bold text. Off: a Teal Mist outline with Silver text.
export function TopicChip({ label, selected, onPress, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      hitSlop={spacing.xs}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderColor: colors.tealMist,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  selected: {
    backgroundColor: colors.tealMist,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.silver,
    fontSize: fontSize.small,
  },
  selectedLabel: {
    color: colors.deepSeaNight,
    fontWeight: 'bold',
  },
});
