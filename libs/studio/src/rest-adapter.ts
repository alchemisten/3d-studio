import { z } from 'zod';
import type { Project, ProjectAdapter } from '@schablone/3d-studio-core';

const coordinate = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const projectSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    source: z.string().min(1),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    tags: z.array(z.string()).optional(),
    openingCamera: z.object({ position: coordinate, target: coordinate }).optional(),
    featureConfig: z.record(z.unknown()).optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough();
const listSchema = z.union([
  z.array(z.unknown()),
  z.object({ projects: z.array(z.unknown()) }).transform((value) => value.projects),
]);

export interface RestAdapterOptions {
  /** e.g. `https://api.example.com`. No trailing slash needed. */
  baseUrl: string;
  /** Defaults to `/projects`. */
  listPath?: string;
  /** Defaults to `/projects/:id`. */
  detailPath?: (id: string) => string;
  /** Custom fetch, e.g. to add auth. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Extracts records from a custom list envelope. */
  mapList?: (payload: unknown) => unknown[];
  /** Converts a record to the public project shape before parsing. */
  mapProject?: (raw: unknown) => Project;
}

/** Adapter for a REST backend: `GET {baseUrl}/projects` and `GET {baseUrl}/projects/:id`. */
export const createRestAdapter = ({
  baseUrl,
  listPath = '/projects',
  detailPath = (id) => `/projects/${encodeURIComponent(id)}`,
  fetch: customFetch,
  mapList,
  mapProject,
}: RestAdapterOptions): ProjectAdapter => {
  const root = baseUrl.replace(/\/+$/, '');
  const parseProject = (raw: unknown): Project => projectSchema.parse(mapProject ? mapProject(raw) : raw);
  const request = async (path: string, signal?: AbortSignal, allowMissing = false) => {
    const timeout = AbortSignal.timeout(30000);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await (customFetch ?? fetch)(`${root}${path}`, {
      signal: requestSignal,
      headers: { Accept: 'application/json' },
    });
    if (allowMissing && response.status === 404) {
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
      const list = mapList ? z.array(z.unknown()).parse(mapList(data)) : listSchema.parse(data);
      return list.map(parseProject);
    },
    getProject: async (id, options) => {
      const data = await request(detailPath(id), options?.signal, true);
      return data === undefined ? undefined : parseProject(data);
    },
  };
};
