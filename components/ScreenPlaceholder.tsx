import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '@/theme';

type Props = {
  title: string;
  lines: readonly string[];
};

// Centered title and text for a screen that has no content yet.
export function ScreenPlaceholder({ title, lines }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
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
