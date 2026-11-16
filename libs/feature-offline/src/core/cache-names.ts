export interface OfflineCacheNames {
  /** Common prefix of every cache owned by the worker of this scope. */
  prefix: string;
  /** Saved project assets, written by the page and served by the worker. */
  assets: string;
  /** Records of which projects are saved. */
  registry: string;
  /** Precached app shell of one worker version. */
  shell: (version: string) => string;
}

/**
 * Cache storage is shared by the whole origin, so every name carries the worker scope:
 * two workers under one origin never read or clean up each other's caches.
 */
export const offlineCacheNames = (scope: string): OfflineCacheNames => {
  const prefix = `3d-studio-offline|${new URL(scope).pathname}|`;
  return {
    prefix,
    assets: `${prefix}assets|v1`,
    registry: `${prefix}registry|v1`,
    shell: (version) => `${prefix}shell|${version}`,
  };
};
