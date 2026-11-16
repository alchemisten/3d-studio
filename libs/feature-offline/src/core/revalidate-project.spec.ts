import { describe, expect, it } from 'vitest';
import { createMemoryCache } from './asset-cache';
import { createCacheRegistry } from './project-registry';
import { revalidateProject } from './revalidate-project';
import { createFakeFetch } from './testing';

const MODEL = 'https://stage.test/projects/tray/model-a1.glb';
const RECORD = 'https://stage.test/api/projects/tray';
const ENVIRONMENT = 'https://stage.test/static/studio.hdr';

const savedRegistry = async () => {
  const registry = createCacheRegistry(createMemoryCache(), 'https://stage.test/app/viewer/');
  await registry.put({
    projectId: 'tray',
    savedAt: '2026-11-15T10:00:00.000Z',
    assets: [
      { url: MODEL, validator: '"model-1"', bytes: 20 },
      { url: RECORD, validator: 'Sat, 14 Nov 2026 08:00:00 GMT', bytes: 15 },
      { url: ENVIRONMENT, validator: null, bytes: 3 },
    ],
  });
  return registry;
};

const ASSETS = [MODEL, RECORD, ENVIRONMENT];

describe('revalidateProject', () => {
  it('reports a project that is not saved', async () => {
    const registry = createCacheRegistry(createMemoryCache(), 'https://stage.test/app/viewer/');

    expect(
      await revalidateProject({ projectId: 'tray', assets: ASSETS, registry, fetch: createFakeFetch({}) }),
    ).toEqual({
      status: 'not-saved',
    });
  });

  it('is fresh while ETag and Last-Modified match, asking with HEAD and without HTTP cache', async () => {
    const fetch = createFakeFetch({
      [MODEL]: { headers: { etag: '"model-1"' } },
      [RECORD]: { headers: { 'last-modified': 'Sat, 14 Nov 2026 08:00:00 GMT' } },
    });

    const result = await revalidateProject({
      projectId: 'tray',
      assets: ASSETS,
      registry: await savedRegistry(),
      fetch,
    });

    expect(result).toEqual({ status: 'fresh' });
    expect(fetch.calls.map(({ url }) => url)).toEqual([MODEL, RECORD]);
    expect(fetch.calls.every(({ init }) => init?.method === 'HEAD' && init.cache === 'no-store')).toBe(true);
  });

  it('is stale when a validator differs or a saved asset is gone', async () => {
    const registry = await savedRegistry();

    const changedEtag = createFakeFetch({
      [MODEL]: { headers: { etag: '"model-2"' } },
      [RECORD]: { headers: { 'last-modified': 'Sat, 14 Nov 2026 08:00:00 GMT' } },
    });
    expect(await revalidateProject({ projectId: 'tray', assets: ASSETS, registry, fetch: changedEtag })).toEqual({
      status: 'stale',
      changed: [MODEL],
    });

    const gone = createFakeFetch({ [MODEL]: { headers: { etag: '"model-1"' } }, [RECORD]: { status: 404 } });
    expect(await revalidateProject({ projectId: 'tray', assets: ASSETS, registry, fetch: gone })).toEqual({
      status: 'stale',
      changed: [RECORD],
    });
  });

  it('is stale without asking the server when the asset list changed', async () => {
    const fetch = createFakeFetch({});
    const next = 'https://stage.test/projects/tray/model-b2.glb';

    const result = await revalidateProject({
      projectId: 'tray',
      assets: [next, RECORD, ENVIRONMENT],
      registry: await savedRegistry(),
      fetch,
    });

    expect(result).toEqual({ status: 'stale', changed: [next, MODEL] });
    expect(fetch.calls).toEqual([]);
  });

  it('keeps the copy when the server stops sending validators', async () => {
    const fetch = createFakeFetch({ [MODEL]: {}, [RECORD]: {} });

    expect(
      await revalidateProject({ projectId: 'tray', assets: ASSETS, registry: await savedRegistry(), fetch }),
    ).toEqual({ status: 'fresh' });
  });

  it('reports an unreachable server instead of guessing', async () => {
    const registry = await savedRegistry();

    const offline = await revalidateProject({
      projectId: 'tray',
      assets: ASSETS,
      registry,
      fetch: createFakeFetch({}),
    });
    expect(offline).toMatchObject({ status: 'unreachable', cause: expect.any(TypeError) });

    const broken = createFakeFetch({ [MODEL]: { status: 502 }, [RECORD]: { status: 502 } });
    expect(await revalidateProject({ projectId: 'tray', assets: ASSETS, registry, fetch: broken })).toMatchObject({
      status: 'unreachable',
    });
  });
});
