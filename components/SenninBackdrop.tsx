import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FadeInImage } from '@/components/FadeInImage';
import { colors } from '@/theme';

// 941x1672: the Sennin on the left, the red sun and pagoda on the right, and
// dark misty hills below, where the cards sit.
const BACKGROUND_ART = require('@/assets/images/background.jpeg');

type Props = {
  children: ReactNode;
};

// The background art of the Refresh and Topics tabs. It fills the screen
// behind the status bar (`cover`, so it may be cropped at the sides) and stays
// still while the content scrolls over it. Only used on screens without a
// player, so the art is never over a video. It fades in once loaded.
export function SenninBackdrop({ children }: Props) {
  return (
    <View style={styles.container}>
      <FadeInImage
        resizeMode="cover"
        source={BACKGROUND_ART}
        style={[StyleSheet.absoluteFill, styles.art]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
    overflow: 'hidden',
  },
  art: {
    width: '100%',
    height: '100%',
  },
});
