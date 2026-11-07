import { StyleSheet, Text, View } from 'react-native';

import { textDirection } from '@/lib/textDirection';
import { colors, fontSize, spacing } from '@/theme';

type Props = {
  channelTitle: string;
  title: string;
  height: number;
};

// The strip above a feed video (§4): channel name and title. It ends where
// the player starts, so it never covers the player. Each line takes the
// direction of its own text (step 9.3), so a Hebrew title starts on the right
// and an English one on the left, whatever the phone's language.
export function ShortInfo({ channelTitle, title, height }: Props) {
  return (
    <View style={[styles.strip, { height }]}>
      <Text
        style={[styles.channel, { direction: textDirection(channelTitle) ?? 'inherit' }]}
        numberOfLines={1}
      >
        {channelTitle}
      </Text>
      <Text
        style={[styles.title, { direction: textDirection(title) ?? 'inherit' }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.deepSeaNight,
  },
  channel: {
    color: colors.cherryBlossom,
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
  title: {
    color: colors.silver,
    fontSize: fontSize.body,
  },
});
