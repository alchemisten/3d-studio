import { toError } from './errors';
import type { OfflineProjectRegistry, SavedAsset } from './project-registry';
import { responseValidator } from './validate-asset';
import { type FetchLike, withTimeout } from './with-timeout';

export const DEFAULT_REVALIDATE_TIMEOUT_MS = 5_000;

export type RevalidationResult =
  | { status: 'not-saved' }
  | { status: 'fresh' }
  /** `changed` lists the URLs that differ from the saved copy, were added, or are gone. */
  | { status: 'stale'; changed: string[] }
  /** The server could not be asked, so the saved copy stays as it is. */
  | { status: 'unreachable'; cause: Error };

export interface RevalidateProjectOptions {
  projectId: string;
  /** Absolute URLs the project needs now; a differing set makes the saved copy stale. */
  assets: readonly string[];
  registry: OfflineProjectRegistry;
  fetch: FetchLike;
  timeoutMs?: number;
}

type AssetCheck = 'same' | 'changed';

const checkAsset = (asset: SavedAsset, fetch: FetchLike, timeoutMs: number): Promise<AssetCheck> =>
  withTimeout({ url: asset.url, timeoutMs }, async (signal) => {
    const response = await fetch(asset.url, { method: 'HEAD', cache: 'no-store', signal });
    if (response.status >= 500) throw new Error(`HTTP ${response.status} for ${asset.url}`);
    if (!response.ok) return 'changed';
    const current = responseValidator(response.headers);
    return current !== null && current !== asset.validator ? 'changed' : 'same';
  });

/**
 * Compares a saved project with the server: a different asset list, or a different ETag / Last-Modified
 * of any saved asset, makes it stale. Assets saved without a validator cannot be compared and count as unchanged.
 */
export const revalidateProject = async ({
  projectId,
  assets,
  registry,
  fetch,
  timeoutMs = DEFAULT_REVALIDATE_TIMEOUT_MS,
}: RevalidateProjectOptions): Promise<RevalidationResult> => {
  const project = await registry.get(projectId);
  if (!project) return { status: 'not-saved' };
  const saved = new Set(project.assets.map((asset) => asset.url));
  const wanted = new Set(assets);
  const listChanges = [...wanted].filter((url) => !saved.has(url)).concat([...saved].filter((url) => !wanted.has(url)));
  if (listChanges.length > 0) return { status: 'stale', changed: listChanges };
  const comparable = project.assets.filter((asset) => asset.validator !== null);
  const checks = await Promise.allSettled(comparable.map((asset) => checkAsset(asset, fetch, timeoutMs)));
  const failure = checks.find((check) => check.status === 'rejected');
  if (failure) return { status: 'unreachable', cause: toError(failure.reason) };
  const changed = comparable
    .filter((_, index) => {
      const check = checks[index];
      return check.status === 'fulfilled' && check.value === 'changed';
    })
    .map((asset) => asset.url);
  return changed.length > 0 ? { status: 'stale', changed } : { status: 'fresh' };
};
