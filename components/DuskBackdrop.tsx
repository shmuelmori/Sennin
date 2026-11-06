import { type ReactNode, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

// Drawn by scripts/generate_art.py from the §11 palette. Its middle third is
// plain dark sky, so text placed in the middle of the screen stays readable.
const DUSK_ART = require('@/assets/images/dusk.jpg');

const FADE_MS = 900;

type Props = {
  children: ReactNode;
};

// The dusk scene (sakura, clouds, mountains, a pagoda) behind the empty and
// end screens (§11, step 9.1). Only used on screens without a player, so the
// art is never over a video. It fades in once the image has loaded: calm
// motion, no movement.
export function DuskBackdrop({ children }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));

  const onLoad = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        accessibilityIgnoresInvertColors
        accessible={false}
        fadeDuration={0}
        onLoad={onLoad}
        resizeMode="cover"
        source={DUSK_ART}
        style={[StyleSheet.absoluteFill, styles.art, { opacity }]}
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
