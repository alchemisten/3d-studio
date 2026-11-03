import { createContext, useContext } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import type { ViewerState, ViewerStore } from './viewer-store';

export const ViewerContext = createContext<ViewerStore | null>(null);

/** The store of the nearest viewer. Throws outside a `<Viewer>`. */
export const useViewer = (): ViewerStore => {
  const store = useContext(ViewerContext);
  if (!store) {
    throw new Error('useViewer must be used inside <Viewer>.');
  }
  return store;
};

/** Subscribes a component to a slice of viewer state. */
export const useViewerState = <T>(selector: (state: ViewerState) => T, equal: (a: T, b: T) => boolean = Object.is): T => {
  const store = useViewer();
  return useSyncExternalStoreWithSelector(store.subscribe, store.getState, store.getState, selector, equal);
};
