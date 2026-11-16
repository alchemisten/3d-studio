import type { Connectivity } from './connectivity';
import { OfflineUnsupportedError, toError } from './errors';
import { revalidateProject } from './revalidate-project';
import { type OfflineStores, removeProject, saveProject } from './save-project';
import type { FetchLike } from './with-timeout';

export type OfflineState =
  /** Offline use is impossible here, e.g. no service worker is registered. */
  | { status: 'unavailable' }
  | { status: 'idle' }
  | { status: 'saving'; done: number; total: number }
  | { status: 'saved'; savedAt: string }
  /** A copy is saved, but the server has a newer one. */
  | { status: 'stale'; savedAt: string }
  | { status: 'error'; error: Error };

export interface OfflineEnvironment extends OfflineStores {
  fetch: FetchLike;
}

export interface OfflineControllerOptions {
  projectId: string;
  /** Absolute URLs of everything the project needs offline. */
  assets: readonly string[];
  /** Opens the stores; rejects with `OfflineUnsupportedError` where offline use is impossible. */
  resolveEnvironment: () => Promise<OfflineEnvironment>;
  connectivity: Connectivity;
  /** Current time as UTC ISO 8601. */
  now: () => string;
}

export interface OfflineController {
  getState: () => OfflineState;
  subscribe: (listener: () => void) => () => void;
  /** Reads the saved state and keeps it current while online. Returns the stop function. */
  start: () => () => void;
  /** Saves or updates the offline copy. Failures end in the `error` state. */
  save: () => Promise<void>;
  /** Deletes the offline copy. Failures end in the `error` state. */
  remove: () => Promise<void>;
}

/** State machine behind the offline action of one project. */
export const createOfflineController = ({
  projectId,
  assets,
  resolveEnvironment,
  connectivity,
  now,
}: OfflineControllerOptions): OfflineController => {
  const listeners = new Set<() => void>();
  let state: OfflineState = { status: 'idle' };
  let environment: Promise<OfflineEnvironment> | undefined;
  let queue: Promise<void> = Promise.resolve();

  const setState = (next: OfflineState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const run = async (work: (env: OfflineEnvironment) => Promise<void>) => {
    try {
      await work(await (environment ??= resolveEnvironment()));
    } catch (error) {
      if (error instanceof OfflineUnsupportedError) return setState({ status: 'unavailable' });
      environment = undefined;
      setState({ status: 'error', error: toError(error) });
    }
  };

  const enqueue = (work: (env: OfflineEnvironment) => Promise<void>) => {
    queue = queue.then(() => run(work));
    return queue;
  };

  const refresh = () =>
    enqueue(async (env) => {
      const project = await env.registry.get(projectId);
      if (!project) return setState({ status: 'idle' });
      const { savedAt } = project;
      if (!connectivity.isOnline()) return setState({ status: 'saved', savedAt });
      const result = await revalidateProject({ projectId, assets, registry: env.registry, fetch: env.fetch });
      setState({ status: result.status === 'stale' ? 'stale' : 'saved', savedAt });
    });

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => {
      void refresh();
      return connectivity.subscribe((isOnline) => {
        if (isOnline) void refresh();
      });
    },
    save: () =>
      enqueue(async (env) => {
        const total = new Set(assets).size;
        setState({ status: 'saving', done: 0, total });
        const project = await saveProject({
          ...env,
          projectId,
          assets,
          now,
          onProgress: ({ done }) => setState({ status: 'saving', done, total }),
        });
        setState({ status: 'saved', savedAt: project.savedAt });
      }),
    remove: () =>
      enqueue(async (env) => {
        await removeProject(env, projectId);
        setState({ status: 'idle' });
      }),
  };
};
