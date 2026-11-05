// The math behind swipe-to-remove on the Sources screen (step 5.3): when a
// touch counts as a sideways swipe, how far the row is open, and whether it
// snaps open or shut when the finger lifts.
//
// "Open distance" runs from 0 (shut) to the width of the hidden Remove button
// (fully open). `direction` is the way the row moves to open: -1 when the
// button sits on the right (left-to-right layout), +1 when it sits on the left
// (right-to-left layout, as on the Hebrew phone).

export type SwipeDirection = -1 | 1;

/** How far the finger moves sideways before the row takes over the touch. */
export const SWIPE_START_PX = 10;

/** Finger speed (px per ms) that opens or shuts the row whatever the distance. */
export const FLICK_VELOCITY = 0.3;

/** True for a mostly sideways move, so vertical scrolling of the list still works. */
export function isSideways(dx: number, dy: number): boolean {
  return Math.abs(dx) > SWIPE_START_PX && Math.abs(dx) > 2 * Math.abs(dy);
}

/** The open distance while dragging: where the drag started plus how far it went, kept in range. */
export function dragDistance(
  startDistance: number,
  dx: number,
  direction: SwipeDirection,
  openWidth: number,
): number {
  return Math.min(openWidth, Math.max(0, startDistance + dx * direction));
}

/** The row's horizontal offset for an open distance. */
export function offsetFor(distance: number, direction: SwipeDirection): number {
  return distance * direction;
}

/**
 * Whether the row should snap open when the finger lifts. A quick flick wins;
 * otherwise the row opens if it is more than half open.
 */
export function shouldOpen(
  distance: number,
  vx: number,
  direction: SwipeDirection,
  openWidth: number,
): boolean {
  const openingSpeed = vx * direction;
  if (openingSpeed > FLICK_VELOCITY) {
    return true;
  }
  if (openingSpeed < -FLICK_VELOCITY) {
    return false;
  }
  return distance > openWidth / 2;
}
