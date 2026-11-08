// Feed order (spec §4 Feed): the selected videos are shuffled so two videos
// of the same item never appear in a row. Only impossible when one item has
// more than half the videos, e.g. a single active item; then the rest of that
// item's videos come together at the end.

import type { Random } from './itemDraw';

/**
 * Whether `counts` (videos left per group) can still be ordered with no two
 * of a group in a row when the next video may not be from `blocked`.
 */
function canFinish(counts: ReadonlyMap<number, number>, blocked: number | null): boolean {
  let total = 0;
  for (const count of counts.values()) total += count;
  for (const [group, count] of counts) {
    const limit = group === blocked ? Math.floor(total / 2) : Math.ceil(total / 2);
    if (count > limit) return false;
  }
  return true;
}

/**
 * When no order without repeats is left: the largest group other than
 * `previous`, which keeps the repeats to a minimum, or `previous` itself if
 * it is the only group left.
 */
function fallback(counts: ReadonlyMap<number, number>, previous: number | null): number[] {
  let best: number | null = null;
  for (const [group, count] of counts) {
    if (group !== previous && (best === null || count > (counts.get(best) ?? 0))) best = group;
  }
  return [best ?? [...counts.keys()][0]];
}

/**
 * A random order of `items` with no two of the same group next to each other,
 * where that's possible. `groupOf` gives each item's group, e.g. its itemId.
 * Each step picks a random video among the groups that keep the rest possible,
 * weighted by how many videos each group has left.
 */
export function spreadByGroup<T>(items: readonly T[], groupOf: (item: T) => number, random: Random): T[] {
  const left = new Map<number, T[]>();
  for (const item of items) {
    const group = groupOf(item);
    const list = left.get(group) ?? [];
    list.push(item);
    left.set(group, list);
  }
  const ordered: T[] = [];
  let previous: number | null = null;
  while (ordered.length < items.length) {
    const counts = new Map([...left].map(([group, list]) => [group, list.length]));
    const choices = [...left.keys()].filter((group) => {
      if (group === previous) return false;
      const after = new Map(counts);
      after.set(group, (after.get(group) ?? 0) - 1);
      return canFinish(after, group);
    });
    const pool: number[] = choices.length > 0 ? choices : fallback(counts, previous);
    const total = pool.reduce((sum: number, group: number) => sum + (counts.get(group) ?? 0), 0);
    let target = random() * total;
    let chosen: number = pool[pool.length - 1];
    for (const group of pool) {
      const count = counts.get(group) ?? 0;
      if (target < count) {
        chosen = group;
        break;
      }
      target -= count;
    }
    const list = left.get(chosen) ?? [];
    const [next] = list.splice(Math.min(list.length - 1, Math.floor(random() * list.length)), 1);
    if (list.length === 0) left.delete(chosen);
    ordered.push(next);
    previous = chosen;
  }
  return ordered;
}

/** How many neighbours share a group: 0 when the order is fully spread. */
export function adjacentRepeats<T>(items: readonly T[], groupOf: (item: T) => number): number {
  let repeats = 0;
  for (let index = 1; index < items.length; index += 1) {
    if (groupOf(items[index]) === groupOf(items[index - 1])) repeats += 1;
  }
  return repeats;
}
