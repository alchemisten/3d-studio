export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A copy of `record` without `key`. */
export const omitKey = <T extends object, K extends keyof T>(record: T, key: K): Omit<T, K> =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key)) as Omit<T, K>;
