import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

import { HeaderButton } from '@/components/HeaderButton';
import { ShortPage } from '@/components/ShortPage';
import {
  fitAspect,
  pageIndexFromOffset,
  SHORT_ASPECT,
  shouldMountPlayer,
  type Size,
} from '@/lib/feedPaging';
import { SPIKE_SHORTS, type SpikeShort } from '@/lib/spikeShorts';
import { colors, spacing } from '@/theme';

function logPlayerError(videoId: string, error: string) {
  console.warn(`[player] ${videoId}: ${error}`);
}

// Feed screen (spec §4). Player spike (step 1.1): a vertical paging list of
// hard-coded Shorts. Only the current video and its neighbors mount a player.
export default function FeedScreen() {
  const router = useRouter();
  const [pageSize, setPageSize] = useState<Size | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const playerSize = useMemo(
    () => (pageSize ? fitAspect(pageSize, SHORT_ASPECT) : null),
    [pageSize],
  );

  // Each page is exactly as tall as the list, so paging snaps one video at a time.
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPageSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageSize) return;
    const offsetY = event.nativeEvent.contentOffset.y;
    setCurrentIndex(pageIndexFromOffset(offsetY, pageSize.height, SPIKE_SHORTS.length));
  };

  const renderItem = ({ item, index }: { item: SpikeShort; index: number }) =>
    pageSize && playerSize ? (
      <ShortPage
        videoId={item.videoId}
        pageSize={pageSize}
        playerSize={playerSize}
        mountPlayer={shouldMountPlayer(index, currentIndex)}
        playing={index === currentIndex}
        onPlayerError={logPlayerError}
      />
    ) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sennin',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderButton label="Sources" onPress={() => router.push('/sources')} />
              <HeaderButton label="Status" onPress={() => router.push('/status')} />
            </View>
          ),
        }}
      />
      <View style={styles.container} onLayout={onLayout}>
        {pageSize ? (
          <FlatList
            data={SPIKE_SHORTS}
            keyExtractor={(item) => item.videoId}
            renderItem={renderItem}
            extraData={currentIndex}
            getItemLayout={(_data, index) => ({
              length: pageSize.height,
              offset: pageSize.height * index,
              index,
            })}
            pagingEnabled
            onMomentumScrollEnd={onMomentumScrollEnd}
            showsVerticalScrollIndicator={false}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            // Keep neighbor pages attached so their players can load off screen.
            removeClippedSubviews={false}
          />
        ) : null}
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
});
