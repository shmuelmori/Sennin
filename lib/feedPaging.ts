// Pure helpers for the paging feed (spec §3, §10).

export type Size = {
  width: number;
  height: number;
};

/** Shorts are vertical 9:16 video. */
export const SHORT_ASPECT: Size = { width: 9, height: 16 };

/** Index of the page a vertical scroll offset lands on, clamped to the list. */
export function pageIndexFromOffset(offsetY: number, pageHeight: number, count: number): number {
  if (count <= 0 || !(pageHeight > 0) || !Number.isFinite(offsetY)) {
    return 0;
  }
  const index = Math.round(offsetY / pageHeight);
  return Math.min(Math.max(index, 0), count - 1);
}

/**
 * The page a paging scroll will settle on, read from its first movement after
 * the finger lifts (step 7.5). The snap animation moves straight to the floor
 * or the ceiling page of where the finger let go, so its direction tells
 * which. Returns null if the list hasn't moved yet. Going back to the page
 * the swipe started from is a valid result.
 */
export function snapTargetIndex(
  releaseOffsetY: number,
  offsetY: number,
  pageHeight: number,
  count: number,
): number | null {
  if (
    count <= 0 ||
    !(pageHeight > 0) ||
    !Number.isFinite(releaseOffsetY) ||
    !Number.isFinite(offsetY)
  ) {
    return null;
  }
  const delta = offsetY - releaseOffsetY;
  if (delta === 0) return null;
  const at = releaseOffsetY / pageHeight;
  // Moving down the list: the page below the release point. Released exactly
  // on a page, that is the next one. Moving up: the same, the other way.
  const index = delta > 0 ? Math.floor(at) + 1 : Math.ceil(at) - 1;
  return Math.min(Math.max(index, 0), count - 1);
}

export type FeedPageLayout = {
  /** Height of the strip at the top of the page, for the item name and title (§4). */
  infoHeight: number;
  /** The player's size. It sits right under the strip, centered across the page. */
  player: Size;
  /** Distance from the top of the page to the player: the strip's height. */
  playerTop: number;
};

/**
 * Splits a feed page into the strip on top and the player below it. The
 * strip gets at least `minInfoHeight`, the player the largest 9:16 size that
 * fits under it, and any height left over goes to the strip. The two add up
 * to the page height, so the strip never overlaps the player.
 */
export function feedPageLayout(page: Size, minInfoHeight: number): FeedPageLayout {
  const reserved = Number.isFinite(minInfoHeight) ? Math.max(0, minInfoHeight) : 0;
  const room = { width: page.width, height: page.height - reserved };
  const player = room.height > 0 ? fitAspect(room, SHORT_ASPECT) : { width: 0, height: 0 };
  const infoHeight = Math.max(0, page.height - player.height);
  return { infoHeight, player, playerTop: infoHeight };
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
