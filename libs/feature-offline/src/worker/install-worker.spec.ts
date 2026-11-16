import { describe, expect, it, vi } from 'vitest';
import { offlineCacheNames } from '../core/cache-names';
import { AssetFetchError, OfflineError } from '../core/errors';
import { createFakeFetch, type FakeResponse } from '../core/testing';
import type { FetchLike } from '../core/with-timeout';
import { installOfflineWorker } from './install-worker';
import { SKIP_WAITING_MESSAGE, workerConfig, type WorkerConfigInput } from './worker-config';
import type { LifecycleEvent, WorkerFetchEvent, WorkerMessageEvent, WorkerScope } from './worker-scope';

const SCOPE = 'https://stage.test/app/viewer/';
const SHELL = `${SCOPE}index.html`;
const SCRIPT = `${SCOPE}assets/main-1f.js`;
const MODEL = 'https://stage.test/projects/tray/model-a1.glb';
const RECORD = 'https://stage.test/api/projects/tray';
const names = offlineCacheNames(SCOPE);

const createRequest = (
  url: string,
  overrides: Partial<Pick<Request, 'method' | 'mode' | 'cache'>> = {},
  range = false,
) =>
  ({
    url,
    method: 'GET',
    mode: 'cors',
    cache: 'default',
    headers: new Headers(range ? { range: 'bytes=0-1' } : {}),
    ...overrides,
  }) as Request;

const navigation = (url: string) => createRequest(url, { mode: 'navigate' });

interface Harness {
  stores: Map<string, Map<string, Response>>;
  fetch: FetchLike & { calls: { url: string }[] };
  skipWaiting: ReturnType<typeof vi.fn>;
  claim: ReturnType<typeof vi.fn>;
  install: () => Promise<unknown>;
  activate: () => Promise<unknown>;
  message: (data: unknown) => void;
  request: (request: Request) => Promise<Response> | undefined;
  seed: (cacheName: string, url: string, body: string) => void;
}

const createHarness = (
  config: Partial<WorkerConfigInput>,
  routes: Record<string, FakeResponse>,
  fetch: Harness['fetch'] = createFakeFetch(routes),
): Harness => {
  const stores: Harness['stores'] = new Map();
  const store = (name: string) => {
    const existing = stores.get(name);
    if (existing) return existing;
    const created = new Map<string, Response>();
    stores.set(name, created);
    return created;
  };
  const lifecycle = new Map<string, (event: LifecycleEvent) => void>();
  let onFetch: (event: WorkerFetchEvent) => void = () => undefined;
  let onMessage: (event: WorkerMessageEvent) => void = () => undefined;
  const skipWaiting = vi.fn(async () => undefined);
  const claim = vi.fn(async () => undefined);
  const addEventListener = ((type: string, listener: never) => {
    if (type === 'fetch') onFetch = listener;
    else if (type === 'message') onMessage = listener;
    else lifecycle.set(type, listener);
  }) as WorkerScope['addEventListener'];
  const scope: WorkerScope = {
    location: { href: `${SCOPE}sw.js` },
    registration: { scope: SCOPE },
    caches: {
      open: async (name) => ({
        match: async (url) => store(name).get(url)?.clone(),
        put: async (url, response) => void store(name).set(url, response),
      }),
      keys: async () => [...stores.keys()],
      delete: async (name) => stores.delete(name),
    },
    clients: { claim },
    fetch,
    skipWaiting,
    addEventListener,
  };
  installOfflineWorker(scope, workerConfig.parse({ version: 'v2', ...config }));
  const runLifecycle = (type: string) => {
    let work: Promise<unknown> = Promise.resolve();
    lifecycle.get(type)?.({ waitUntil: (promise) => (work = promise) });
    return work;
  };
  return {
    stores,
    fetch,
    skipWaiting,
    claim,
    install: () => runLifecycle('install'),
    activate: () => runLifecycle('activate'),
    message: (data) => onMessage({ data }),
    request: (request) => {
      let response: Promise<Response> | undefined;
      onFetch({ request, respondWith: (promise) => (response = promise) });
      return response;
    },
    seed: (cacheName, url, body) => void store(cacheName).set(url, new Response(body)),
  };
};

const shellConfig = {
  precache: [
    { url: 'index.html', revision: 'a' },
    { url: 'assets/main-1f.js', revision: 'b' },
  ],
  navigationFallback: 'index.html',
};

const shellRoutes = { [SHELL]: { body: '<html>shell</html>' }, [SCRIPT]: { body: 'main()' } };

