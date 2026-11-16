import { describe, expect, it } from 'vitest';
import { createMemoryCache } from './asset-cache';
import { AssetFetchError, AssetIntegrityError, RegistryCorruptError, RequestTimeoutError } from './errors';
import { createCacheRegistry } from './project-registry';
import { removeProject, type SaveProgress, saveProject } from './save-project';
import { createFakeFetch, createGlb } from './testing';

const MODEL = 'https://stage.test/projects/tray/model-a1.glb';
const RECORD = 'https://stage.test/api/projects/tray';
const ENVIRONMENT = 'https://stage.test/static/studio.hdr';
const NOW = '2026-11-15T10:00:00.000Z';

const createStores = () => {
  const cache = createMemoryCache();
  const registry = createCacheRegistry(createMemoryCache(), 'https://stage.test/app/viewer/');
  return { cache, registry };
};

const healthyRoutes = {
  [MODEL]: { body: createGlb(), headers: { etag: '"model-1"' } },
  [RECORD]: { body: '{"slug":"tray"}', headers: { 'last-modified': 'Sat, 14 Nov 2026 08:00:00 GMT' } },
  [ENVIRONMENT]: { body: 'hdr' },
};

describe('saveProject', () => {
  it('stores every asset once, reports progress and records validators', async () => {
    const stores = createStores();
    const fetch = createFakeFetch(healthyRoutes);
    const progress: SaveProgress[] = [];

    const project = await saveProject({
      ...stores,
      projectId: 'tray',
      assets: [MODEL, RECORD, ENVIRONMENT, MODEL],
      fetch,
      now: () => NOW,
      onProgress: (step) => progress.push(step),
    });

    expect(project).toEqual({
      projectId: 'tray',
      savedAt: NOW,
      assets: [
        { url: MODEL, validator: '"model-1"', bytes: 20 },
        { url: RECORD, validator: 'Sat, 14 Nov 2026 08:00:00 GMT', bytes: 15 },
        { url: ENVIRONMENT, validator: null, bytes: 3 },
      ],
    });
    expect(progress.map(({ done, total }) => `${done}/${total}`)).toEqual(['1/3', '2/3', '3/3']);
    expect(await stores.registry.get('tray')).toEqual(project);
    expect(await (await stores.cache.match(RECORD))?.text()).toBe('{"slug":"tray"}');
    expect((await stores.cache.match(MODEL))?.headers.get('content-length')).toBe('20');
    expect(fetch.calls.every(({ init }) => init?.cache === 'no-store' && init.signal instanceof AbortSignal)).toBe(
      true,
    );
  });

  it('rejects a truncated GLB and leaves nothing behind', async () => {
    const stores = createStores();
    const fetch = createFakeFetch({ ...healthyRoutes, [MODEL]: { body: createGlb(20, 4096) } });

    await expect(
      saveProject({ ...stores, projectId: 'tray', assets: [RECORD, MODEL], fetch, now: () => NOW }),
    ).rejects.toBeInstanceOf(AssetIntegrityError);

    expect(await stores.registry.get('tray')).toBeUndefined();
    expect(await stores.cache.keys()).toEqual([]);
  });

  it('rejects a body shorter than its announced length and files that are not GLB', async () => {
    const save = (route: { body: BodyInit; headers?: Record<string, string> }) =>
      saveProject({
        ...createStores(),
        projectId: 'tray',
        assets: [MODEL],
        fetch: createFakeFetch({ [MODEL]: route }),
        now: () => NOW,
      });

    await expect(save({ body: createGlb(), headers: { 'content-length': '64' } })).rejects.toThrow(/64 bytes/);
    await expect(save({ body: '<html>not found</html>' })).rejects.toThrow(/glTF magic/);
    await expect(save({ body: '' })).rejects.toThrow(/empty/);
  });

  it('fails loud on HTTP errors and keeps the previously saved copy', async () => {
    const stores = createStores();
    await saveProject({
      ...stores,
      projectId: 'tray',
      assets: [MODEL, RECORD],
      fetch: createFakeFetch(healthyRoutes),
      now: () => NOW,
    });

    const failure = saveProject({
      ...stores,
      projectId: 'tray',
      assets: [ENVIRONMENT, MODEL, RECORD],
      fetch: createFakeFetch({ ...healthyRoutes, [RECORD]: { status: 503 } }),
      now: () => NOW,
    });

    await expect(failure).rejects.toEqual(new AssetFetchError(RECORD, 503));
    expect((await stores.registry.get('tray'))?.assets.map((asset) => asset.url)).toEqual([MODEL, RECORD]);
    expect((await stores.cache.keys()).map((key) => key.url).sort()).toEqual([RECORD, MODEL].sort());
  });

  it('drops assets the new version of a project no longer uses', async () => {
    const stores = createStores();
    const fetch = createFakeFetch(healthyRoutes);
    await saveProject({ ...stores, projectId: 'tray', assets: [MODEL, ENVIRONMENT], fetch, now: () => NOW });

    await saveProject({ ...stores, projectId: 'tray', assets: [MODEL, RECORD], fetch, now: () => NOW });

    expect((await stores.cache.keys()).map((key) => key.url).sort()).toEqual([RECORD, MODEL].sort());
  });

  it('times out a download that never finishes', async () => {
    const hanging = (_input: string | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });

    await expect(
      saveProject({
        ...createStores(),
        projectId: 'tray',
        assets: [MODEL],
        fetch: hanging,
        now: () => NOW,
        timeoutMs: 5,
      }),
    ).rejects.toEqual(new RequestTimeoutError(MODEL, 5));
  });

  it('stops when the caller aborts', async () => {
    const abort = new AbortController();
    abort.abort(new Error('user left'));

    const waiting = (_input: string | Request, init?: RequestInit) =>
      init?.signal?.aborted ? Promise.reject(init.signal.reason) : Promise.resolve(new Response('late'));

    await expect(
      saveProject({
        ...createStores(),
        projectId: 'tray',
        assets: [RECORD],
        fetch: waiting,
        now: () => NOW,
        signal: abort.signal,
      }),
    ).rejects.toThrow('user left');
  });
});

