// Which way a piece of text reads, for titles and channel names that can be
// Hebrew or English (spec §11, step 9.3).
//
// On Android, React Native aligns text by the app's layout direction, not by
// the text: on a phone set to Hebrew, an English title sits on the right too.
// Giving each title its own direction (the `direction` style) makes it start
// on its own side. Android's own text layout picks the reading order from the
// first letter that has a direction (TextDirectionHeuristics.FIRSTSTRONG_LTR),
// so this uses the same rule and the alignment always matches the text.

export type TextDirection = 'ltr' | 'rtl';

/** Hebrew, Arabic, Syriac, Thaana and N'Ko, plus their presentation forms. */
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/u;
const LETTER = /\p{L}/u;
const LEFT_TO_RIGHT_MARK = '‎';
const RIGHT_TO_LEFT_MARK = '‏';

/**
 * The direction of the first letter in `text`, or `null` when there is no
 * letter (only digits, punctuation, emoji or spaces), so the caller can keep
 * the layout's own direction.
 */
export function textDirection(text: string): TextDirection | null {
  for (const char of text) {
    if (char === RIGHT_TO_LEFT_MARK) return 'rtl';
    if (char === LEFT_TO_RIGHT_MARK) return 'ltr';
    if (RTL_LETTER.test(char)) return 'rtl';
    if (LETTER.test(char)) return 'ltr';
  }
  return null;
}
