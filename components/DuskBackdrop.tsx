import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FadeInImage } from '@/components/FadeInImage';
import { colors } from '@/theme';

// Drawn by scripts/generate_art.py from the §11 palette. Its middle third is
// plain dark sky, so text placed in the middle of the screen stays readable.
const DUSK_ART = require('@/assets/images/dusk.jpg');

type Props = {
  children: ReactNode;
};

// The dusk scene (sakura, clouds, mountains, a pagoda) behind the empty and
// end screens (§11, step 9.1). Only used on screens without a player, so the
// art is never over a video. It fades in once the image has loaded.
export function DuskBackdrop({ children }: Props) {
  return (
    <View style={styles.container}>
      <FadeInImage
        resizeMode="cover"
        source={DUSK_ART}
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
