import { StyleSheet, Text, View } from 'react-native';

import { textDirection } from '@/lib/textDirection';
import { colors, fontSize, spacing } from '@/theme';

type Props = {
  channelTitle: string;
  title: string;
  height: number;
  /** Space kept free at the bottom for the system navigation bar. */
  bottomInset: number;
};

// The strip under a feed video (§4): channel name and title. It sits below
// the player, never over it. Each line takes the direction of its own text
// (step 9.3), so a Hebrew title starts on the right and an English one on
// the left, whatever the phone's language.
export function ShortInfo({ channelTitle, title, height, bottomInset }: Props) {
  return (
    <View style={[styles.strip, { height, paddingBottom: bottomInset + spacing.sm }]}>
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
    paddingTop: spacing.sm,
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
