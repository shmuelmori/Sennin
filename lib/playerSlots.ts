// Which video each of the feed's reused players shows (spec §3, §10).
//
// The feed keeps a fixed number of players and moves them between pages,
// instead of creating a player per page: on the phone, creating a new player
// on every swipe stopped working after about 10 players (step 7.1).

/** The current video and one neighbor on each side. */
export const PLAYER_SLOTS = 3;

export type SlotAssignment = {
  /** Which player, from 0 to slotCount - 1. The same slot keeps the same player. */
  slot: number;
  /** The video page the player sits on and shows. */
  pageIndex: number;
};

/**
 * The video pages that have a player: `slotCount` pages in a row around the
 * current page, kept inside the list. At either end of the list the window
 * shifts inward, so every player always has a video (e.g. pages 0, 1, 2 while
 * on page 0). `currentIndex` may be the end page, `videoCount`.
 */
export function playerWindow(
  currentIndex: number,
  videoCount: number,
  slotCount: number = PLAYER_SLOTS,
): number[] {
  if (videoCount <= 0 || slotCount <= 0 || !Number.isFinite(currentIndex)) {
    return [];
  }
  const count = Math.min(slotCount, videoCount);
  const wanted = Math.round(currentIndex) - Math.floor((count - 1) / 2);
  const first = Math.min(Math.max(wanted, 0), videoCount - count);
  return Array.from({ length: count }, (_, i) => first + i);
}

/**
 * Gives each page in the window a player. Page p always gets slot
 * p % slotCount, so when the window moves by one page only one player
 * changes its video, and the other two keep theirs. Sorted by slot.
 */
export function assignSlots(
  currentIndex: number,
  videoCount: number,
  slotCount: number = PLAYER_SLOTS,
): SlotAssignment[] {
  return playerWindow(currentIndex, videoCount, slotCount)
    .map((pageIndex) => ({ slot: pageIndex % slotCount, pageIndex }))
    .sort((a, b) => a.slot - b.slot);
}
