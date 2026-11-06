import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '@/theme';

export type StatusRowItem = {
  label: string;
  value: string;
  /** Shown muted, e.g. a rule that rejected nothing. */
  muted?: boolean;
};

type Props = {
  heading: string;
  rows: readonly StatusRowItem[];
};

// A heading and label/value rows for the Status screen. The row direction and
// text alignment follow the phone's layout direction, so it reads naturally
// in right-to-left as well as left-to-right.
export function StatusRows({ heading, rows }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.label, row.muted && styles.muted]}>{row.label}</Text>
          <Text style={[styles.value, row.muted && styles.muted]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    color: colors.cherryBlossom,
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    flexShrink: 1,
    color: colors.silver,
    fontSize: fontSize.body,
  },
  value: {
    color: colors.silver,
    fontSize: fontSize.body,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  muted: {
    color: colors.silverMuted,
    fontWeight: 'normal',
  },
});
