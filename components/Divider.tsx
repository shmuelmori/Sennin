import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

// A thin Teal Mist line between list rows (§11: Teal Mist for dividers).
export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    backgroundColor: colors.tealMist,
  },
});
