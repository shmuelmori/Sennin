import { Image, StyleSheet, Text, View } from 'react-native';

import { textDirection } from '@/lib/textDirection';
import type { TopicOption } from '@/lib/topicSelection';
import type { TopicId } from '@/lib/topics';
import { colors, fontSize, radius, spacing } from '@/theme';

import { TopicChip } from './TopicChip';
import { TrashButton } from './TrashButton';

type Props = {
  title: string;
  thumbnailUrl: string | null;
  topics: readonly TopicOption[];
  onToggleTopic: (topicId: TopicId) => void;
  /** The trash button was tapped. The screen asks before removing. */
  onRemove: () => void;
};

const THUMBNAIL_SIZE = 48;

// One saved channel on the Sources screen (§4), as a rounded card:
// thumbnail, name, topic tags and a trash button at the end. Tapping a tag
// assigns or unassigns that topic (F3). The name takes the direction of its
// own text (step 9.3), like the titles in the feed.
export function ChannelRow({ title, thumbnailUrl, topics, onToggleTopic, onRemove }: Props) {
  return (
    <View style={styles.card}>
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
      <TrashButton accessibilityLabel={`Remove ${title}`} onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.tealMist,
    borderRadius: radius.md,
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
