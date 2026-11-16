export interface ConnectivityTarget {
  addEventListener(type: 'online' | 'offline', listener: () => void): void;
  removeEventListener(type: 'online' | 'offline', listener: () => void): void;
}

/** Whether the device reports a network connection, and a way to hear about changes. */
export interface Connectivity {
  isOnline: () => boolean;
  /** Returns the function that stops the subscription. */
  subscribe: (listener: (isOnline: boolean) => void) => () => void;
}

/** Watches the `online` / `offline` events of a window-like target. */
export const watchConnectivity = (target: ConnectivityTarget, isOnline: () => boolean): Connectivity => ({
  isOnline,
  subscribe: (listener) => {
    const notify = () => listener(isOnline());
    target.addEventListener('online', notify);
    target.addEventListener('offline', notify);
    return () => {
      target.removeEventListener('online', notify);
      target.removeEventListener('offline', notify);
    };
  },
});
