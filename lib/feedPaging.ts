// Pure helpers for the paging feed (spec §3, §10).

export type Size = {
  width: number;
  height: number;
};

/** Shorts are vertical 9:16 video. */
export const SHORT_ASPECT: Size = { width: 9, height: 16 };

/**
 * How many items on each side of the current one keep a mounted player.
 * A player is mounted only for the current video and its neighbors (spec §10).
 */
export const PLAYER_NEIGHBORS = 1;

/** Index of the page a vertical scroll offset lands on, clamped to the list. */
export function pageIndexFromOffset(offsetY: number, pageHeight: number, count: number): number {
  if (count <= 0 || !(pageHeight > 0) || !Number.isFinite(offsetY)) {
    return 0;
  }
  const index = Math.round(offsetY / pageHeight);
  return Math.min(Math.max(index, 0), count - 1);
}

/** Whether the item at `index` should have a player mounted. */
export function shouldMountPlayer(
  index: number,
  currentIndex: number,
  neighbors: number = PLAYER_NEIGHBORS,
): boolean {
  return Math.abs(index - currentIndex) <= neighbors;
}

export type FeedPageLayout = {
  /** The player's size. It sits at the top of the page, centered across it. */
  player: Size;
  /** Height of the strip under the player, for the channel name and title (§4). */
  infoHeight: number;
};

/**
 * Splits a feed page into the player and the strip under it. The strip gets
 * at least `minInfoHeight`, the player the largest 9:16 size that fits above
 * it, and any height left over goes to the strip. Nothing overlaps the player.
 */
export function feedPageLayout(page: Size, minInfoHeight: number): FeedPageLayout {
  const reserved = Number.isFinite(minInfoHeight) ? Math.max(0, minInfoHeight) : 0;
  const room = { width: page.width, height: page.height - reserved };
  const player = room.height > 0 ? fitAspect(room, SHORT_ASPECT) : { width: 0, height: 0 };
  return { player, infoHeight: Math.max(0, page.height - player.height) };
}

/** The largest size with the given aspect ratio that fits inside the container. */
export function fitAspect(container: Size, aspect: Size): Size {
  if (container.width <= 0 || container.height <= 0 || aspect.width <= 0 || aspect.height <= 0) {
    return { width: 0, height: 0 };
  }
  const ratio = aspect.width / aspect.height;
  const widthAtFullHeight = container.height * ratio;
  if (widthAtFullHeight <= container.width) {
    return { width: widthAtFullHeight, height: container.height };
  }
  return { width: container.width, height: container.width / ratio };
}
