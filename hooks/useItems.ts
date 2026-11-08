import type { SQLiteDatabase } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { addItems, deleteItem, listItems, setItemRemoved } from '@/db/items';
import { describeAddResult, parseItemInput } from '@/lib/itemInput';
import { sortItems } from '@/lib/itemList';
import type { Item } from '@/lib/records';

// The item list for the Topics tab (spec §4 Topics, F2, F3): reads every
// item from SQLite, sorted alphabetically, each time the tab opens (the Feed
// can remove items meanwhile), adds comma-separated items, restores a removed
// item and deletes one for good. Changes show at once and are then saved; if
// saving fails, the list is read again.

function log(line: string) {
  console.log(`[topics] ${line}`);
}

/** The saved items, sorted, or null if reading them failed. */
async function readItems(db: SQLiteDatabase): Promise<Item[] | null> {
  try {
    return sortItems(await listItems(db));
  } catch (cause) {
    log(`reading items failed: ${String(cause)}`);
    return null;
  }
}

export type AddResult = { ok: boolean; message: string };

export function useItems() {
  const db = useDatabase();
  /** null until the first read finishes. */
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const read = await readItems(db);
    if (read === null) {
      setError("Couldn't read your topics.");
    } else {
      setItems(read);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  /** Adds the typed items and returns the message to show (F2). */
  const add = useCallback(
    async (text: string): Promise<AddResult> => {
      const { names, duplicates } = parseItemInput(text, (items ?? []).map((item) => item.name));
      if (names.length === 0) {
        return { ok: duplicates > 0, message: describeAddResult(0, duplicates) };
      }
      try {
        const added = await addItems(db, names, Date.now());
        // A name the list didn't show yet (e.g. saved meanwhile) counts as a duplicate.
        const skipped = duplicates + (names.length - added);
        log(`added ${added}, skipped ${skipped}`);
        await reload();
        return { ok: true, message: describeAddResult(added, skipped) };
      } catch (cause) {
        log(`adding failed: ${String(cause)}`);
        return { ok: false, message: "Couldn't add the topics." };
      }
    },
    [db, items, reload],
  );

  const restore = useCallback(
    async (item: Item) => {
      setError(null);
      setItems(
        (current) =>
          current?.map((i) => (i.id === item.id ? { ...i, removed: false, removedAtMs: null } : i)) ??
          null,
      );
      try {
        await setItemRemoved(db, item.id, false, Date.now());
        log(`restored ${item.name} (${item.id})`);
      } catch (cause) {
        log(`restoring ${item.id} failed: ${String(cause)}`);
        setError(`Couldn't restore ${item.name}.`);
        await reload();
      }
    },
    [db, reload],
  );

  const remove = useCallback(
    async (item: Item) => {
      setError(null);
      setItems((current) => current?.filter((i) => i.id !== item.id) ?? null);
      try {
        await deleteItem(db, item.id);
        log(`deleted ${item.name} (${item.id})`);
      } catch (cause) {
        log(`deleting ${item.id} failed: ${String(cause)}`);
        setError(`Couldn't delete ${item.name}.`);
        await reload();
      }
    },
    [db, reload],
  );

  return { items, error, add, restore, remove };
}
