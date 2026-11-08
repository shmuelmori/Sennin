import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

export type StatTile = {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** The icon's color: Teal Mist by default. */
  tone?: 'teal' | 'sunset';
};

type Props = {
  tiles: readonly StatTile[];
};

// A grid of numbers, three to a row: an icon and a label, the value under
// them. The rows wrap and follow the layout direction.
export function StatTiles({ tiles }: Props) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.label} style={styles.tile}>
          <View style={styles.labelRow}>
            <Ionicons
              name={tile.icon}
              color={tile.tone === 'sunset' ? colors.sunset : colors.tealMist}
              size={20}
            />
            <Text style={styles.label}>{tile.label}</Text>
          </View>
          <Text style={styles.value}>{tile.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tealMist,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  label: {
    flexShrink: 1,
    color: colors.silver,
    fontSize: fontSize.small,
  },
  value: {
    color: colors.silver,
    fontSize: fontSize.stat,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
});
