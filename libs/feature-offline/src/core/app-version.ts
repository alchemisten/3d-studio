import { z } from 'zod';
import type { ConnectivityTarget } from './connectivity';
import { toError, VersionCheckError } from './errors';
import { type FetchLike, withTimeout } from './with-timeout';

export const DEFAULT_VERSION_TIMEOUT_MS = 3_000;

const versionFile = z.object({ version: z.string().min(1) });

export interface FetchRemoteVersionOptions {
  /** Absolute URL of the deployed `version.json`. */
  url: string;
  fetch: FetchLike;
  timeoutMs?: number;
}

/** Reads the version of the currently deployed app, bypassing every HTTP cache. */
export const fetchRemoteVersion = ({
  url,
  fetch,
  timeoutMs = DEFAULT_VERSION_TIMEOUT_MS,
}: FetchRemoteVersionOptions): Promise<string> =>
  withTimeout({ url, timeoutMs }, async (signal) => {
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) throw new VersionCheckError(url, `HTTP ${response.status}`);
    try {
      return versionFile.parse(await response.json()).version;
    } catch (error) {
      throw new VersionCheckError(url, 'the file is not a version record', { cause: error });
    }
  });

/** Remembers the version a reload was last triggered for, so a deployment that cannot be reached never loops. */
export interface ReloadGuard {
  hasReloadedFor: (version: string) => boolean;
  markReloadedFor: (version: string) => void;
}

export const createReloadGuard = (storage: Pick<Storage, 'getItem' | 'setItem'>, key: string): ReloadGuard => ({
  hasReloadedFor: (version) => storage.getItem(key) === version,
  markReloadedFor: (version) => storage.setItem(key, version),
});

export type VersionCheckResult = 'current' | 'reloading' | 'reload-suppressed';

export interface CheckAppVersionOptions extends FetchRemoteVersionOptions {
  /** Version compiled into the running app. */
  current: string;
  guard: ReloadGuard;
  /** Activates the new version, usually `reloadForNewVersion`. */
  reload: () => Promise<void>;
}

/** Reloads into a newer deployment, at most once per remote version. */
export const checkAppVersion = async ({
  current,
  guard,
  reload,
  ...remote
}: CheckAppVersionOptions): Promise<VersionCheckResult> => {
  const version = await fetchRemoteVersion(remote);
  if (version === current) return 'current';
  if (guard.hasReloadedFor(version)) return 'reload-suppressed';
  guard.markReloadedFor(version);
  await reload();
  return 'reloading';
};

export interface VisibilityTarget {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface WatchAppVersionOptions {
  check: () => Promise<unknown>;
  /** Receives every failed check; being offline is the common case. */
  onError: (error: Error) => void;
  window: ConnectivityTarget;
  document: VisibilityTarget;
}

/** Checks now, whenever the page becomes visible and whenever the device comes back online. Returns the stop function. */
export const watchAppVersion = ({ check, onError, window, document }: WatchAppVersionOptions): (() => void) => {
  const run = () => {
    check().catch((error: unknown) => onError(toError(error)));
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') run();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', run);
  run();
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', run);
  };
};
