// The blocked words of the filter rules (spec §5). Agreed with the user on
// 2026-11-06.
//
// All entries are lowercase. lib/textMatch.ts matches them as whole words,
// ignoring case. Narrower than the spec's "reaction" example, which would also
// block educational titles like "chain reaction".

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
