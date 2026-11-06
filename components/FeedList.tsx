import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { ShortPage } from '@/components/ShortPage';
import { feedPageKey, type FeedPage } from '@/lib/feedPages';
import {
  type FeedPageLayout,
  pageIndexFromOffset,
  shouldMountPlayer,
  type Size,
} from '@/lib/feedPaging';

type Props = {
  pages: readonly FeedPage[];
  pageSize: Size;
  layout: FeedPageLayout;
  bottomInset: number;
  /** The page on screen. Read once, when the list mounts. */
  initialIndex: number;
  currentIndex: number;
  /** False while another screen covers the Feed, so nothing plays. */
  active: boolean;
  onPageChange: (index: number) => void;
  onDragEnd: () => void;
  onPlayerError: (videoId: string, error: string) => void;
  onPlaying: (videoId: string) => void;
};

// The vertical paging feed (§3, §4, F7): one video per page, then the
// "That's it for today" page. Only the current video and its neighbors
// mount a player, and only the current one plays.
export function FeedList({
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
}: Props) {
  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = pageIndexFromOffset(offsetY, pageSize.height, pages.length);
    if (index !== currentIndex) onPageChange(index);
  };

  const renderItem = ({ item, index }: { item: FeedPage; index: number }) => {
    if (item.kind === 'end') {
      return (
        <View style={pageSize}>
          <ScreenPlaceholder
            title="That's it for today"
            lines={['Tap Refresh for a new list.']}
          />
        </View>
      );
    }
    const video = item.item;
    return (
      <ShortPage
        videoId={video.videoId}
        channelTitle={video.channelTitle}
        title={video.title}
        pageSize={pageSize}
        layout={layout}
        bottomInset={bottomInset}
        mountPlayer={shouldMountPlayer(index, currentIndex)}
        playing={active && index === currentIndex}
        onPlayerError={onPlayerError}
        onPlaying={onPlaying}
      />
    );
  };

  return (
    <FlatList
      style={styles.list}
      data={pages}
      keyExtractor={feedPageKey}
      renderItem={renderItem}
      extraData={`${currentIndex}:${active}`}
      getItemLayout={(_data, index) => ({
        length: pageSize.height,
        offset: pageSize.height * index,
        index,
      })}
      initialScrollIndex={initialIndex}
      pagingEnabled
      onScrollEndDrag={onDragEnd}
      onMomentumScrollEnd={onMomentumScrollEnd}
      showsVerticalScrollIndicator={false}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={3}
      // Keep neighbor pages attached so their players can load off screen.
      removeClippedSubviews={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
