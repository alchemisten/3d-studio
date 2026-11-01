import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Project, ProjectAdapter } from '@schablone/3d-studio-core';

const AdapterContext = createContext<ProjectAdapter | null>(null);

export const ProjectAdapterProvider = ({ adapter, children }: { adapter: ProjectAdapter; children: ReactNode }) => (
  <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>
);

export const useProjectAdapter = (override?: ProjectAdapter): ProjectAdapter => {
  const adapter = override ?? useContext(AdapterContext);
  if (!adapter) {
    throw new Error('No ProjectAdapter: pass `adapter` or wrap in <ProjectAdapterProvider> / <Studio>.');
  }
  return adapter;
};

export interface Query<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

const useAdapterQuery = <T,>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]): Query<T> => {
  const [state, setState] = useState<Query<T>>({ data: undefined, loading: true, error: undefined });
  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load(controller.signal).then(
      (data) => !controller.signal.aborted && setState({ data, loading: false, error: undefined }),
      (error: unknown) =>
        !controller.signal.aborted &&
        setState({ data: undefined, loading: false, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};

/** All projects from the adapter in context (or the one passed in). */
export const useProjects = (adapter?: ProjectAdapter): Query<Project[]> => {
  const resolved = useProjectAdapter(adapter);
  return useAdapterQuery((signal) => resolved.listProjects({ signal }), [resolved]);
};

/** One project by id; `data` is `undefined` while loading or when it does not exist. */
export const useProject = (id: string, adapter?: ProjectAdapter): Query<Project | undefined> => {
  const resolved = useProjectAdapter(adapter);
  return useAdapterQuery((signal) => resolved.getProject(id, { signal }), [resolved, id]);
};
