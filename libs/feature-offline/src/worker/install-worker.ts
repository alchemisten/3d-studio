import { offlineCacheNames } from '../core/cache-names';
import { AssetFetchError, OfflineError } from '../core/errors';
import { withTimeout } from '../core/with-timeout';
import { SKIP_WAITING_MESSAGE, type WorkerConfig } from './worker-config';
import type { WorkerScope } from './worker-scope';

export const PRECACHE_TIMEOUT_MS = 30_000;

const isSkipWaiting = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === SKIP_WAITING_MESSAGE.type;

/**
 * Wires the offline behaviour into a service worker:
 * - install precaches the app shell into a cache named after `config.version`;
 * - activate deletes the caches of older versions of this scope and takes over open pages;
 * - navigations inside the registration scope go to the network and fall back to the precached shell;
 * - `config.networkFirst` requests go to the network and fall back to the saved copy;
 * - every other GET is answered from the shell or the saved project assets when present, else by the network.
 *
 * Navigations outside the registration scope, URLs on the denylist and requests that opt out of caching
 * (`cache: 'no-store' | 'reload'`, used to save and revalidate projects) are never touched.
 * A waiting version only activates when a page sends `SKIP_WAITING_MESSAGE`.
 */
export const installOfflineWorker = (scope: WorkerScope, config: WorkerConfig): void => {
  const scopeUrl = new URL(scope.registration.scope);
  const names = offlineCacheNames(scopeUrl.href);
  const shellName = names.shell(config.version);
  const resolveShellUrl = (url: string) => new URL(url, scope.location.href).href;
  const fallbackUrl = config.navigationFallback === null ? null : resolveShellUrl(config.navigationFallback);
  const denylist = config.denylist.map((source) => new RegExp(source));
  const networkFirst = config.networkFirst.map((source) => new RegExp(source));

  const isInScope = (url: URL) => url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname);
  const isDenied = (url: URL) =>
    url.origin === scopeUrl.origin && denylist.some((pattern) => pattern.test(url.pathname));

  const precache = async () => {
    const shell = await scope.caches.open(shellName);
    for (const entry of config.precache) {
      const url = resolveShellUrl(entry.url);
      const response = await withTimeout({ url, timeoutMs: PRECACHE_TIMEOUT_MS }, (signal) =>
        scope.fetch(url, { cache: 'reload', signal }),
      );
      if (!response.ok) throw new AssetFetchError(url, response.status);
      await shell.put(url, response);
    }
  };

  const cleanUp = async () => {
    const current = new Set([shellName, names.assets, names.registry]);
    const outdated = (await scope.caches.keys()).filter((name) => name.startsWith(names.prefix) && !current.has(name));
    await Promise.all(outdated.map((name) => scope.caches.delete(name)));
    await scope.clients.claim();
  };

  const fromShell = async (url: string) => (await scope.caches.open(shellName)).match(url);
  const fromAssets = async (url: string) => (await scope.caches.open(names.assets)).match(url);

  const networkThenCache = async (request: Request, cached: () => Promise<Response | undefined>) => {
    try {
      const response = await withTimeout({ url: request.url, timeoutMs: config.networkTimeoutMs }, (signal) =>
        scope.fetch(request, { signal }),
      );
      if (response.status < 500) return response;
      return (await cached()) ?? response;
    } catch (error) {
      const fallback = await cached();
      if (fallback) return fallback;
      throw new OfflineError(`${request.url} is neither reachable nor saved.`, { cause: error });
    }
  };

  const cacheThenNetwork = async (request: Request) =>
    (await fromShell(request.url)) ?? (await fromAssets(request.url)) ?? scope.fetch(request);

  scope.addEventListener('install', (event) => event.waitUntil(precache()));
  scope.addEventListener('activate', (event) => event.waitUntil(cleanUp()));
  scope.addEventListener('message', (event) => {
    if (isSkipWaiting(event.data)) void scope.skipWaiting();
  });
  scope.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET' || !url.protocol.startsWith('http') || request.headers.has('range')) return;
    if (request.cache === 'no-store' || request.cache === 'reload' || isDenied(url)) return;
    if (request.mode === 'navigate') {
      if (fallbackUrl !== null && isInScope(url)) {
        event.respondWith(networkThenCache(request, () => fromShell(fallbackUrl)));
      }
      return;
    }
    if (networkFirst.some((pattern) => pattern.test(url.href))) {
      event.respondWith(networkThenCache(request, () => fromAssets(request.url)));
      return;
    }
    event.respondWith(cacheThenNetwork(request));
  });
};
