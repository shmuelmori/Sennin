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
  /** Deep Sea Night at 80%: the glass cards and rows over the background art. */
  glass: '#0E2A2FCC',
  /** Deep Sea Night at 55%: the softer glass of the search bar and the last-fetch pill. */
  glassLight: '#0E2A2F8C',
  /** The darker end of the Refresh button's Sunset gradient. */
  sunsetDeep: '#C8432D',
  /** Glows around cards and buttons (boxShadow) and the brush stroke's fade. */
  tealGlow: '#2F8F8A99',
  sunsetGlow: '#E0533AB3',
  sunsetClear: '#E0533A00',
  /** The shadow that keeps titles readable over the bright parts of the art. */
  textShadow: '#000000CC',
} as const;

/**
 * Android system font families, so no font package is needed. "cursive" is
 * Dancing Script on Android: the brush-style titles. "serif" is Noto Serif:
 * the topic names. A phone without one falls back to the default font.
 */
export const fonts = {
  script: 'cursive',
  serif: 'serif',
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
  refreshButtonWidth: 240,
  refreshButtonHeight: 64,
  /** The remove button in the feed strip. Its hit area is larger (hitSlop). */
  removeIcon: 24,
  /** The round + button in the Topics header: a comfortable touch target. */
  addButton: 52,
  /** The API units ring on the Refresh tab, and its stroke. */
  usageRing: 116,
  usageRingStroke: 10,
  /** Topic icons in the Topics list and the drawn-topics card. */
  topicIcon: 26,
} as const;

export const fontSize = {
  small: 14,
  body: 16,
  title: 24,
  /** The label of the large Refresh button. */
  button: 20,
  /** The short label under each bottom bar icon. */
  tabLabel: 12,
  /** A topic name in the Topics list. */
  topic: 18,
  /** A number in the Refresh tab's stat tiles. */
  stat: 26,
  /** The script heading of a card. */
  cardTitle: 28,
  /** The script title at the top of the Refresh and Topics tabs. */
  hero: 60,
} as const;
