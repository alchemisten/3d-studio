import { useLayoutEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ViewerQuery } from '@schablone/3d-studio-core';

export const useSceneSettings = (): ViewerQuery => {
  const [params, setParams] = useSearchParams();
  const latest = useRef({ params, setParams });
  latest.current = { params, setParams };
  const listeners = useMemo(() => new Set<() => void>(), []);
  useLayoutEffect(() => {
    listeners.forEach((listener) => listener());
  }, [listeners, params]);
  return useMemo(
    () => ({
      key: (featureId, key) => (featureId === 'body-tint' ? 'color' : key),
      read: () => latest.current.params,
      replace: (next) => {
        latest.current.params = next;
        latest.current.setParams(next, { replace: true, preventScrollReset: true });
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    }),
    [listeners],
  );
};
