import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShortInfo } from '@/components/ShortInfo';
import type { FeedPageLayout, Size } from '@/lib/feedPaging';
import type { FeedItem } from '@/lib/records';
import { colors } from '@/theme';

type Props = {
  item: FeedItem;
  removable: boolean;
  onRemoveItem: (item: FeedItem) => void;
  pageSize: Size;
  layout: FeedPageLayout;
};

// One full-screen page of the feed (§4): the item name and title in a strip
// at the top, and an empty space below it, where one of the reused players
// (PlayerSlot) sits when the page is near the current one.
export const ShortPage = memo(function ShortPage({
  item,
  removable,
  onRemoveItem,
  pageSize,
  layout,
}: Props) {
  return (
    <View style={[styles.page, pageSize]}>
      <ShortInfo
        itemName={item.itemName}
        title={item.title}
        height={layout.infoHeight}
        removable={removable}
        onRemove={() => onRemoveItem(item)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.deepSeaNight,
  },
});
