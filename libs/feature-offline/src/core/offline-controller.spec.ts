import { describe, expect, it, vi } from 'vitest';
import { createMemoryCache } from './asset-cache';
import type { Connectivity } from './connectivity';
import { OfflineUnsupportedError } from './errors';
import {
  createOfflineController,
  type OfflineController,
  type OfflineEnvironment,
  type OfflineState,
} from './offline-controller';
import { createCacheRegistry } from './project-registry';
import { createFakeFetch, createGlb, type FakeResponse } from './testing';

const MODEL = 'https://stage.test/projects/tray/model-a1.glb';
const RECORD = 'https://stage.test/api/projects/tray';
const NOW = '2026-11-15T10:00:00.000Z';

const createConnectivity = (initiallyOnline = true) => {
  let isOnline = initiallyOnline;
  const listeners = new Set<(isOnline: boolean) => void>();
  const connectivity: Connectivity = {
    isOnline: () => isOnline,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    connectivity,
    listeners,
    set: (next: boolean) => {
      isOnline = next;
      listeners.forEach((listener) => listener(next));
    },
  };
};

const createHarness = (routes: Record<string, FakeResponse>, initiallyOnline = true) => {
  const network = createConnectivity(initiallyOnline);
  const fetch = createFakeFetch(routes);
  const environment: OfflineEnvironment = {
    cache: createMemoryCache(),
    registry: createCacheRegistry(createMemoryCache(), 'https://stage.test/app/viewer/'),
    fetch,
  };
  const controller = createOfflineController({
    projectId: 'tray',
    assets: [MODEL, RECORD],
    resolveEnvironment: async () => environment,
    connectivity: network.connectivity,
    now: () => NOW,
  });
  const states: OfflineState[] = [];
  controller.subscribe(() => states.push(controller.getState()));
  return { controller, environment, network, routes, states, fetch };
};

const expectState = (controller: OfflineController, state: OfflineState) =>
  vi.waitFor(() => expect(controller.getState()).toEqual(state));

describe('createOfflineController', () => {
  it('goes idle → saving with progress → saved, then back to idle on remove', async () => {
    const { controller, states, environment } = createHarness({
      [MODEL]: { body: createGlb(), headers: { etag: '"1"' } },
      [RECORD]: { body: '{}', headers: { etag: '"r1"' } },
    });
    expect(controller.getState()).toEqual({ status: 'idle' });

    await controller.save();

    expect(states).toEqual([
      { status: 'saving', done: 0, total: 2 },
      { status: 'saving', done: 1, total: 2 },
      { status: 'saving', done: 2, total: 2 },
      { status: 'saved', savedAt: NOW },
    ]);

    await controller.remove();

    expect(controller.getState()).toEqual({ status: 'idle' });
    expect(await environment.cache.keys()).toEqual([]);
  });

  it('ends in the error state when saving fails, and recovers on retry', async () => {
    const { controller, routes } = createHarness({ [MODEL]: { body: 'broken' }, [RECORD]: { body: '{}' } });

    await controller.save();

    const failed = controller.getState();
    expect(failed.status).toBe('error');
    expect(failed.status === 'error' && failed.error.message).toMatch(/GLB header is incomplete/);

    routes[MODEL] = { body: createGlb() };
    await controller.save();

    expect(controller.getState()).toEqual({ status: 'saved', savedAt: NOW });
  });

  it('finds a saved copy on start and marks it stale once the server differs', async () => {
    const { controller, routes, network } = createHarness({
      [MODEL]: { body: createGlb(), headers: { etag: '"1"' } },
      [RECORD]: { body: '{}', headers: { etag: '"r1"' } },
    });
    await controller.save();

    const stop = controller.start();
    await expectState(controller, { status: 'saved', savedAt: NOW });

    routes[RECORD] = { body: '{}', headers: { etag: '"r2"' } };
    network.set(false);
    network.set(true);
    await expectState(controller, { status: 'stale', savedAt: NOW });

    await controller.save();
    expect(controller.getState()).toEqual({ status: 'saved', savedAt: NOW });

    stop();
    expect(network.listeners.size).toBe(0);
  });

  it('trusts the saved copy while offline without asking the server', async () => {
    const { controller, fetch, network, states } = createHarness({
      [MODEL]: { body: createGlb(), headers: { etag: '"1"' } },
      [RECORD]: { body: '{}' },
    });
    await controller.save();
    const requests = fetch.calls.length;
    network.set(false);

    controller.start();
    await controller.remove();

    expect(states.slice(-2)).toEqual([{ status: 'saved', savedAt: NOW }, { status: 'idle' }]);
    expect(fetch.calls.length).toBe(requests);
  });

  it('is unavailable where offline use is impossible', async () => {
    const controller = createOfflineController({
      projectId: 'tray',
      assets: [MODEL],
      resolveEnvironment: () => Promise.reject(new OfflineUnsupportedError('no worker')),
      connectivity: createConnectivity().connectivity,
      now: () => NOW,
    });

    controller.start();
    await expectState(controller, { status: 'unavailable' });

    await controller.save();
    expect(controller.getState()).toEqual({ status: 'unavailable' });
  });

  it('runs overlapping actions one after another', async () => {
    const { controller, environment } = createHarness({
      [MODEL]: { body: createGlb() },
      [RECORD]: { body: '{}' },
    });

    await Promise.all([controller.save(), controller.remove()]);

    expect(controller.getState()).toEqual({ status: 'idle' });
    expect(await environment.registry.list()).toEqual([]);
  });
});
