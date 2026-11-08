import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  text: string;
};

// A short line in a rounded glass pill, e.g. the last fetch's time under the
// Refresh button.
export function InfoPill({ icon, text }: Props) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} color={colors.silver} size={20} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.silverMuted,
    backgroundColor: colors.glassLight,
  },
  text: {
    flexShrink: 1,
    color: colors.silver,
    fontSize: fontSize.body,
  },
});
