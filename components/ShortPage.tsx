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
};

// One full-screen page of the feed (§4): the channel name and title in a
// strip at the top, and an empty space below it, where one of the reused
// players (PlayerSlot) sits when the page is near the current one.
export const ShortPage = memo(function ShortPage({ channelTitle, title, pageSize, layout }: Props) {
  return (
    <View style={[styles.page, pageSize]}>
      <ShortInfo channelTitle={channelTitle} title={title} height={layout.infoHeight} />
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.deepSeaNight,
  },
});