const hangingFetch = (): Harness['fetch'] =>
  Object.assign(
    (_input: string | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
    { calls: [] },
  );

describe('installOfflineWorker', () => {
  it('precaches the shell next to the worker script into a cache named after the version', async () => {
    const worker = createHarness(shellConfig, shellRoutes);

    await worker.install();

    expect([...(worker.stores.get(names.shell('v2'))?.keys() ?? [])]).toEqual([SHELL, SCRIPT]);
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it('fails the installation when a shell file is missing', async () => {
    const worker = createHarness(shellConfig, { [SHELL]: { body: '<html>' }, [SCRIPT]: { status: 404 } });

    await expect(worker.install()).rejects.toEqual(new AssetFetchError(SCRIPT, 404));
  });

  it('deletes outdated caches of its own scope only, then takes over open pages', async () => {
    const worker = createHarness(shellConfig, shellRoutes);
    const foreign = offlineCacheNames('https://stage.test/app/');
    await worker.install();
    for (const name of [
      names.shell('v1'),
      names.assets,
      names.registry,
      foreign.shell('v1'),
      foreign.assets,
      'api-cache-v1',
    ]) {
      worker.seed(name, SHELL, 'x');
    }

    await worker.activate();

    expect([...worker.stores.keys()].sort()).toEqual(
      [names.shell('v2'), names.assets, names.registry, foreign.shell('v1'), foreign.assets, 'api-cache-v1'].sort(),
    );
    expect(worker.claim).toHaveBeenCalledTimes(1);
  });

  it('activates a waiting version only when told to', () => {
    const worker = createHarness(shellConfig, shellRoutes);

    worker.message({ type: 'CACHE_PROJECT' });
    worker.message(null);
    expect(worker.skipWaiting).not.toHaveBeenCalled();

    worker.message(SKIP_WAITING_MESSAGE);
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('answers navigations inside its scope from the network, and from the shell without network', async () => {
    const page = `${SCOPE}?project=tray`;
    const online = createHarness(shellConfig, { ...shellRoutes, [page]: { body: '<html>fresh</html>' } });
    await online.install();
    expect(await (await online.request(navigation(page)))?.text()).toBe('<html>fresh</html>');

    const offline = createHarness(shellConfig, shellRoutes);
    await offline.install();
    expect(await (await offline.request(navigation(page)))?.text()).toBe('<html>shell</html>');
  });

  it('never answers navigations of other apps on the origin', async () => {
    const worker = createHarness({ ...shellConfig, denylist: ['^/app/viewer/admin/'] }, shellRoutes);
    await worker.install();

    expect(worker.request(navigation('https://stage.test/app/'))).toBeUndefined();
    expect(worker.request(navigation('https://stage.test/app/viewer-legacy/'))).toBeUndefined();
    expect(worker.request(navigation('https://other.test/app/viewer/'))).toBeUndefined();
    expect(worker.request(navigation(`${SCOPE}admin/users`))).toBeUndefined();
    expect(worker.request(createRequest(`${SCOPE}admin/data.json`))).toBeUndefined();
    expect(worker.fetch.calls.map(({ url }) => url)).toEqual([SHELL, SCRIPT]);
  });

  it('leaves navigations alone when the host configured no fallback page', () => {
    const worker = createHarness({}, {});

    expect(worker.request(navigation(SCOPE))).toBeUndefined();
  });

  it('serves saved project assets and the shell from cache, everything else from the network', async () => {
    const texture = 'https://stage.test/static/wood.jpg';
    const worker = createHarness(shellConfig, { ...shellRoutes, [texture]: { body: 'network-texture' } });
    await worker.install();
    worker.seed(names.assets, MODEL, 'saved-model');
    const precacheRequests = worker.fetch.calls.length;

    expect(await (await worker.request(createRequest(MODEL)))?.text()).toBe('saved-model');
    expect(await (await worker.request(createRequest(SCRIPT)))?.text()).toBe('main()');
    expect(worker.fetch.calls.length).toBe(precacheRequests);

    expect(await (await worker.request(createRequest(texture)))?.text()).toBe('network-texture');
    await expect(worker.request(createRequest('https://stage.test/static/missing.jpg'))).rejects.toBeInstanceOf(
      TypeError,
    );
  });

  it('asks the network first for the project record and falls back to the saved copy', async () => {
    const config = { networkFirst: ['/api/projects/'] };

    const online = createHarness(config, { [RECORD]: { body: 'fresh-record' } });
    online.seed(names.assets, RECORD, 'saved-record');
    expect(await (await online.request(createRequest(RECORD)))?.text()).toBe('fresh-record');

    const offline = createHarness(config, {});
    offline.seed(names.assets, RECORD, 'saved-record');
    expect(await (await offline.request(createRequest(RECORD)))?.text()).toBe('saved-record');

    const failing = createHarness(config, { [RECORD]: { status: 503, body: 'down' } });
    failing.seed(names.assets, RECORD, 'saved-record');
    expect(await (await failing.request(createRequest(RECORD)))?.text()).toBe('saved-record');

    const unsaved = createHarness(config, {});
    await expect(unsaved.request(createRequest(RECORD))).rejects.toBeInstanceOf(OfflineError);
  });

  it('answers from the saved copy when the network takes too long', async () => {
    const worker = createHarness({ networkFirst: ['/api/projects/'], networkTimeoutMs: 5 }, {}, hangingFetch());
    worker.seed(names.assets, RECORD, 'saved-record');

    expect(await (await worker.request(createRequest(RECORD)))?.text()).toBe('saved-record');
  });

  it('ignores writes, range requests and requests that opt out of caching', () => {
    const worker = createHarness(shellConfig, shellRoutes);
    worker.seed(names.assets, MODEL, 'saved-model');

    expect(worker.request(createRequest(MODEL, { method: 'HEAD' }))).toBeUndefined();
    expect(worker.request(createRequest(MODEL, { method: 'POST' }))).toBeUndefined();
    expect(worker.request(createRequest(MODEL, { cache: 'no-store' }))).toBeUndefined();
    expect(worker.request(createRequest(MODEL, { cache: 'reload' }))).toBeUndefined();
    expect(worker.request(createRequest(MODEL, {}, true))).toBeUndefined();
    expect(worker.request(createRequest('chrome-extension://abc/script.js'))).toBeUndefined();
  });
});
