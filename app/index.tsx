import { Stack, useIsFocused, useRouter } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { Alert, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedList } from '@/components/FeedList';
import { HeaderButton } from '@/components/HeaderButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { useFeed } from '@/hooks/useFeed';
import { useRefresh } from '@/hooks/useRefresh';
import { useSwitchTimer } from '@/hooks/useSwitchTimer';
import { toFeedPages } from '@/lib/feedPages';
import { feedPageLayout, type Size } from '@/lib/feedPaging';
import { colors, sizes, spacing } from '@/theme';

function logPlayerError(videoId: string, error: string) {
  console.warn(`[player] ${videoId}: ${error}`);
}

/** The page on screen, tied to the list it belongs to. */
type Position = { version: number; index: number };

// Feed screen (spec §4, steps 7.1 and 7.2): the saved list from feed_item as
// a vertical paging feed, opening on the first unwatched video. "Refresh"
// builds a new list and the feed starts over at its first video. Nothing
// plays while Sources or Status covers the Feed.
export default function FeedScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [pageSize, setPageSize] = useState<Size | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const switchTimer = useSwitchTimer();
  const { refreshing, refresh } = useRefresh();
  const { state, reload } = useFeed();

  const onRefresh = async () => {
    const result = await refresh();
    if (result === null) return;
    if (result.listReplaced) await reload();
    Alert.alert(result.message.title, result.message.message);
  };

  const layout = useMemo(
    () => (pageSize ? feedPageLayout(pageSize, sizes.feedInfoMinHeight + insets.bottom) : null),
    [pageSize, insets.bottom],
  );
  const pages = useMemo(() => (state.kind === 'ready' ? toFeedPages(state.videos) : []), [state]);

  // Each page is exactly as tall as the list, so paging snaps one video at a time.
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
      <ScreenPlaceholder title="No videos yet" lines={['Tap Refresh to build a list of Shorts.']}>
        <View style={styles.emptyButton}>
          <PrimaryButton
            label={refreshing ? 'Refreshing…' : 'Refresh'}
            disabled={refreshing}
            onPress={() => void onRefresh()}
          />
        </View>
      </ScreenPlaceholder>
    );
  } else if (state.kind === 'ready' && pageSize && layout) {
    // A new list (new version) starts over at its own start page.
    const currentIndex = position?.version === state.version ? position.index : state.startIndex;
    const onPageChange = (index: number) => {
      const page = pages[index];
      if (page?.kind === 'video') switchTimer.onSwitch(page.item.videoId);
      setPosition({ version: state.version, index });
    };
    body = (
      <FeedList
        key={state.version}
        pages={pages}
        pageSize={pageSize}
        layout={layout}
        bottomInset={insets.bottom}
        initialIndex={state.startIndex}
        currentIndex={currentIndex}
        active={focused}
        onPageChange={onPageChange}
        onDragEnd={switchTimer.onDragEnd}
        onPlayerError={logPlayerError}
        onPlaying={switchTimer.onPlaying}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sennin',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderButton
                label={refreshing ? 'Refreshing…' : 'Refresh'}
                variant="primary"
                disabled={refreshing}
                onPress={() => void onRefresh()}
              />
              <HeaderButton label="Sources" onPress={() => router.push('/sources')} />
              <HeaderButton label="Status" onPress={() => router.push('/status')} />
            </View>
          ),
        }}
      />
      <View style={styles.container} onLayout={onLayout}>
        {body}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
});
