import { createContext, useContext, useSyncExternalStore } from 'react';
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
export const useViewerState = <T>(selector: (state: ViewerState) => T): T => {
  const store = useViewer();
  return selector(useSyncExternalStore(store.subscribe, store.getState, store.getState));
};
