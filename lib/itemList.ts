// The Topics tab's list (spec §4 Topics): every item in one flat list,
// sorted alphabetically, filtered by the search bar, with an
// "active of total" counter.

import type { Item } from './records';

/** Alphabetical, ignoring case and accents; ties by ID so the order is stable. */
export function sortItems<T extends Pick<Item, 'id' | 'name'>>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id - b.id,
  );
}

/** Items whose name contains the search text, ignoring case. An empty search keeps all. */
export function filterItems<T extends Pick<Item, 'name'>>(items: readonly T[], search: string): T[] {
  const needle = search.trim().toLocaleLowerCase('en-US');
  if (needle === '') {
    return [...items];
  }
  return items.filter((item) => item.name.toLocaleLowerCase('en-US').includes(needle));
}

/** The counter at the top of the tab, e.g. "312 of 320 active". */
export function activeCountLabel(items: readonly Pick<Item, 'removed'>[]): string {
  const active = items.filter((item) => !item.removed).length;
  return `${active.toLocaleString('en-US')} of ${items.length.toLocaleString('en-US')} active`;
}
