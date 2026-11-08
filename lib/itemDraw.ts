// Drawing the items for a fetch (spec §5 step 1): 20 distinct active items,
// weighted so items that haven't come up for a while are more likely.
//
// Weight: 30 for an item never drawn, otherwise the days since it was last
// drawn (Pacific days, like the quota), up to 30. An item drawn today has
// weight 0. `random` is passed in so tests can fix it.

import { pacificDayNumber } from './quota';
import type { Item } from './records';

export const DRAW_SIZE = 20;
export const MAX_WEIGHT = 30;

type Drawable = Pick<Item, 'removed' | 'lastPickedAtMs'>;

/** A number in [0, 1), like Math.random. */
export type Random = () => number;

export function drawWeight(item: Pick<Item, 'lastPickedAtMs'>, nowMs: number): number {
  if (item.lastPickedAtMs === null) {
    return MAX_WEIGHT;
  }
  const days = pacificDayNumber(nowMs) - pacificDayNumber(item.lastPickedAtMs);
  return Math.min(MAX_WEIGHT, Math.max(0, days));
}

/** Picks one index by weight. With every weight 0, picks uniformly. */
function pickIndex(weights: readonly number[], random: Random): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return Math.min(weights.length - 1, Math.floor(random() * weights.length));
  }
  let target = random() * total;
  let last = -1;
  for (const [index, weight] of weights.entries()) {
    if (weight <= 0) continue;
    last = index;
    if (target < weight) return index;
    target -= weight;
  }
  return last; // only reached through rounding
}

/**
 * Draws `count` distinct items from the active ones, by weight, without
 * repeats. With `count` or fewer active items, takes them all. Items with
 * weight 0 are only drawn once every item with a weight is taken.
 */
export function drawItems<T extends Drawable>(
  items: readonly T[],
  nowMs: number,
  random: Random,
  count: number = DRAW_SIZE,
): T[] {
  const pool = items.filter((item) => !item.removed);
  if (pool.length <= count) {
    return pool;
  }
  const weights = pool.map((item) => drawWeight(item, nowMs));
  const drawn: T[] = [];
  while (drawn.length < count) {
    const index = pickIndex(weights, random);
    drawn.push(pool[index]);
    pool.splice(index, 1);
    weights.splice(index, 1);
  }
  return drawn;
}