describe('removeProject', () => {
  it('deletes the assets of a project but keeps those another project shares', async () => {
    const stores = createStores();
    const fetch = createFakeFetch(healthyRoutes);
    await saveProject({ ...stores, projectId: 'tray', assets: [MODEL, ENVIRONMENT], fetch, now: () => NOW });
    await saveProject({ ...stores, projectId: 'crate', assets: [RECORD, ENVIRONMENT], fetch, now: () => NOW });

    await removeProject(stores, 'tray');

    expect(await stores.registry.get('tray')).toBeUndefined();
    expect((await stores.registry.list()).map((project) => project.projectId)).toEqual(['crate']);
    expect((await stores.cache.keys()).map((key) => key.url).sort()).toEqual([RECORD, ENVIRONMENT].sort());
  });

  it('does nothing for a project that was never saved', async () => {
    await expect(removeProject(createStores(), 'unknown')).resolves.toBeUndefined();
  });
});

describe('createCacheRegistry', () => {
  it('refuses a record that does not match the schema', async () => {
    const cache = createMemoryCache();
    const registry = createCacheRegistry(cache, 'https://stage.test/app/viewer/');
    await cache.put(
      'https://stage.test/app/viewer/__offline-projects__/tray',
      new Response(JSON.stringify({ projectId: 'tray', assets: 'none' })),
    );

    await expect(registry.get('tray')).rejects.toBeInstanceOf(RegistryCorruptError);
  });

  it('keeps project ids with reserved characters apart', async () => {
    const registry = createCacheRegistry(createMemoryCache(), 'https://stage.test/app/viewer/');
    await registry.put({ projectId: 'a/b?c', savedAt: NOW, assets: [] });
    await registry.put({ projectId: 'a', savedAt: NOW, assets: [] });

    expect((await registry.list()).map((project) => project.projectId).sort()).toEqual(['a', 'a/b?c']);
    await registry.remove('a/b?c');
    expect((await registry.list()).map((project) => project.projectId)).toEqual(['a']);
  });
});
