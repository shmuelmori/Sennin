import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { topicKind, type TopicKind } from '@/lib/topicIcon';
import { colors, sizes } from '@/theme';

type Glyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

const GLYPHS: Record<TopicKind, Glyph> = {
  food: 'silverware-fork-knife',
  plant: 'sprout',
  space: 'orbit',
  people: 'account-star',
  history: 'pillar',
  tech: 'chip',
  transport: 'airplane',
  building: 'office-building',
  math: 'sigma',
  mind: 'head-lightbulb-outline',
  language: 'alphabetical-variant',
  money: 'cash-multiple',
  sea: 'fish',
  bird: 'bird',
  insect: 'bug-outline',
  animal: 'paw',
  biology: 'dna',
  body: 'heart-pulse',
  weather: 'weather-lightning-rainy',
  earth: 'terrain',
  physics: 'atom',
  chemistry: 'flask-outline',
  music: 'music-note',
  arts: 'palette-outline',
  world: 'map-outline',
  games: 'chess-knight',
  topic: 'tag-outline',
};

/** Warm kinds are Sunset, living things Cherry Blossom, the rest Teal Mist. */
const SUNSET_KINDS: ReadonlySet<TopicKind> = new Set(['food', 'history', 'people', 'body', 'money', 'games']);
const CHERRY_KINDS: ReadonlySet<TopicKind> = new Set(['plant', 'bird', 'insect', 'animal', 'arts', 'music']);

type Props = {
  name: string;
  /** A removed topic's icon is muted like its name. */
  muted?: boolean;
};

// The icon of a topic, picked from the words of its name (lib/topicIcon).
export function TopicIcon({ name, muted = false }: Props) {
  const kind = topicKind(name);
  const color = muted
    ? colors.silverMuted
    : SUNSET_KINDS.has(kind)
      ? colors.sunset
      : CHERRY_KINDS.has(kind)
        ? colors.cherryBlossom
        : colors.tealMist;
  return (
    <MaterialCommunityIcons
      accessible={false}
      name={GLYPHS[kind]}
      color={color}
      size={sizes.topicIcon}
    />
  );
}
