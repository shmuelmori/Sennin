import { textDirection } from './textDirection';

describe('textDirection', () => {
  it('reads Hebrew right to left and English left to right', () => {
    expect(textDirection('מלחמת העולם השנייה')).toBe('rtl');
    expect(textDirection('World War II in 60 seconds')).toBe('ltr');
  });

  it('goes by the first letter in mixed text', () => {
    expect(textDirection('Claude Code: מדריך קצר')).toBe('ltr');
    expect(textDirection('מדריך Claude Code')).toBe('rtl');
  });

  it('skips digits, punctuation, hashtags and emoji before the first letter', () => {
    expect(textDirection('1944: הפלישה לנורמנדי')).toBe('rtl');
    expect(textDirection('#shorts הקרב על בריטניה')).toBe('ltr');
    expect(textDirection('🔥 "D-Day" explained')).toBe('ltr');
    expect(textDirection('  (!) ערוץ ההיסטוריה')).toBe('rtl');
  });

  it('treats Arabic and other right-to-left scripts like Hebrew', () => {
    expect(textDirection('الحرب العالمية الثانية')).toBe('rtl');
    expect(textDirection('ﭏ')).toBe('rtl');
  });

  it('treats letters of other left-to-right scripts like English', () => {
    expect(textDirection('Вторая мировая')).toBe('ltr');
    expect(textDirection('仙人')).toBe('ltr');
  });

  it('follows a direction mark that comes before any letter', () => {
    expect(textDirection('‏123 abc')).toBe('rtl');
    expect(textDirection('‎123 אבג')).toBe('ltr');
  });

  it('returns null when there is no letter', () => {
    expect(textDirection('')).toBeNull();
    expect(textDirection('2024 – 15!')).toBeNull();
    expect(textDirection('🎯🎯')).toBeNull();
  });
});
