import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { textDirection } from '@/lib/textDirection';
import { colors, fontSize, spacing } from '@/theme';

export type InfoSheetContent =
  | { kind: 'loading' }
  | { kind: 'ready'; text: string }
  | { kind: 'failed'; message: string };

type Props = {
  /** Open while there is content; null closes the sheet. */
  content: InfoSheetContent | null;
  /** The item name, shown as the sheet's heading. */
  heading: string;
  /** Called when the user closes the sheet (swipe down or tap outside). */
  onClose: () => void;
};

const SNAP_POINTS = ['55%'];
const ANIMATION_MS = 250;

function Backdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />;
}

// The bottom sheet of the ⓘ button in the feed strip: a loading state, then
// Gemini's explanation or an error message. Slides with a plain timing curve
// (no spring) and the backdrop fades (§11: calm motion). Hebrew text reads
// right to left.
export function InfoSheet({ content, heading, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const animationConfigs = useBottomSheetTimingConfigs({ duration: ANIMATION_MS });
  const isOpen = content !== null;

  useEffect(() => {
    if (isOpen) sheetRef.current?.snapToIndex(0);
    else sheetRef.current?.close();
  }, [isOpen]);

  const onChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  let body = null;
  if (content?.kind === 'loading') {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.cherryBlossom} />
        <Text style={styles.muted}>מחפש מידע…</Text>
      </View>
    );
  } else if (content?.kind === 'ready') {
    body = (
      <Text style={[styles.text, { direction: textDirection(content.text) ?? 'rtl' }]}>
        {content.text}
      </Text>
    );
  } else if (content?.kind === 'failed') {
    body = <Text style={[styles.text, styles.error]}>{content.message}</Text>;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      enablePanDownToClose
      animationConfigs={animationConfigs}
      backdropComponent={Backdrop}
      onChange={onChange}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text
          style={[styles.heading, { direction: textDirection(heading) ?? 'inherit' }]}
          numberOfLines={1}
        >
          {heading}
        </Text>
        {body}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.deepSeaNight,
    borderColor: colors.tealMist,
    borderWidth: 1,
  },
  handle: {
    backgroundColor: colors.silverMuted,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  heading: {
    color: colors.cherryBlossom,
    fontSize: fontSize.body,
    fontWeight: 'bold',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  text: {
    color: colors.silver,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
  },
  error: {
    direction: 'rtl',
    textAlign: 'center',
  },
  muted: {
    color: colors.silverMuted,
    fontSize: fontSize.body,
  },
});
