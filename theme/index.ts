// Visual identity from spec §11. This is the only place colors are defined:
// components import from here and never use hex literals.

export const colors = {
  /** Background of every screen. */
  deepSeaNight: '#0E2A2F',
  /** Primary buttons ("Refresh"), active states, progress. Text on it: deepSeaNight, bold. */
  sunset: '#E0533A',
  /** Secondary buttons, topic tags, dividers. Text on it: deepSeaNight, bold. */
  tealMist: '#2F8F8A',
  /** Small highlights: the "4 of 15" counter, icons, sakura. As text, only on deepSeaNight. */
  cherryBlossom: '#F3C6C8',
  /** Body text and titles. Only on deepSeaNight. */
  silver: '#DCDFDE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Soft rounded corners (§11). */
export const radius = {
  sm: 8,
  md: 12,
  pill: 999,
} as const;

export const fontSize = {
  small: 14,
  body: 16,
  title: 24,
} as const;
