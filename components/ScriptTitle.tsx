import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fonts, spacing } from '@/theme';

type Props = {
  text: string;
  /** 'hero': the big title at the top of a tab. 'card': a card's heading. */
  size: 'hero' | 'card';
  /** Where the title sits in its row; 'start' and 'end' follow the layout direction. */
  align?: 'start' | 'center' | 'end';
};

const ALIGN_SELF = { start: 'flex-start', center: 'center', end: 'flex-end' } as const;

// A brush-style title in the script font, with a Sunset brush stroke under it
// that fades out to the end. A soft shadow keeps it readable over the art.
export function ScriptTitle({ text, size, align = 'start' }: Props) {
  const hero = size === 'hero';
  return (
    <View style={{ alignSelf: ALIGN_SELF[align] }}>
      <Text accessibilityRole="header" style={[styles.title, hero ? styles.hero : styles.card]}>
        {text}
      </Text>
      <View style={[styles.stroke, hero ? styles.heroStroke : styles.cardStroke]} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.silver,
    fontFamily: fonts.script,
    fontWeight: 'bold',
    // Room for the script's swashes, which Android would otherwise clip.
    paddingHorizontal: spacing.sm,
    textShadowColor: colors.textShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  hero: {
    fontSize: fontSize.hero,
    lineHeight: fontSize.hero * 1.2,
  },
  card: {
    fontSize: fontSize.cardTitle,
    lineHeight: fontSize.cardTitle * 1.25,
  },
  stroke: {
    borderRadius: 2,
    backgroundImage: `linear-gradient(to right, ${colors.sunset}, ${colors.sunsetClear})`,
  },
  heroStroke: {
    height: 4,
    marginTop: -spacing.xs,
  },
  cardStroke: {
    height: 3,
    width: '80%',
  },
});
