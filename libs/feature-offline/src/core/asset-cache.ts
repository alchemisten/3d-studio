/** The part of the Cache API this package uses, keyed by absolute URL. */
export interface AssetCache {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
  delete(url: string): Promise<boolean>;
  keys(): Promise<readonly { url: string }[]>;
}

/** In-memory cache for tests and server rendering. */
export const createMemoryCache = (): AssetCache => {
  const entries = new Map<string, Response>();
  return {
    match: async (url) => entries.get(url)?.clone(),
    put: async (url, response) => {
      entries.set(url, response);
    },
    delete: async (url) => entries.delete(url),
    keys: async () => [...entries.keys()].map((url) => ({ url })),
  };
};
