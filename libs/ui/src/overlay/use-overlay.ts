import { useMemo } from 'react';
import { useSlotContext } from '../slots/slot-context';
import { regionSlot, type OverlayRegion } from './regions';
import { renderOverlayItem, type OverlayItem } from './overlay';
import type { SlotContent } from '../slots';

export interface OverlayApi {
  /** Adds (or overwrites by id) an item; returns a function that removes it. */
  add(region: OverlayRegion, item: OverlayItem): () => void;
  remove(region: OverlayRegion, id: string): void;
}

/** Imperative registry API, e.g. for features: `overlay.add('top-right', { id, icon, label, onClick })`. */
export const useOverlay = (): OverlayApi => {
  const { store } = useSlotContext();
  return useMemo(
    () => ({
      add: (region, item) =>
        store.add(regionSlot(region), {
          id: item.id,
          mode: 'append',
          order: item.order ?? 0,
          content: renderOverlayItem(item) as SlotContent,
        }),
      remove: (region, id) => store.remove(regionSlot(region), id),
    }),
    [store],
  );
};
