import { useSyncExternalStore } from 'react';
import type { Connectivity } from './core/connectivity';
import type { OfflineController, OfflineState } from './core/offline-controller';

export const useOfflineState = (controller: OfflineController): OfflineState =>
  useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);

export const useIsOnline = (connectivity: Connectivity): boolean =>
  useSyncExternalStore(connectivity.subscribe, connectivity.isOnline, () => true);
