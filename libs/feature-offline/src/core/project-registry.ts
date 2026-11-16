import { z } from 'zod';
import type { AssetCache } from './asset-cache';
import { RegistryCorruptError } from './errors';

const savedAsset = z.object({
  url: z.string().min(1),
  /** ETag or Last-Modified of the saved copy, when the server sent one. */
  validator: z.string().nullable(),
  bytes: z.number().int().nonnegative(),
});

const savedProject = z.object({
  projectId: z.string().min(1),
  /** UTC ISO 8601. */
  savedAt: z.string().min(1),
  assets: z.array(savedAsset),
});

export type SavedAsset = z.output<typeof savedAsset>;
export type SavedProject = z.output<typeof savedProject>;

/** Which projects are saved for offline use, and with which assets. */
export interface OfflineProjectRegistry {
  get(projectId: string): Promise<SavedProject | undefined>;
  put(project: SavedProject): Promise<void>;
  remove(projectId: string): Promise<void>;
  list(): Promise<SavedProject[]>;
}

const parseProject = async (projectId: string, response: Response): Promise<SavedProject> => {
  try {
    return savedProject.parse(await response.json());
  } catch (error) {
    throw new RegistryCorruptError(projectId, { cause: error });
  }
};

/**
 * Keeps one JSON record per project in a cache of its own. Cache storage outlives the page,
 * is available to the worker as well, and needs no schema migration.
 */
export const createCacheRegistry = (cache: AssetCache, baseUrl: string): OfflineProjectRegistry => {
  const prefix = new URL('__offline-projects__/', baseUrl).href;
  const key = (projectId: string) => prefix + encodeURIComponent(projectId);
  const get = async (projectId: string) => {
    const response = await cache.match(key(projectId));
    return response && parseProject(projectId, response);
  };
  return {
    get,
    put: (project) =>
      cache.put(
        key(project.projectId),
        new Response(JSON.stringify(savedProject.parse(project)), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    remove: async (projectId) => {
      await cache.delete(key(projectId));
    },
    list: async () => {
      const ids = (await cache.keys())
        .filter(({ url }) => url.startsWith(prefix))
        .map(({ url }) => decodeURIComponent(url.slice(prefix.length)));
      const projects = await Promise.all(ids.map(get));
      return projects.filter((project) => project !== undefined);
    },
  };
};
