import { useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  I18nManager,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderHandlers,
} from 'react-native';

import { dragDistance, isSideways, offsetFor, shouldOpen, type SwipeDirection } from '@/lib/swipe';
import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  /** Text on the hidden button, e.g. "Delete". */
  actionLabel: string;
  /** What TalkBack reads for the button, e.g. "Delete Octopus". */
  accessibilityLabel: string;
  /** The hidden button was tapped. The screen asks before deleting. */
  onRemove: () => void;
};

const BUTTON_WIDTH = 96;
const SLIDE_MS = 180;

type SwipeController = {
  panHandlers: GestureResponderHandlers;
  /** Slides the row open or shut. */
  settle: (toOpen: boolean) => void;
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
    // Capture phase, so a swipe that starts on the Restore button still moves the row.
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
  };
}

/**
 * The rows are see-through glass, so the button stays invisible until the
 * row moves, in either direction.
 */
function actionOpacity(offset: Animated.Value) {
  return offset.interpolate({
    inputRange: [-BUTTON_WIDTH, -1, 0, 1, BUTTON_WIDTH],
    outputRange: [1, 1, 0, 1, 1],
  });
}

// Swipe-to-delete on the Topics tab (§4), built on React Native's
// PanResponder so no gesture library is needed. Swiping the row sideways
// uncovers a Sunset button at the row's end (the left on a right-to-left
// phone), invisible until the row moves. Tapping it shuts the row and
// reports the tap; the screen asks for confirmation. Tapping the open row shuts it. Calm motion only: timed
// slides, no springs.
export function SwipeToRemove({ children, actionLabel, accessibilityLabel, onRemove }: Props) {
  const [offset] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // The button sits at the row's end, so the row slides the other way to uncover it.
  const [swipe] = useState(() =>
    createSwipeController(offset, I18nManager.isRTL ? 1 : -1, setOpen),
  );
  const [opacity] = useState(() => actionOpacity(offset));

  const remove = () => {
    swipe.settle(false);
    onRemove();
  };

  return (
    <View>
      <Animated.View style={[styles.action, { opacity }]}>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={remove}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      </Animated.View>
      <Animated.View {...swipe.panHandlers} style={{ transform: [{ translateX: offset }] }}>
        {children}
        {open && (
          <Pressable
            accessible={false}
            onPress={() => swipe.settle(false)}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    end: 0,
    width: BUTTON_WIDTH,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
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
});
