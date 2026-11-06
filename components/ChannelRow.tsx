import { Image, StyleSheet, Text, View } from 'react-native';

import { textDirection } from '@/lib/textDirection';
import type { TopicOption } from '@/lib/topicSelection';
import type { TopicId } from '@/lib/topics';
import { colors, fontSize, radius, spacing } from '@/theme';

import { TopicChip } from './TopicChip';

type Props = {
  title: string;
  thumbnailUrl: string | null;
  topics: readonly TopicOption[];
  onToggleTopic: (topicId: TopicId) => void;
};

const THUMBNAIL_SIZE = 48;

// One saved channel on the Sources screen (§4): thumbnail, name and topic
// tags. Tapping a tag assigns or unassigns that topic (F3). The name takes
// the direction of its own text (step 9.3), like the titles in the feed.
export function ChannelRow({ title, thumbnailUrl, topics, onToggleTopic }: Props) {
  return (
    <View style={styles.row}>
      {thumbnailUrl === null ? (
        <View style={[styles.thumbnail, styles.noThumbnail]} />
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
        />
      )}
      <View style={styles.details}>
        <Text
          numberOfLines={1}
          style={[styles.title, { direction: textDirection(title) ?? 'inherit' }]}
        >
          {title}
        </Text>
        <View style={styles.topics}>
          {topics.map((topic) => (
            <TopicChip
              key={topic.id}
              label={topic.name}
              selected={topic.selected}
              onPress={() => onToggleTopic(topic.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.deepSeaNight,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radius.pill,
  },
  noThumbnail: {
    backgroundColor: colors.tealMist,
  },
  details: {
    flex: 1,
    gap: spacing.xs + 2,
  },
  title: {
    color: colors.silver,
    fontSize: fontSize.body,
    fontWeight: 'bold',
  },
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
