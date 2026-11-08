import { useIsFocused, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedPager } from '@/components/FeedPager';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { UndoToast } from '@/components/UndoToast';
import { useFeed } from '@/hooks/useFeed';
import { useItemRemoval } from '@/hooks/useItemRemoval';
import { useSwitchTimer } from '@/hooks/useSwitchTimer';
import { toFeedPages } from '@/lib/feedPages';
import { feedPageLayout, type Size } from '@/lib/feedPaging';
import type { FeedItem } from '@/lib/records';
import { colors, sizes, spacing } from '@/theme';

/** The page on screen, tied to the list it belongs to. */
type Position = { version: number; index: number };

// Feed screen (spec §4, steps 7.1 to 7.5): the saved list from feed_item as
// a vertical paging feed, opening on the first unwatched video. A video that
// can't play is replaced from the reserve (F8), and one that has played for
// half its length is saved as watched (F9). The strip's remove button takes
// the video's item out of later fetches, with "Undo" for 5 seconds (F3). A
// Refresh on the Refresh tab saves a new list, and the feed starts over at
// its first video. Nothing plays while another tab is open.
export default function FeedScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const [pageSize, setPageSize] = useState<Size | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const switchTimer = useSwitchTimer();
  const { state, onPlayerError, onPlaybackChange } = useFeed();
  const { removedIds, undo, removeItem, undoRemove } = useItemRemoval();
  // Stable, so the memoized pages don't all re-render on every swipe.
  const onRemoveItem = useCallback((item: FeedItem) => void removeItem(item), [removeItem]);
  const { onPlaying } = switchTimer;

  const onPlayerStateChange = useCallback(
    (videoId: string, playing: boolean) => {
      if (playing) onPlaying(videoId);
      onPlaybackChange(videoId, playing);
    },
    [onPlaying, onPlaybackChange],
  );

  // The item name and title sit in a strip at the top of each page, the
  // player below it, down to the tab bar.
  const layout = useMemo(
    () => (pageSize ? feedPageLayout(pageSize, sizes.feedInfoMinHeight) : null),
    [pageSize],
  );
  const pages = useMemo(() => (state.kind === 'ready' ? toFeedPages(state.videos) : []), [state]);

  // Each page is exactly as tall as the area between the status bar and the
  // tab bar, so paging snaps one video at a time.
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPageSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  let body: ReactNode = null;
  if (state.kind === 'failed') {
    body = (
      <ScreenPlaceholder
        title="Couldn't read the list"
        lines={['Close the app and open it again.']}
      />
    );
  } else if (state.kind === 'ready' && state.videos.length === 0) {
    body = (
      <ScreenPlaceholder
        decorated
        title="No videos yet"
        lines={['Open Refresh to build a list of Shorts.']}
      >
        <View style={styles.emptyButton}>
          <PrimaryButton label="Open Refresh" onPress={() => router.navigate('/refresh')} />
        </View>
      </ScreenPlaceholder>
    );
  } else if (state.kind === 'ready' && pageSize && layout) {
    // A new list (new version) starts over at its own start page.
    const wantedIndex = position?.version === state.version ? position.index : state.startIndex;
    // A skip with no reserve left shortens the list; stay within it.
    const currentIndex = Math.min(wantedIndex, pages.length - 1);
    const onPageChange = (index: number) => {
      const page = pages[index];
      if (page?.kind === 'video') switchTimer.onSwitch(page.item.videoId);
      setPosition({ version: state.version, index });
    };
    body = (
      <FeedPager
        key={state.version}
        pages={pages}
        pageSize={pageSize}
        layout={layout}
        initialIndex={state.startIndex}
        currentIndex={currentIndex}
        active={focused}
        onPageChange={onPageChange}
        onDragEnd={switchTimer.onDragEnd}
        onPlayerError={onPlayerError}
        onPlaybackChange={onPlayerStateChange}
        removedIds={removedIds}
        onRemoveItem={onRemoveItem}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.container} onLayout={onLayout}>
        {body}
        {undo !== null && layout !== null && (
          <UndoToast
            key={undo.itemId}
            message={`${undo.name} won't be drawn again.`}
            onUndo={() => void undoRemove()}
            height={layout.infoHeight}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
  container: {
    flex: 1,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
});
