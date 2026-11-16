import { offlineCacheNames } from '../core/cache-names';
import { type Connectivity, watchConnectivity } from '../core/connectivity';
import { OfflineUnsupportedError } from '../core/errors';
import type { OfflineEnvironment } from '../core/offline-controller';
import { createCacheRegistry } from '../core/project-registry';

export const WORKER_READY_TIMEOUT_MS = 10_000;

const activeRegistration = (container: ServiceWorkerContainer): Promise<ServiceWorkerRegistration> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new OfflineUnsupportedError('No offline worker became active for this page.')),
      WORKER_READY_TIMEOUT_MS,
    );
    container.ready.then((registration) => {
      clearTimeout(timer);
      resolve(registration);
    }, reject);
  });

/**
 * Opens the caches shared with the offline worker of this page.
 * `scope` overrides the scope the cache names derive from; it defaults to the scope of the active worker.
 */
export const resolveBrowserEnvironment = async (scope?: string): Promise<OfflineEnvironment> => {
  if (!('serviceWorker' in navigator) || !('caches' in globalThis)) {
    throw new OfflineUnsupportedError('Service workers or cache storage are not available in this browser or context.');
  }
  const registration = await activeRegistration(navigator.serviceWorker);
  const scopeUrl = scope === undefined ? registration.scope : new URL(scope, window.location.href).href;
  const names = offlineCacheNames(scopeUrl);
  const [assets, registry] = await Promise.all([caches.open(names.assets), caches.open(names.registry)]);
  return {
    cache: assets,
    registry: createCacheRegistry(registry, scopeUrl),
    fetch: (input, init) => fetch(input, init),
  };
};

export const browserConnectivity = (): Connectivity => watchConnectivity(window, () => navigator.onLine);
