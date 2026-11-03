import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Project, ProjectAdapter } from '@schablone/3d-studio-core';

const AdapterContext = createContext<ProjectAdapter | null>(null);

export const ProjectAdapterProvider = ({ adapter, children }: { adapter: ProjectAdapter; children: ReactNode }) => (
  <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>
);

export const useProjectAdapter = (override?: ProjectAdapter): ProjectAdapter => {
  const provided = useContext(AdapterContext);
  const adapter = override ?? provided;
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

const useAdapterQuery = <T,>(load: (signal: AbortSignal) => Promise<T>): Query<T> => {
  const [result, setResult] = useState<{ load: typeof load; query: Query<T> }>();
  useEffect(() => {
    const controller = new AbortController();
    const settle = (data: T | undefined, error?: Error) => {
      if (!controller.signal.aborted) setResult({ load, query: { data, loading: false, error } });
    };
    load(controller.signal).then(
      data => settle(data),
      (error: unknown) => settle(undefined, error instanceof Error ? error : new Error(String(error))),
    );
    return () => controller.abort();
  }, [load]);
  return result?.load === load ? result.query : { data: undefined, loading: true, error: undefined };
};

/** All projects from the adapter in context (or the one passed in). */
export const useProjects = (adapter?: ProjectAdapter): Query<Project[]> => {
  const resolved = useProjectAdapter(adapter);
  return useAdapterQuery(useCallback((signal: AbortSignal) => resolved.listProjects({ signal }), [resolved]));
};

/** One project by id; `data` is `undefined` while loading or when it does not exist. */
export const useProject = (id: string, adapter?: ProjectAdapter): Query<Project | undefined> => {
  const resolved = useProjectAdapter(adapter);
  return useAdapterQuery(useCallback((signal: AbortSignal) => resolved.getProject(id, { signal }), [resolved, id]));
};
