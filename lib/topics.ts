// The 2 hard-coded topics with their keywords, and the blocked words (spec §2, §5).
// Lists agreed with the user on 2026-11-06. Step 3.1 seeds the topic table from here.
//
// All entries are lowercase. lib/textMatch.ts matches them as whole words, ignoring
// case, and lets Hebrew words take a prefix letter (ה, ב, ל, ו, מ, ש, כ). That is
// why "שואה" is listed rather than "השואה": it also matches "בשואה".
// Plurals are listed separately because "nazi" doesn't match inside "nazis".

export type TopicId = 'ww2' | 'claude-code';

export type Topic = {
  id: TopicId;
  name: string;
  keywords: readonly string[];
};

export const TOPICS: readonly Topic[] = [
  {
    id: 'ww2',
    name: 'World War II',
    keywords: [
      'world war ii',
      'world war 2',
      'ww2',
      'wwii',
      'second world war',
      'nazi',
      'nazis',
      'hitler',
      'churchill',
      'stalin',
      'mussolini',
      'd-day',
      'normandy',
      'dunkirk',
      'stalingrad',
      'pearl harbor',
      'midway',
      'iwo jima',
      'okinawa',
      'hiroshima',
      'nagasaki',
      'holocaust',
      'blitz',
      'battle of britain',
      'luftwaffe',
      'wehrmacht',
      'panzer',
      'u-boat',
      'enigma',
      'eastern front',
      'barbarossa',
      'rommel',
      'patton',
      'eisenhower',
      'manhattan project',
      'מלחמת העולם השנייה',
      'מלחמת העולם השניה',
      'שואה',
      'היטלר',
      'נאצים',
      'נאצי',
    ],
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    keywords: [
      'claude code',
      'claude',
      'anthropic',
      'claude.md',
      'mcp',
      'model context protocol',
      'subagent',
      'subagents',
      'agentic coding',
      'coding agent',
      'קלוד',
      'אנתרופיק',
    ],
  },
];

// Narrower than the spec's "reaction" example, which would also block educational
// titles like "chain reaction" or "Churchill's reaction to Dunkirk".
export const BLOCKED_WORDS: readonly string[] = [
  'reacts to',
  'reacting to',
  'reaction video',
  '#reaction',
  'giveaway',
  '#meme',
  '#memes',
  'prank',
  'unboxing',
];
