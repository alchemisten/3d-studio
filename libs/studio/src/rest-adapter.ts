import type { Project, ProjectAdapter } from '@schablone/3d-studio-core';

export interface RestAdapterOptions {
  /** e.g. `https://api.example.com`. No trailing slash needed. */
  baseUrl: string;
  /** Defaults to `/projects`. */
  listPath?: string;
  /** Defaults to `/projects/:id`. */
  detailPath?: (id: string) => string;
  /** Custom fetch, e.g. to add auth. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Maps the server payload to a `Project`. Defaults to identity. */
  mapProject?: (raw: unknown) => Project;
}

/** Adapter for a REST backend: `GET {baseUrl}/projects` and `GET {baseUrl}/projects/:id`. */
export const createRestAdapter = ({
  baseUrl,
  listPath = '/projects',
  detailPath = (id) => `/projects/${encodeURIComponent(id)}`,
  fetch: customFetch,
  mapProject = (raw) => raw as Project,
}: RestAdapterOptions): ProjectAdapter => {
  const root = baseUrl.replace(/\/+$/, '');
  const request = async (path: string, signal?: AbortSignal) => {
    const response = await (customFetch ?? fetch)(`${root}${path}`, { signal, headers: { Accept: 'application/json' } });
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`Request to ${path} failed with ${response.status}`);
    }
    return response.json() as Promise<unknown>;
  };
  return {
    listProjects: async (options) => {
      const data = await request(listPath, options?.signal);
      const list = Array.isArray(data) ? data : ((data as { projects?: unknown[] } | undefined)?.projects ?? []);
      return list.map(mapProject);
    },
    getProject: async (id, options) => {
      const data = await request(detailPath(id), options?.signal);
      return data === undefined ? undefined : mapProject(data);
    },
  };
};
