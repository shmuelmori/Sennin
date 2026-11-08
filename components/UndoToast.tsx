import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  message: string;
  onUndo: () => void;
  /** The strip's height: the toast covers the strip, never the player below it. */
  height: number;
};

const FADE_MS = 200;

// The message after the Feed's remove button (§4 Feed): "Octopus removed"
// with an "Undo" button, over the strip at the top of the page, so the
// player stays uncovered. Fades in; the screen decides when it goes away.
export function UndoToast({ message, onUndo, height }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { height, opacity }]}
    >
      <Text numberOfLines={2} style={styles.message}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onUndo}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.deepSeaNight,
    borderBottomColor: colors.tealMist,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  message: {
    flex: 1,
    color: colors.silver,
    fontSize: fontSize.body,
  },
  button: {
    backgroundColor: colors.tealMist,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: colors.deepSeaNight,
    fontSize: fontSize.body,
    fontWeight: 'bold',
  },
});
