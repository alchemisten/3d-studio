import { describe, expect, it, vi } from 'vitest';
import { checkAppVersion, createReloadGuard, fetchRemoteVersion, watchAppVersion } from './app-version';
import { watchConnectivity } from './connectivity';
import { VersionCheckError } from './errors';
import { createFakeFetch } from './testing';

const URL = 'https://stage.test/app/viewer/version.json';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

describe('fetchRemoteVersion', () => {
  it('reads the version without HTTP cache', async () => {
    const fetch = createFakeFetch({ [URL]: { body: '{"version":"1.4.0"}' } });

    expect(await fetchRemoteVersion({ url: URL, fetch })).toBe('1.4.0');
    expect(fetch.calls[0].init?.cache).toBe('no-store');
  });

  it('fails loud on HTTP errors and malformed files', async () => {
    await expect(fetchRemoteVersion({ url: URL, fetch: createFakeFetch({ [URL]: { status: 404 } }) })).rejects.toThrow(
      /HTTP 404/,
    );
    await expect(
      fetchRemoteVersion({ url: URL, fetch: createFakeFetch({ [URL]: { body: '{"version":""}' } }) }),
    ).rejects.toBeInstanceOf(VersionCheckError);
    await expect(
      fetchRemoteVersion({ url: URL, fetch: createFakeFetch({ [URL]: { body: '<html>' } }) }),
    ).rejects.toBeInstanceOf(VersionCheckError);
  });
});

describe('checkAppVersion', () => {
  const remote = (version: string) => createFakeFetch({ [URL]: { body: JSON.stringify({ version }) } });

  it('does nothing while the deployed version is the running one', async () => {
    const reload = vi.fn(async () => undefined);
    const guard = createReloadGuard(createStorage(), 'reloaded');

    expect(await checkAppVersion({ url: URL, fetch: remote('1.4.0'), current: '1.4.0', guard, reload })).toBe(
      'current',
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once per remote version, then again for the next one', async () => {
    const reload = vi.fn(async () => undefined);
    const guard = createReloadGuard(createStorage(), 'reloaded');
    const check = (version: string) =>
      checkAppVersion({ url: URL, fetch: remote(version), current: '1.4.0', guard, reload });

    expect(await check('1.5.0')).toBe('reloading');
    expect(await check('1.5.0')).toBe('reload-suppressed');
    expect(await check('1.6.0')).toBe('reloading');
    expect(reload).toHaveBeenCalledTimes(2);
  });
});

describe('watchAppVersion', () => {
  it('checks on start, on becoming visible and on reconnect, and reports failures', async () => {
    const page = new EventTarget();
    const visibility = Object.assign(new EventTarget(), { visibilityState: 'hidden' });
    const failure = new Error('offline');
    const check = vi.fn().mockResolvedValueOnce('current').mockRejectedValueOnce(failure).mockResolvedValue('current');
    const onError = vi.fn();

    const stop = watchAppVersion({ check, onError, window: page, document: visibility });
    expect(check).toHaveBeenCalledTimes(1);

    visibility.dispatchEvent(new Event('visibilitychange'));
    expect(check).toHaveBeenCalledTimes(1);

    visibility.visibilityState = 'visible';
    visibility.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(failure);

    page.dispatchEvent(new Event('online'));
    expect(check).toHaveBeenCalledTimes(3);

    stop();
    page.dispatchEvent(new Event('online'));
    visibility.dispatchEvent(new Event('visibilitychange'));
    expect(check).toHaveBeenCalledTimes(3);
  });
});

describe('watchConnectivity', () => {
  it('reports the current state on every change until stopped', () => {
    const page = new EventTarget();
    let isOnline = true;
    const connectivity = watchConnectivity(page, () => isOnline);
    const seen: boolean[] = [];

    const stop = connectivity.subscribe((next) => seen.push(next));
    isOnline = false;
    page.dispatchEvent(new Event('offline'));
    isOnline = true;
    page.dispatchEvent(new Event('online'));
    stop();
    page.dispatchEvent(new Event('offline'));

    expect(seen).toEqual([false, true]);
    expect(connectivity.isOnline()).toBe(true);
  });
});
