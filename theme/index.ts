// Visual identity from spec §11. This is the only place colors are defined:
// components import from here and never use hex literals.

export const colors = {
  /** Background of every screen. */
  deepSeaNight: '#0E2A2F',
  /** Primary buttons ("Refresh"), active states, progress. Text on it: deepSeaNight, bold. */
  sunset: '#E0533A',
  /** Secondary buttons and dividers. Text on it: deepSeaNight, bold. */
  tealMist: '#2F8F8A',
  /** Small highlights: the item name above the video, icons, sakura. As text, only on deepSeaNight. */
  cherryBlossom: '#F3C6C8',
  /** Body text and titles. Only on deepSeaNight. */
  silver: '#DCDFDE',
  /** Silver at 65% opacity: placeholders, hints and removed topics. Only on deepSeaNight. */
  silverMuted: '#DCDFDEA6',
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
  /** The large Refresh button. */
  lg: 20,
  pill: 999,
} as const;

export const sizes = {
  /**
   * Smallest height of the strip above a feed video (padding, one line of
   * item name, two lines of title).
   */
  feedInfoMinHeight: 84,
  /** The large Refresh button in the middle of the Refresh tab. */
  refreshButtonWidth: 220,
  refreshButtonHeight: 64,
  /** The remove button in the feed strip. Its hit area is larger (hitSlop). */
  removeIcon: 24,
  /** The round + button in the Topics header: a comfortable touch target. */
  addButton: 40,
} as const;

export const fontSize = {
  small: 14,
  body: 16,
  title: 24,
  /** The label of the large Refresh button. */
  button: 20,
  /** The short label under each bottom bar icon. */
  tabLabel: 12,
} as const;
