import { useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';

import { PlayerSlot } from '@/components/PlayerSlot';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { ShortPage } from '@/components/ShortPage';
import { feedPageKey, type FeedPage } from '@/lib/feedPages';
import { type FeedPageLayout, pageIndexFromOffset, type Size } from '@/lib/feedPaging';
import { assignSlots } from '@/lib/playerSlots';

type Props = {
  pages: readonly FeedPage[];
  pageSize: Size;
  layout: FeedPageLayout;
  bottomInset: number;
  /** The page to open on. Read once, when the pager mounts. */
  initialIndex: number;
  currentIndex: number;
  /** False while another screen covers the Feed, so nothing plays. */
  active: boolean;
  onPageChange: (index: number) => void;
  onDragEnd: () => void;
  onPlayerError: (videoId: string, error: string) => void;
  onPlaying: (videoId: string) => void;
  /** TEMPORARY diagnostics for the player checks in 7.1. */
  onPlayerLog: (videoId: string, line: string) => void;
};

// The vertical paging feed (§3, §4, F7): one video per page, then the
// "That's it for today" page. The pages themselves hold no player. Three
// players (lib/playerSlots.ts) sit over the current page and its neighbors,
// and move to new pages as you swipe, so the feed never creates more than
// three WebViews. Only the current video plays.
export function FeedPager({
  pages,
  pageSize,
  layout,
  bottomInset,
  initialIndex,
  currentIndex,
  active,
  onPageChange,
  onDragEnd,
  onPlayerError,
  onPlaying,
  onPlayerLog,
}: Props) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const openedAtStart = useRef(false);
  const videoCount = pages.filter((page) => page.kind === 'video').length;
  const playerLeft = (pageSize.width - layout.player.width) / 2;

  // Open on the start page once the pages are laid out.
  const onContentSizeChange = () => {
    if (openedAtStart.current) return;
    openedAtStart.current = true;
    if (initialIndex > 0) {
      scrollRef.current?.scrollTo({ y: initialIndex * pageSize.height, animated: false });
    }
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = pageIndexFromOffset(offsetY, pageSize.height, pages.length);
    if (index !== currentIndex) onPageChange(index);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.pager}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onContentSizeChange={onContentSizeChange}
      onScrollEndDrag={onDragEnd}
      onMomentumScrollEnd={onMomentumScrollEnd}
    >
      {pages.map((page) =>
        page.kind === 'video' ? (
          <ShortPage
            key={feedPageKey(page)}
            channelTitle={page.item.channelTitle}
            title={page.item.title}
            pageSize={pageSize}
            layout={layout}
            bottomInset={bottomInset}
          />
        ) : (
          <View key={feedPageKey(page)} style={pageSize}>
            <ScreenPlaceholder
              title="That's it for today"
              lines={['Tap Refresh for a new list.']}
            />
          </View>
        ),
      )}
      {assignSlots(currentIndex, videoCount).map(({ slot, pageIndex }) => {
        const page = pages[pageIndex];
        if (page?.kind !== 'video') return null;
        return (
          <PlayerSlot
            key={`player-${slot}`}
            slot={slot}
            videoId={page.item.videoId}
            size={layout.player}
            top={pageIndex * pageSize.height}
            left={playerLeft}
            playing={active && pageIndex === currentIndex}
            onPlayerError={onPlayerError}
            onPlaying={onPlaying}
            onPlayerLog={onPlayerLog}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
});
