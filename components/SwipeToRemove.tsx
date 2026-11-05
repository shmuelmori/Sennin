import { useCallback, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  I18nManager,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderHandlers,
} from 'react-native';

import { dragDistance, isSideways, offsetFor, shouldOpen, type SwipeDirection } from '@/lib/swipe';
import { colors, fontSize, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  /** Text on the hidden button, e.g. "Remove". */
  actionLabel: string;
  /** What TalkBack reads for the button, e.g. "Remove 3Blue1Brown". */
  accessibilityLabel: string;
  onRemove: () => void | Promise<void>;
};

const BUTTON_WIDTH = 96;
const SLIDE_MS = 180;
const FADE_MS = 200;

type SwipeController = {
  panHandlers: GestureResponderHandlers;
  /** Slides the row open or shut. */
  settle: (toOpen: boolean) => void;
  /** Shuts the row at once, without a slide. */
  reset: () => void;
};

/**
 * The drag handling for one row. `offset` is the row's horizontal position.
 * Created once per row; the drag state lives in this closure, not in React state.
 */
function createSwipeController(
  offset: Animated.Value,
  direction: SwipeDirection,
  onOpenChange: (open: boolean) => void,
): SwipeController {
  /** How far open the row was when the current drag started. */
  let startDistance = 0;

  function settle(toOpen: boolean) {
    startDistance = toOpen ? BUTTON_WIDTH : 0;
    onOpenChange(toOpen);
    Animated.timing(offset, {
      toValue: offsetFor(startDistance, direction),
      duration: SLIDE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  const responder = PanResponder.create({
    // Capture phase, so a swipe that starts on a topic tag still moves the row.
    onMoveShouldSetPanResponderCapture: (_event, gesture) => isSideways(gesture.dx, gesture.dy),
    onPanResponderGrant: () => offset.stopAnimation(),
    onPanResponderMove: (_event, gesture) => {
      const distance = dragDistance(startDistance, gesture.dx, direction, BUTTON_WIDTH);
      offset.setValue(offsetFor(distance, direction));
    },
    onPanResponderRelease: (_event, gesture) => {
      const distance = dragDistance(startDistance, gesture.dx, direction, BUTTON_WIDTH);
      settle(shouldOpen(distance, gesture.vx, direction, BUTTON_WIDTH));
    },
    // Keep the swipe once it has started, instead of handing it to the list.
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => settle(startDistance > 0),
  });

  return {
    panHandlers: responder.panHandlers,
    settle,
    reset() {
      startDistance = 0;
      offset.setValue(0);
      onOpenChange(false);
    },
  };
}

// Swipe-to-remove (step 5.3), built on React Native's PanResponder so no
// gesture library is needed. Swiping the row sideways uncovers a Sunset
// "Remove" button at the row's end (the left on a right-to-left phone).
// Tapping the button fades the row out and removes it; tapping the open row
// shuts it. Calm motion only: timed slides and fades, no springs.
export function SwipeToRemove({ children, actionLabel, accessibilityLabel, onRemove }: Props) {
  const [offset] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [open, setOpen] = useState(false);
  // The button sits at the row's end, so the row slides the other way to uncover it.
  const [swipe] = useState(() =>
    createSwipeController(offset, I18nManager.isRTL ? 1 : -1, setOpen),
  );

  const finishRemove = useCallback(async () => {
    await onRemove();
    // Only matters if the row is still there, i.e. removing failed: show it again, shut.
    swipe.reset();
    opacity.setValue(1);
  }, [onRemove, swipe, opacity]);

  const remove = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
      () => void finishRemove(),
    );
  }, [opacity, finishRemove]);

  return (
    <Animated.View style={{ opacity }}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={remove}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </Pressable>
      <Animated.View
        {...swipe.panHandlers}
        style={[styles.foreground, { transform: [{ translateX: offset }] }]}
      >
        {children}
        {open && (
          <Pressable
            accessible={false}
            onPress={() => swipe.settle(false)}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    end: 0,
    width: BUTTON_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.sunset,
  },
  pressed: {
    opacity: 0.7,
  },
  actionLabel: {
    color: colors.deepSeaNight,
    fontSize: fontSize.body,
    fontWeight: 'bold',
  },
  foreground: {
    backgroundColor: colors.deepSeaNight,
  },
});
