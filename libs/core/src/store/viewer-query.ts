import type { ViewerStore } from './viewer-store';

export interface QuerySetting {
  key: string;
  read: () => string | null;
  restore: (raw: string | null) => void;
}

export interface ViewerQuery {
  read: () => URLSearchParams;
  replace: (params: URLSearchParams) => void;
  subscribe: (onNavigate: () => void) => () => void;
  key?: (featureId: string, key: string) => string | false;
}

export const choiceSetting = (
  key: string,
  choices: readonly string[],
  fallback: string | null,
  read: () => string | null,
  write: (value: string | null) => void,
  omitDefault = false,
): QuerySetting => ({
  key,
  read: () => {
    const current = read();
    return omitDefault && current === fallback ? null : current;
  },
  restore: (raw) => {
    const value = raw !== null && choices.includes(raw) ? raw : fallback;
    if (value !== read()) write(value);
  },
});

export const bindViewerQuery = (
  viewer: ViewerStore,
  contributions: readonly { featureId: string; setting: QuerySetting }[],
  host: ViewerQuery,
) => {
  const settings = new Map<string, QuerySetting>();
  for (const { featureId, setting } of contributions) {
    const key = host.key ? host.key(featureId, setting.key) : setting.key;
    if (key === false) continue;
    if (settings.has(key)) throw new Error('Duplicate viewer query parameter: ' + key);
    settings.set(key, setting);
  }
  const last = new Map<string, string | null>();
  let restoring = false;
  const hydrate = () => {
    restoring = true;
    try {
      const params = host.read();
      settings.forEach((setting, key) => setting.restore(params.get(key)));
      settings.forEach((setting, key) => last.set(key, setting.read()));
    } finally {
      restoring = false;
    }
  };
  hydrate();
  const disconnect = viewer.subscribe(() => {
    if (restoring) return;
    let next: URLSearchParams | undefined;
    settings.forEach((setting, key) => {
      const value = setting.read();
      if (value === last.get(key)) return;
      last.set(key, value);
      next ??= new URLSearchParams(host.read());
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    if (next) host.replace(next);
  });
  const stop = host.subscribe(hydrate);
  return () => {
    disconnect();
    stop();
  };
};
