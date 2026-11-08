import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, sizes } from '@/theme';

type Props = {
  /** Today's used share of the API quota, 0 to 100. */
  percent: number;
  /** A line under the percent, e.g. "7,990 left". */
  caption: string;
};

const SIZE = sizes.usageRing;
const HALF = SIZE / 2;
const STROKE = sizes.usageRingStroke;

/**
 * One half of the arc. A circle whose top and right borders are colored is a
 * half ring (after the base 45° turn, the right half). It is clipped to one
 * side of the ring and turned by `angle` degrees, so only part of it shows.
 */
function HalfArc({ side, angle }: { side: 'left' | 'right'; angle: number }) {
  const right = side === 'right';
  return (
    <View style={[styles.clip, { left: right ? HALF : 0 }]}>
      <View
        style={[
          styles.halfRing,
          { left: right ? -HALF : 0, transform: [{ rotate: `${45 + angle}deg` }] },
        ]}
      />
    </View>
  );
}

// The ring on the Refresh tab's API card: a Teal Mist track with a Sunset arc
// for the units used today, drawn clockwise from the top, and the percent in
// the middle. Plain Views, so no SVG library is needed.
export function UsageRing({ percent, caption }: Props) {
  const share = Math.min(100, Math.max(0, percent)) / 100;
  // Right half: from the top down to 6 o'clock, then the left half back up.
  const rightAngle = share >= 0.5 ? 0 : 360 * share - 180;
  const leftAngle = share > 0.5 ? 360 * (share - 0.5) : 0;
  return (
    <View
      accessible
      accessibilityLabel={`${Math.round(percent)}% of today's API units used, ${caption}`}
      style={styles.ring}
    >
      <View style={styles.track} />
      {share > 0 && <HalfArc side="right" angle={rightAngle} />}
      {share > 0.5 && <HalfArc side="left" angle={leftAngle} />}
      <View style={styles.center}>
        <Text style={styles.percent}>{`${Math.round(percent)}%`}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
  },
  track: {
    ...StyleSheet.absoluteFill,
    borderRadius: HALF,
    borderWidth: STROKE,
    borderColor: colors.tealMist,
  },
  clip: {
    position: 'absolute',
    top: 0,
    width: HALF,
    height: SIZE,
    overflow: 'hidden',
  },
  halfRing: {
    position: 'absolute',
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: HALF,
    borderWidth: STROKE,
    borderTopColor: colors.sunset,
    borderRightColor: colors.sunset,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    color: colors.sunset,
    fontSize: fontSize.stat,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    color: colors.silver,
    fontSize: fontSize.small,
    fontVariant: ['tabular-nums'],
  },
});
