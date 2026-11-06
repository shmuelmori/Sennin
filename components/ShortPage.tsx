import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShortInfo } from '@/components/ShortInfo';
import type { FeedPageLayout, Size } from '@/lib/feedPaging';
import { colors } from '@/theme';

type Props = {
  channelTitle: string;
  title: string;
  pageSize: Size;
  layout: FeedPageLayout;
  /** Space kept free at the bottom for the system navigation bar. */
  bottomInset: number;
};

// One full-screen page of the feed (§4): an empty space at the top, where
// one of the reused players (PlayerSlot) sits when the page is near the
// current one, and the channel name and title below it.
export const ShortPage = memo(function ShortPage({
  channelTitle,
  title,
  pageSize,
  layout,
  bottomInset,
}: Props) {
  return (
    <View style={[styles.page, pageSize]}>
      <View style={{ height: layout.player.height }} />
      <ShortInfo
        channelTitle={channelTitle}
        title={title}
        height={layout.infoHeight}
        bottomInset={bottomInset}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.deepSeaNight,
  },
});
