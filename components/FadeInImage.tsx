import { useState } from 'react';
import {
  Animated,
  Easing,
  type ImageResizeMode,
  type ImageSourcePropType,
  type StyleProp,
  type ImageStyle,
} from 'react-native';

const FADE_MS = 900;

type Props = {
  source: ImageSourcePropType;
  resizeMode: ImageResizeMode;
  style?: StyleProp<ImageStyle>;
};

// A decorative image that fades in once it has loaded: calm motion, no
// movement (§11). It starts fully transparent, so the screen's Deep Sea Night
// background shows until then, never a white flash.
export function FadeInImage({ source, resizeMode, style }: Props) {
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
    <Animated.Image
      accessibilityIgnoresInvertColors
      accessible={false}
      fadeDuration={0}
      onLoad={onLoad}
      resizeMode={resizeMode}
      source={source}
      style={[style, { opacity }]}
    />
  );
}
