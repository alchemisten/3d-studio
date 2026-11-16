import type { AssetCache } from './asset-cache';
import { AssetFetchError } from './errors';
import type { OfflineProjectRegistry, SavedAsset, SavedProject } from './project-registry';
import { assertAssetIntegrity, responseValidator } from './validate-asset';
import { type FetchLike, withTimeout } from './with-timeout';

export const DEFAULT_ASSET_TIMEOUT_MS = 120_000;

export interface SaveProgress {
  done: number;
  total: number;
  /** The asset that was just stored. */
  url: string;
}

export interface OfflineStores {
  cache: AssetCache;
  registry: OfflineProjectRegistry;
}

export interface SaveProjectOptions extends OfflineStores {
  projectId: string;
  /** Absolute URLs of everything the project needs offline. */
  assets: readonly string[];
  fetch: FetchLike;
  /** Current time as UTC ISO 8601. */
  now: () => string;
  onProgress?: (progress: SaveProgress) => void;
  signal?: AbortSignal;
  /** Deadline per asset, covering the whole download. */
  timeoutMs?: number;
}

const downloadAsset = (
  url: string,
  { fetch, signal, timeoutMs = DEFAULT_ASSET_TIMEOUT_MS }: Pick<SaveProjectOptions, 'fetch' | 'signal' | 'timeoutMs'>,
): Promise<{ asset: SavedAsset; response: Response }> =>
  withTimeout({ url, timeoutMs, signal }, async (timeoutSignal) => {
    const response = await fetch(url, { cache: 'no-store', signal: timeoutSignal });
    if (!response.ok) throw new AssetFetchError(url, response.status);
    const bytes = await response.arrayBuffer();
    assertAssetIntegrity(url, response.headers, bytes);
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.set('content-length', String(bytes.byteLength));
    return {
      asset: { url, validator: responseValidator(response.headers), bytes: bytes.byteLength },
      response: new Response(bytes, { status: response.status, statusText: response.statusText, headers }),
    };
  });

const urlsOfOtherProjects = async (registry: OfflineProjectRegistry, projectId: string): Promise<Set<string>> =>
  new Set(
    (await registry.list())
      .filter((project) => project.projectId !== projectId)
      .flatMap((project) => project.assets.map((asset) => asset.url)),
  );

const deleteUnshared = async (
  { cache, registry }: OfflineStores,
  projectId: string,
  urls: readonly string[],
): Promise<void> => {
  const shared = await urlsOfOtherProjects(registry, projectId);
  await Promise.all(urls.filter((url) => !shared.has(url)).map((url) => cache.delete(url)));
};

/**
 * Downloads, checks and stores every asset, then records the project as saved.
 * A failure removes what this run stored and leaves the project unsaved, so a half-saved project never looks complete.
 */
export const saveProject = async (options: SaveProjectOptions): Promise<SavedProject> => {
  const { projectId, cache, registry, now, onProgress } = options;
  const urls = [...new Set(options.assets)];
  const stored: SavedAsset[] = [];
  try {
    for (const url of urls) {
      const { asset, response } = await downloadAsset(url, options);
      await cache.put(url, response);
      stored.push(asset);
      onProgress?.({ done: stored.length, total: urls.length, url });
    }
    const previous = await registry.get(projectId);
    const project: SavedProject = { projectId, savedAt: now(), assets: stored };
    await registry.put(project);
    const obsolete = (previous?.assets ?? []).map((asset) => asset.url).filter((url) => !urls.includes(url));
    await deleteUnshared(options, projectId, obsolete);
    return project;
  } catch (error) {
    const kept = new Set(((await registry.get(projectId))?.assets ?? []).map((asset) => asset.url));
    await deleteUnshared(
      options,
      projectId,
      stored.map((asset) => asset.url).filter((url) => !kept.has(url)),
    );
    throw error;
  }
};

/** Forgets a saved project and deletes its assets, except those another saved project still needs. */
export const removeProject = async (stores: OfflineStores, projectId: string): Promise<void> => {
  const project = await stores.registry.get(projectId);
  if (!project) return;
  await stores.registry.remove(projectId);
  await deleteUnshared(
    stores,
    projectId,
    project.assets.map((asset) => asset.url),
  );
};
