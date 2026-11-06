import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DuskBackdrop } from '@/components/DuskBackdrop';
import { colors, fontSize, spacing } from '@/theme';

type Props = {
  title: string;
  lines: readonly string[];
  /** Shown below the lines, e.g. a button. */
  children?: ReactNode;
  /**
   * Draw the dusk scene behind the text (§11). Only for the empty and end
   * screens, never a screen with a player.
   */
  decorated?: boolean;
};

// Centered title and text for a screen that has no content yet.
export function ScreenPlaceholder({ title, lines, children, decorated = false }: Props) {
  const content = (
    <View style={[styles.container, decorated && styles.overArt]}>
      <Text style={styles.title}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
      {children}
    </View>
  );
  return decorated ? <DuskBackdrop>{content}</DuskBackdrop> : content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.deepSeaNight,
  },
  overArt: {
    backgroundColor: 'transparent',
  },
  title: {
    color: colors.silver,
    fontSize: fontSize.title,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  line: {
    color: colors.silver,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
