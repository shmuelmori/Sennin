import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScriptTitle } from '@/components/ScriptTitle';
import { colors, radius, spacing } from '@/theme';

type Props = {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** The edge and glow: Teal Mist, or Sunset for a card that needs attention. */
  tone?: 'teal' | 'sunset';
  children: ReactNode;
};

// A panel over the background art: Deep Sea Night glass with a glowing edge,
// and a heading made of an icon and a script title.
export function GlassCard({ title, icon, tone = 'teal', children }: Props) {
  const sunset = tone === 'sunset';
  return (
    <View style={[styles.card, sunset ? styles.sunset : styles.teal]}>
      <View style={styles.heading}>
        <Ionicons name={icon} color={sunset ? colors.sunset : colors.silver} size={28} />
        <ScriptTitle text={title} size="card" />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.glass,
  },
  teal: {
    borderColor: colors.tealMist,
    boxShadow: `0 0 14px ${colors.tealGlow}`,
  },
  sunset: {
    borderColor: colors.sunset,
    boxShadow: `0 0 14px ${colors.sunsetGlow}`,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
