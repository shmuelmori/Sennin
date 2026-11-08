import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getRemovedItemIds, setItemRemoved } from '@/db/items';
import type { FeedItem } from '@/lib/records';

// The Feed's remove button (spec §4 Feed, F3): marks a video's item as
// removed, so later fetches don't draw it, and offers "Undo" for 5 seconds.
// Videos of that item already in the list stay. The removed IDs are read
// each time the Feed opens, since the Topics tab can restore items.

export const UNDO_MS = 5000;

export type UndoOffer = { itemId: number; name: string };

function log(line: string) {
  console.log(`[feed] ${line}`);
}

export function useItemRemoval() {
  const db = useDatabase();
  const [removedIds, setRemovedIds] = useState<ReadonlySet<number>>(new Set());
  const [undo, setUndo] = useState<UndoOffer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRemovedItemIds(db).then(
        (ids) => {
          if (active) setRemovedIds(ids);
        },
        (cause: unknown) => log(`reading removed items failed: ${String(cause)}`),
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  const setRemoved = useCallback(
    async (itemId: number, removed: boolean): Promise<boolean> => {
      setRemovedIds((current) => {
        const next = new Set(current);
        if (removed) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
      try {
        // false: the item was deleted on the Topics tab. Its button stays hidden.
        return await setItemRemoved(db, itemId, removed, Date.now());
      } catch (cause) {
        log(`${removed ? 'removing' : 'restoring'} item ${itemId} failed: ${String(cause)}`);
        setRemovedIds(await getRemovedItemIds(db).catch(() => new Set<number>()));
        return false;
      }
    },
    [db],
  );

  /** The remove button was tapped on a video of this item. */
  const removeItem = useCallback(
    async (video: FeedItem) => {
      clearTimer();
      if (!(await setRemoved(video.itemId, true))) return;
      log(`removed item ${video.itemName} (${video.itemId})`);
      setUndo({ itemId: video.itemId, name: video.itemName });
      timer.current = setTimeout(() => setUndo(null), UNDO_MS);
    },
    [clearTimer, setRemoved],
  );

  /** "Undo" was tapped: the item is drawn again. */
  const undoRemove = useCallback(async () => {
    const offer = undo;
    clearTimer();
    setUndo(null);
    if (offer === null) return;
    if (await setRemoved(offer.itemId, false)) log(`undid removing ${offer.name} (${offer.itemId})`);
  }, [undo, clearTimer, setRemoved]);

  return { removedIds, undo, removeItem, undoRemove };
}
