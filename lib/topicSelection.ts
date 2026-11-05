// Assigning topics to a channel (F3): one topic or both, never none. Used by
// the add form and by the topic tags on each channel row (steps 5.2, 5.3).

import { TOPICS, type TopicId } from './topics';

/** A topic as a tag shows it: its name, and whether it is picked. */
export type TopicOption = {
  id: TopicId;
  name: string;
  selected: boolean;
};

/**
 * Adds or removes a topic, keeping the order of lib/topics.ts. Returns null
 * when the change isn't allowed: removing the only topic left, because a
 * channel needs at least one (F3).
 */
export function toggleTopic(selected: readonly TopicId[], topicId: TopicId): TopicId[] | null {
  const isSelected = selected.includes(topicId);
  const next = TOPICS.map((topic) => topic.id).filter((id) =>
    id === topicId ? !isSelected : selected.includes(id),
  );
  return next.length === 0 ? null : next;
}

/** Every topic, in the order of lib/topics.ts, marked as picked or not. */
export function topicOptions(selected: readonly TopicId[]): TopicOption[] {
  return TOPICS.map(({ id, name }) => ({ id, name, selected: selected.includes(id) }));
}

/** The add form's button is enabled once there is some input and at least one topic. */
export function canAddChannel(input: string, topicIds: readonly TopicId[]): boolean {
  return input.trim() !== '' && topicIds.length > 0;
}
